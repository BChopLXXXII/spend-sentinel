import type { AlertSettings } from '@/lib/spend-store'

export async function sendWebhookAlert(args: {
  settings: AlertSettings
  title: string
  message: string
}) {
  const url = args.settings.webhookUrl.trim()
  if (!url) return { sent: false, reason: 'missing-webhook' as const }

  const payload =
    args.settings.webhookType === 'slack'
      ? { text: `*${args.title}*\n${args.message}` }
      : { content: `**${args.title}**\n${args.message}` }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    return {
      sent: false,
      reason: 'webhook-error' as const,
      status: response.status,
    }
  }

  return { sent: true as const }
}
