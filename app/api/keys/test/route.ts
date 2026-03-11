import { Buffer } from 'node:buffer'
import { NextResponse } from 'next/server'
import { spendStore } from '@/lib/spend-store'

type TestRequestBody = {
  id?: string
  model?: string
  message?: string
  maxTokens?: number
}

const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022'

function parseMaxTokens(value: unknown, fallback: number) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(Math.floor(n), 200_000)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TestRequestBody

    const id = typeof body.id === 'string' ? body.id.trim() : ''

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const trackedKey = spendStore.apiKeys.get(id)

    if (!trackedKey) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 })
    }

    const proxyUrl = new URL('/api/proxy', request.url)
    const message =
      typeof body.message === 'string' && body.message.trim()
        ? body.message.trim().slice(0, 1000)
        : 'UI smoke test request'

    const proxyPayload = {
      model: typeof body.model === 'string' && body.model.trim() ? body.model.trim() : DEFAULT_MODEL,
      messages: [{ role: 'user', content: message }],
      max_tokens: parseMaxTokens(body.maxTokens, 128),
    }

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-api-key': trackedKey.key,
    }

    const adminUser = process.env.SPEND_SENTINEL_ADMIN_USER
    const adminPass = process.env.SPEND_SENTINEL_ADMIN_PASS

    if (adminUser && adminPass) {
      headers.authorization = `Basic ${Buffer.from(`${adminUser}:${adminPass}`).toString('base64')}`
    }

    const proxyRes = await fetch(proxyUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(proxyPayload),
      cache: 'no-store',
    })

    const proxyBody = (await proxyRes.json().catch(() => ({ error: 'Invalid proxy response' }))) as object

    return NextResponse.json(proxyBody, { status: proxyRes.status })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
