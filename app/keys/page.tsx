'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

type ApiKeyItem = {
  id: string
  name: string
  key: string
  budget: number
  spent: number
  remaining: number
  enabled: boolean
  createdAt: number
}

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newKey, setNewKey] = useState({ name: '', key: '', budget: 50 })

  async function loadKeys() {
    try {
      const res = await fetch('/api/keys', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load keys')
      const data = (await res.json()) as { keys: ApiKeyItem[] }
      setKeys(data.keys)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKeys()
  }, [])

  async function addKey() {
    if (!newKey.name.trim() || !newKey.key.trim()) return

    setSaving(true)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(newKey),
      })

      const payload = (await res.json()) as { error?: string }

      if (!res.ok) {
        throw new Error(payload.error ?? 'Failed to add key')
      }

      setNewKey({ name: '', key: '', budget: 50 })
      setShowAdd(false)
      await loadKeys()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add key')
    } finally {
      setSaving(false)
    }
  }

  async function toggleKey(id: string, enabled: boolean) {
    try {
      const res = await fetch('/api/keys', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, enabled }),
      })

      if (!res.ok) throw new Error('Failed to update key')
      await loadKeys()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update key')
    }
  }

  async function updateBudget(id: string, budget: number) {
    if (!Number.isFinite(budget) || budget <= 0) return

    try {
      const res = await fetch('/api/keys', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, budget }),
      })

      if (!res.ok) throw new Error('Failed to update budget')
      await loadKeys()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update budget')
    }
  }

  async function deleteKey(id: string) {
    try {
      const res = await fetch(`/api/keys?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete key')
      await loadKeys()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete key')
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground mt-1">Manage tracked keys, budgets, and enforcement state</p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Add Key
        </button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {showAdd ? (
        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Add New API Key</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={newKey.name}
                onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                placeholder="e.g., claude-code-main"
                className="w-full px-3 py-2 border rounded-lg bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">API Key</label>
              <input
                type="password"
                value={newKey.key}
                onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                placeholder="sk-ant-..."
                className="w-full px-3 py-2 border rounded-lg bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Budget ($)</label>
              <input
                type="number"
                min={1}
                value={newKey.budget}
                onChange={(e) => setNewKey({ ...newKey, budget: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg bg-background"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={addKey}
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? 'Adding…' : 'Add Key'}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg hover:bg-muted">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {loading ? <p className="text-muted-foreground">Loading keys…</p> : null}

      <div className="space-y-4">
        {keys.map((key) => {
          const percentUsed = key.budget > 0 ? Math.min((key.spent / key.budget) * 100, 100) : 0

          return (
            <div key={key.id} className="bg-card rounded-lg border p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{key.name}</h3>
                    <button
                      onClick={() => toggleKey(key.id, !key.enabled)}
                      className={`w-12 h-6 rounded-full transition-colors ${key.enabled ? 'bg-primary' : 'bg-muted'}`}
                      aria-label={key.enabled ? 'Disable key' : 'Enable key'}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform ${key.enabled ? 'translate-x-6' : 'translate-x-0.5'}`}
                      />
                    </button>
                    {!key.enabled ? <span className="text-xs text-destructive">disabled</span> : null}
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">{key.key}</p>
                </div>

                <button onClick={() => deleteKey(key.id)} className="p-2 hover:bg-muted rounded-lg text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <input
                    type="number"
                    min={1}
                    defaultValue={key.budget}
                    onBlur={(e) => {
                      const nextBudget = Number(e.target.value)
                      if (Number.isFinite(nextBudget) && nextBudget > 0 && nextBudget !== key.budget) {
                        void updateBudget(key.id, nextBudget)
                      }
                    }}
                    className="mt-1 w-full px-2 py-1 border rounded bg-background"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Spent</p>
                  <p className="mt-1 font-semibold">${key.spent.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="mt-1 font-semibold">${key.remaining.toFixed(4)}</p>
                </div>
              </div>

              <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${percentUsed > 95 ? 'bg-destructive' : percentUsed > 80 ? 'bg-yellow-500' : 'bg-primary'}`}
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {!loading && keys.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-card">
          <p>No API keys added yet.</p>
          <p className="text-sm mt-1">Add your first key to enforce spend limits.</p>
        </div>
      ) : null}
    </div>
  )
}
