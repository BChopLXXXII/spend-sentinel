import { NextResponse } from 'next/server'
import { persistStore, sanitizeSettings, spendStore, type AlertSettings } from '@/lib/spend-store'

export async function GET() {
  return NextResponse.json({ settings: spendStore.settings })
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<AlertSettings>

    spendStore.settings = sanitizeSettings(body)
    persistStore()

    return NextResponse.json({ success: true, settings: spendStore.settings })
  } catch {
    return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 })
  }
}
