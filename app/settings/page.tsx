'use client'

import { useEffect, useState } from 'react'
import { Save, Shield, TestTube, Webhook } from 'lucide-react'

type SettingsState = {
  webhookUrl: string
  webhookType: 'discord' | 'slack'
  warningThreshold: number
  autoCutoff: boolean
  cutoffConfirm: boolean
}

const DEFAULT_SETTINGS: SettingsState = {
  webhookUrl: '',
  webhookType: 'discord',
  warningThreshold: 80,
  autoCutoff: true,
  cutoffConfirm: true,
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load settings')
        const data = (await res.json()) as { settings: SettingsState }
        if (!cancelled) setSettings(data.settings)
      } catch {
        if (!cancelled) setTestResult({ success: false, message: 'Could not load settings.' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSettings()

    return () => {
      cancelled = true
    }
  }, [])

  const saveSettings = async () => {
    setSaving(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(settings),
      })

      const payload = (await res.json()) as { settings?: SettingsState; error?: string }

      if (!res.ok) {
        throw new Error(payload.error ?? 'Failed to save settings')
      }

      if (payload.settings) setSettings(payload.settings)

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save settings',
      })
    } finally {
      setSaving(false)
    }
  }

  const testWebhook = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(settings),
      })

      const payload = (await res.json()) as { success?: boolean; error?: string }

      if (!res.ok || !payload.success) {
        throw new Error(payload.error ?? 'Webhook test failed')
      }

      setTestResult({ success: true, message: 'Webhook test sent. Check your channel.' })
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Webhook test failed',
      })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading settings…</p>
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure alerts and budget enforcement</p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Webhook className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Alert Webhooks</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Webhook URL</label>
            <input
              type="url"
              value={settings.webhookUrl}
              onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full px-3 py-2 border rounded-lg bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">Supports Discord and Slack incoming webhooks</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Webhook Type</label>
            <select
              value={settings.webhookType}
              onChange={(e) => setSettings({ ...settings, webhookType: e.target.value as 'discord' | 'slack' })}
              className="w-full px-3 py-2 border rounded-lg bg-background"
            >
              <option value="discord">Discord</option>
              <option value="slack">Slack</option>
            </select>
          </div>

          <button
            onClick={testWebhook}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50"
          >
            <TestTube className="w-4 h-4" />
            {testing ? 'Testing…' : 'Test Webhook'}
          </button>

          {testResult ? (
            <div
              className={`p-3 rounded-lg ${testResult.success ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}
            >
              {testResult.message}
            </div>
          ) : null}
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Budget Controls</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Warning Threshold: {settings.warningThreshold}%</label>
            <input
              type="range"
              min="50"
              max="100"
              value={settings.warningThreshold}
              onChange={(e) => setSettings({ ...settings, warningThreshold: Number(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Send a webhook alert when this percent of budget is crossed.
            </p>
          </div>

          <div className="flex items-center justify-between py-3 border-t">
            <div>
              <p className="font-medium">Auto-Cutoff</p>
              <p className="text-sm text-muted-foreground">Block requests when budget is exceeded</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, autoCutoff: !settings.autoCutoff })}
              className={`w-12 h-6 rounded-full transition-colors ${settings.autoCutoff ? 'bg-primary' : 'bg-muted'}`}
              aria-label={settings.autoCutoff ? 'Disable auto-cutoff' : 'Enable auto-cutoff'}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.autoCutoff ? 'translate-x-6' : 'translate-x-0.5'}`}
              />
            </button>
          </div>

          {settings.autoCutoff ? (
            <div className="flex items-center justify-between py-3 border-t">
              <div>
                <p className="font-medium">Require Confirmation</p>
                <p className="text-sm text-muted-foreground">Flag that manual confirm flow is expected in clients</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, cutoffConfirm: !settings.cutoffConfirm })}
                className={`w-12 h-6 rounded-full transition-colors ${settings.cutoffConfirm ? 'bg-primary' : 'bg-muted'}`}
                aria-label={settings.cutoffConfirm ? 'Disable cutoff confirmation' : 'Enable cutoff confirmation'}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.cutoffConfirm ? 'translate-x-6' : 'translate-x-0.5'}`}
                />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <button
        onClick={saveSettings}
        disabled={saving}
        className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}
