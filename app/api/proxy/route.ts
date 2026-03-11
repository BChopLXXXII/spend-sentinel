import { NextResponse } from 'next/server'
import { sendWebhookAlert } from '@/lib/alerts'
import { estimateInputTokens, findKeyByRawKey, persistStore, spendStore, type StoredApiKey } from '@/lib/spend-store'

const PRICING = {
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-3-opus-20240229': { input: 15, output: 75 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
} as const

const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022'

function costFor(model: string, inputTokens: number, outputTokens: number) {
  const pricing = PRICING[model as keyof typeof PRICING] ?? PRICING[DEFAULT_MODEL]
  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  return inputCost + outputCost
}

function addUsageLog(args: {
  keyId: string
  keyName: string
  model: string
  inputTokens: number
  outputTokens: number
  cost: number
}) {
  spendStore.usageLogs.push({
    timestamp: Date.now(),
    keyId: args.keyId,
    keyName: args.keyName,
    model: args.model,
    inputTokens: args.inputTokens,
    outputTokens: args.outputTokens,
    totalTokens: args.inputTokens + args.outputTokens,
    cost: args.cost,
  })
}

function parseMaxTokens(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 1024
  return Math.floor(n)
}

function utilizationPercent(key: StoredApiKey, nextCost = 0) {
  if (key.budget <= 0) return 0
  return ((key.spent + nextCost) / key.budget) * 100
}

async function sendThresholdAlertIfNeeded(key: StoredApiKey) {
  const { warningThreshold } = spendStore.settings
  const nowUtilization = utilizationPercent(key)

  if (nowUtilization < warningThreshold) return

  if ((key.lastAlertPercent ?? 0) >= warningThreshold) return

  const title = `Budget warning: ${key.name}`
  const message = `${nowUtilization.toFixed(1)}% used ($${key.spent.toFixed(4)} / $${key.budget.toFixed(2)}).`

  await sendWebhookAlert({ settings: spendStore.settings, title, message })
  key.lastAlertPercent = warningThreshold
  persistStore()
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>

    if (typeof body.api_key === 'string' && body.api_key.trim()) {
      return NextResponse.json(
        { error: 'Pass API key via x-api-key header only. Body api_key is not allowed.' },
        { status: 400 },
      )
    }

    const rawKey = request.headers.get('x-api-key')

    if (!rawKey) {
      return NextResponse.json({ error: 'API key required in x-api-key header.' }, { status: 401 })
    }

    const found = findKeyByRawKey(rawKey)

    if (!found) {
      return NextResponse.json(
        { error: 'Unregistered key. Add this key in /keys before using the proxy.' },
        { status: 403 },
      )
    }

    const [keyId, trackedKey] = found

    if (!trackedKey.enabled) {
      return NextResponse.json({ error: 'This key is disabled.' }, { status: 403 })
    }

    const model = typeof body.model === 'string' ? body.model : DEFAULT_MODEL
    const inputTokensEstimate = estimateInputTokens(body.messages)
    const outputTokensEstimate = parseMaxTokens(body.max_tokens)
    const estimatedCost = costFor(model, inputTokensEstimate, outputTokensEstimate)

    const projectedUtilization = utilizationPercent(trackedKey, estimatedCost)

    if (spendStore.settings.autoCutoff && trackedKey.spent + estimatedCost > trackedKey.budget) {
      return NextResponse.json(
        {
          error: 'Budget exceeded. Increase budget or use a different key.',
          projectedCost: estimatedCost,
          spent: trackedKey.spent,
          budget: trackedKey.budget,
          autoCutoff: true,
        },
        { status: 402 },
      )
    }

    const demoMode = process.env.SPEND_SENTINEL_DEMO_MODE !== 'false'

    if (demoMode) {
      trackedKey.spent += estimatedCost
      spendStore.apiKeys.set(keyId, trackedKey)

      addUsageLog({
        keyId,
        keyName: trackedKey.name,
        model,
        inputTokens: inputTokensEstimate,
        outputTokens: outputTokensEstimate,
        cost: estimatedCost,
      })
      persistStore()

      await sendThresholdAlertIfNeeded(trackedKey)

      return NextResponse.json({
        id: `msg-${Date.now()}`,
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Demo mode response from SpendSentinel proxy. Set SPEND_SENTINEL_DEMO_MODE=false to forward to Anthropic.',
          },
        ],
        model,
        usage: {
          input_tokens: inputTokensEstimate,
          output_tokens: outputTokensEstimate,
        },
        spend: estimatedCost,
        projectedUtilization,
        warningThreshold: spendStore.settings.warningThreshold,
        demoMode: true,
      })
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': rawKey,
      },
      body: JSON.stringify({
        ...body,
        api_key: undefined,
      }),
    })

    const responseBody = (await anthropicRes.json()) as Record<string, unknown>

    if (!anthropicRes.ok) {
      return NextResponse.json(responseBody, { status: anthropicRes.status })
    }

    const usage = (responseBody.usage ?? {}) as Record<string, unknown>
    const inputTokens = Number(usage.input_tokens ?? inputTokensEstimate)
    const outputTokens = Number(usage.output_tokens ?? outputTokensEstimate)
    const actualCost = costFor(model, inputTokens, outputTokens)

    if (spendStore.settings.autoCutoff && trackedKey.spent + actualCost > trackedKey.budget) {
      return NextResponse.json(
        {
          error: 'Request completed but would exceed budget. Increase budget before retrying.',
          projectedCost: actualCost,
          spent: trackedKey.spent,
          budget: trackedKey.budget,
          autoCutoff: true,
        },
        { status: 402 },
      )
    }

    trackedKey.spent += actualCost
    spendStore.apiKeys.set(keyId, trackedKey)

    addUsageLog({
      keyId,
      keyName: trackedKey.name,
      model,
      inputTokens,
      outputTokens,
      cost: actualCost,
    })
    persistStore()

    await sendThresholdAlertIfNeeded(trackedKey)

    return NextResponse.json({
      ...responseBody,
      spend: actualCost,
      projectedUtilization: utilizationPercent(trackedKey),
      warningThreshold: spendStore.settings.warningThreshold,
      demoMode: false,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  const totals = spendStore.usageLogs.reduce(
    (acc, log) => {
      if (now - log.timestamp < dayMs) acc.today += log.cost
      if (now - log.timestamp < 7 * dayMs) acc.week += log.cost
      acc.allTime += log.cost
      return acc
    },
    { today: 0, week: 0, allTime: 0 },
  )

  const keys = Array.from(spendStore.apiKeys.values()).map((k) => ({
    id: k.id,
    name: k.name,
    budget: k.budget,
    spent: k.spent,
    remaining: Math.max(0, k.budget - k.spent),
    enabled: k.enabled,
  }))

  return NextResponse.json({
    keys,
    totals,
    recent: spendStore.usageLogs.slice(-15).reverse(),
    settings: spendStore.settings,
  })
}
