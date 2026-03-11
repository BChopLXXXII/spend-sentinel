import { NextResponse } from 'next/server'
import { maskKey, persistStore, spendStore, type StoredApiKey } from '@/lib/spend-store'

function serializeKey(key: StoredApiKey) {
  return {
    id: key.id,
    name: key.name,
    key: maskKey(key.key),
    budget: key.budget,
    spent: key.spent,
    remaining: Math.max(0, key.budget - key.spent),
    enabled: key.enabled,
    createdAt: key.createdAt,
  }
}

export async function GET() {
  return NextResponse.json({
    keys: Array.from(spendStore.apiKeys.values()).map(serializeKey),
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string
      key?: string
      budget?: number
    }

    const name = body.name?.trim()
    const rawKey = body.key?.trim()
    const budget = Number(body.budget ?? 50)

    if (!name || !rawKey) {
      return NextResponse.json({ error: 'Name and key are required' }, { status: 400 })
    }

    if (!Number.isFinite(budget) || budget <= 0) {
      return NextResponse.json({ error: 'Budget must be a positive number' }, { status: 400 })
    }

    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    if (!id) {
      return NextResponse.json({ error: 'Invalid key name' }, { status: 400 })
    }

    if (spendStore.apiKeys.has(id)) {
      return NextResponse.json({ error: 'Key with this name already exists' }, { status: 409 })
    }

    spendStore.apiKeys.set(id, {
      id,
      name,
      key: rawKey,
      budget,
      spent: 0,
      enabled: true,
      createdAt: Date.now(),
      lastAlertPercent: undefined,
    })
    persistStore()

    const created = spendStore.apiKeys.get(id)
    return NextResponse.json({ success: true, key: created ? serializeKey(created) : null })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string
      enabled?: boolean
      budget?: number
    }

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const existing = spendStore.apiKeys.get(body.id)

    if (!existing) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 })
    }

    if (typeof body.enabled === 'boolean') {
      existing.enabled = body.enabled
    }

    if (body.budget !== undefined) {
      const budget = Number(body.budget)
      if (!Number.isFinite(budget) || budget <= 0) {
        return NextResponse.json({ error: 'Budget must be a positive number' }, { status: 400 })
      }
      existing.budget = budget
    }

    spendStore.apiKeys.set(body.id, existing)
    persistStore()

    return NextResponse.json({ success: true, key: serializeKey(existing) })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id || !spendStore.apiKeys.has(id)) {
    return NextResponse.json({ error: 'Key not found' }, { status: 404 })
  }

  spendStore.apiKeys.delete(id)
  persistStore()
  return NextResponse.json({ success: true })
}
