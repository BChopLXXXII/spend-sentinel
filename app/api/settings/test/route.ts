import { NextResponse } from 'next/server'
import { sendWebhookAlert } from '@/lib/alerts'
import { sanitizeSettings, spendStore, type AlertSettings } from '@/lib/spend-store'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<AlertSettings>

    const settings = sanitizeSettings({
      ...spendStore.settings,
      ...body,
    })

    if (!settings.webhookUrl) {
      return NextResponse.json({ error: 'Webhook URL is required' }, { status: 400 })
    }

    const result = await sendWebhookAlert({
      settings,
      title: 'SpendSentinel webhook test',
      message: 'If you can read this, budget alerts are wired correctly.',
    })

    if (!result.sent) {
      return NextResponse.json(
        {
          success: false,
          error: 'Webhook test failed',
          details: result,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to run webhook test' }, { status: 500 })
  }
}
