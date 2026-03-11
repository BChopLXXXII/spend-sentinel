import fs from 'node:fs'
import path from 'node:path'

export type StoredApiKey = {
  id: string
  name: string
  key: string
  budget: number
  spent: number
  enabled: boolean
  createdAt: number
  lastAlertPercent?: number
}

export type UsageLog = {
  timestamp: number
  keyId: string
  keyName: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
}

export type AlertSettings = {
  webhookUrl: string
  webhookType: 'discord' | 'slack'
  warningThreshold: number
  autoCutoff: boolean
  cutoffConfirm: boolean
  updatedAt: number
}

type SpendStore = {
  apiKeys: Map<string, StoredApiKey>
  usageLogs: UsageLog[]
  settings: AlertSettings
}

type PersistedStore = {
  apiKeys: StoredApiKey[]
  usageLogs: UsageLog[]
  settings: AlertSettings
}

const STORE_FILE = process.env.SPEND_SENTINEL_DATA_FILE
  ? path.resolve(process.env.SPEND_SENTINEL_DATA_FILE)
  : path.join(process.cwd(), 'data', 'spend-store.json')

const globalForSpend = globalThis as unknown as {
  __spendSentinelStore?: SpendStore
}

function defaultSettings(): AlertSettings {
  return {
    webhookUrl: '',
    webhookType: 'discord',
    warningThreshold: 80,
    autoCutoff: true,
    cutoffConfirm: true,
    updatedAt: Date.now(),
  }
}

function createEmptyStore(): SpendStore {
  return {
    apiKeys: new Map<string, StoredApiKey>(),
    usageLogs: [],
    settings: defaultSettings(),
  }
}

function maybeSeedDemoKey(store: SpendStore) {
  const shouldSeed =
    process.env.NODE_ENV !== 'production' &&
    process.env.SPEND_SENTINEL_SEED_DEMO_KEY !== 'false' &&
    process.env.SPEND_SENTINEL_DEMO_MODE !== 'false'

  if (!shouldSeed || store.apiKeys.size > 0) return

  store.apiKeys.set('demo', {
    id: 'demo',
    name: 'demo',
    key: 'sk-ant-demo-key',
    budget: 100,
    spent: 0,
    enabled: true,
    createdAt: Date.now(),
    lastAlertPercent: undefined,
  })
}

function hydrateStore(raw: PersistedStore): SpendStore {
  const apiKeys = new Map<string, StoredApiKey>()

  for (const key of raw.apiKeys ?? []) {
    if (!key?.id || !key?.name || !key?.key) continue
    apiKeys.set(key.id, {
      id: key.id,
      name: key.name,
      key: key.key,
      budget: Number.isFinite(Number(key.budget)) ? Number(key.budget) : 0,
      spent: Number.isFinite(Number(key.spent)) ? Number(key.spent) : 0,
      enabled: Boolean(key.enabled),
      createdAt: Number.isFinite(Number(key.createdAt)) ? Number(key.createdAt) : Date.now(),
      lastAlertPercent:
        key.lastAlertPercent === undefined || Number.isFinite(Number(key.lastAlertPercent))
          ? key.lastAlertPercent
          : undefined,
    })
  }

  const usageLogs = Array.isArray(raw.usageLogs)
    ? raw.usageLogs.filter((log) => log && typeof log === 'object')
    : []

  return {
    apiKeys,
    usageLogs,
    settings: sanitizeSettingsWithCurrent(defaultSettings(), raw.settings ?? defaultSettings()),
  }
}

function loadStore(): SpendStore {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      const empty = createEmptyStore()
      maybeSeedDemoKey(empty)
      return empty
    }

    const rawText = fs.readFileSync(STORE_FILE, 'utf8')
    const raw = JSON.parse(rawText) as PersistedStore
    const store = hydrateStore(raw)
    maybeSeedDemoKey(store)
    return store
  } catch {
    const fallback = createEmptyStore()
    maybeSeedDemoKey(fallback)
    return fallback
  }
}

export function persistStore() {
  const payload: PersistedStore = {
    apiKeys: Array.from(spendStore.apiKeys.values()),
    usageLogs: spendStore.usageLogs,
    settings: spendStore.settings,
  }

  const dir = path.dirname(STORE_FILE)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(STORE_FILE, JSON.stringify(payload, null, 2), 'utf8')
}

export const spendStore = globalForSpend.__spendSentinelStore ?? loadStore()

if (!globalForSpend.__spendSentinelStore) {
  globalForSpend.__spendSentinelStore = spendStore
}

export function maskKey(raw: string): string {
  if (!raw) return ''
  if (raw.length <= 10) return `${raw.slice(0, 3)}***`
  return `${raw.slice(0, 10)}***${raw.slice(-4)}`
}

function sanitizeSettingsWithCurrent(current: AlertSettings, input: Partial<AlertSettings>): AlertSettings {
  const warningThreshold = Number(input.warningThreshold ?? current.warningThreshold)
  const safeThreshold = Number.isFinite(warningThreshold)
    ? Math.max(50, Math.min(100, Math.round(warningThreshold)))
    : current.warningThreshold

  const webhookType = input.webhookType === 'slack' ? 'slack' : 'discord'

  const rawWebhook = typeof input.webhookUrl === 'string' ? input.webhookUrl.trim() : current.webhookUrl
  const safeWebhook =
    !rawWebhook || /^https:\/\//i.test(rawWebhook)
      ? rawWebhook.slice(0, 2048)
      : current.webhookUrl

  return {
    webhookUrl: safeWebhook,
    webhookType,
    warningThreshold: safeThreshold,
    autoCutoff: typeof input.autoCutoff === 'boolean' ? input.autoCutoff : current.autoCutoff,
    cutoffConfirm: typeof input.cutoffConfirm === 'boolean' ? input.cutoffConfirm : current.cutoffConfirm,
    updatedAt: Date.now(),
  }
}

export function sanitizeSettings(input: Partial<AlertSettings>): AlertSettings {
  return sanitizeSettingsWithCurrent(spendStore.settings ?? defaultSettings(), input)
}

export function findKeyByRawKey(raw: string): [string, StoredApiKey] | undefined {
  return Array.from(spendStore.apiKeys.entries()).find(([, value]) => value.key === raw)
}

export function estimateInputTokens(messages: unknown): number {
  if (!Array.isArray(messages) || messages.length === 0) return 0

  let chars = 0

  for (const message of messages) {
    if (!message || typeof message !== 'object') continue

    const content = (message as { content?: unknown }).content

    if (typeof content === 'string') {
      chars += content.length
      continue
    }

    if (Array.isArray(content)) {
      for (const part of content) {
        if (!part || typeof part !== 'object') continue
        const text = (part as { text?: unknown }).text
        if (typeof text === 'string') chars += text.length
      }
    }
  }

  return Math.max(1, Math.ceil(chars / 4))
}
