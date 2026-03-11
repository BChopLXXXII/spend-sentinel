'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, DollarSign, Key, TrendingUp } from 'lucide-react'

type KeySummary = {
  id: string
  name: string
  budget: number
  spent: number
  remaining: number
  enabled: boolean
}

type ActivityItem = {
  timestamp: number
  keyName: string
  totalTokens: number
  cost: number
}

type ProxyStatsResponse = {
  keys: KeySummary[]
  totals: {
    today: number
    week: number
    allTime: number
  }
  recent: ActivityItem[]
}

function StatCard({
  title,
  value,
  icon: Icon,
  change,
}: {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  change?: string
}) {
  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change ? <p className="text-xs text-muted-foreground mt-1">{change}</p> : null}
        </div>
        <div className="p-3 bg-primary/10 rounded-lg">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  )
}

function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  const percent = budget <= 0 ? 0 : Math.min((spent / budget) * 100, 100)
  const isWarning = percent > 80
  const isDanger = percent > 95

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>
          ${spent.toFixed(2)} / ${budget.toFixed(2)}
        </span>
        <span className={isDanger ? 'text-destructive' : isWarning ? 'text-yellow-500' : 'text-muted-foreground'}>
          {percent.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isDanger ? 'bg-destructive' : isWarning ? 'bg-yellow-500' : 'bg-primary'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function formatTimeAgo(timestamp: number) {
  const diffMs = Date.now() - timestamp
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function Dashboard() {
  const [data, setData] = useState<ProxyStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/proxy', { cache: 'no-store' })
        if (!res.ok) {
          throw new Error('Failed to load dashboard data')
        }
        const json = (await res.json()) as ProxyStatsResponse
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, 8000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const activeKeys = useMemo(() => data?.keys.filter((k) => k.enabled).length ?? 0, [data])

  if (loading && !data) {
    return <p className="text-muted-foreground">Loading spend dashboard…</p>
  }

  if (error && !data) {
    return <p className="text-destructive">{error}</p>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Live token spend and budget enforcement overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Today's Spend" value={`$${(data?.totals.today ?? 0).toFixed(2)}`} icon={DollarSign} />
        <StatCard title="This Week" value={`$${(data?.totals.week ?? 0).toFixed(2)}`} icon={TrendingUp} />
        <StatCard title="All Time" value={`$${(data?.totals.allTime ?? 0).toFixed(2)}`} icon={AlertTriangle} />
        <StatCard title="Active Keys" value={String(activeKeys)} icon={Key} change={`${data?.keys.length ?? 0} total`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Budget Overview</h2>
          </div>
          <div className="space-y-4">
            {(data?.keys ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No keys yet. Add one on the API Keys page.</p>
            ) : (
              data?.keys.map((key) => (
                <div key={key.id} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center mb-2 gap-3">
                    <span className="font-medium flex items-center gap-2">
                      {key.name}
                      {!key.enabled ? <span className="text-xs text-destructive">disabled</span> : null}
                    </span>
                    <span className="text-sm text-muted-foreground">${key.remaining.toFixed(2)} remaining</span>
                  </div>
                  <BudgetBar spent={key.spent} budget={key.budget} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {(data?.recent ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No usage yet. Send a request through `/api/proxy`.</p>
            ) : (
              data?.recent.map((activity, i) => (
                <div key={`${activity.timestamp}-${i}`} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <div>
                      <p className="text-sm font-medium">{activity.keyName}</p>
                      <p className="text-xs text-muted-foreground">{activity.totalTokens.toLocaleString()} tokens</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${activity.cost.toFixed(4)}</p>
                    <p className="text-xs text-muted-foreground">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-muted/30 rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Setup</h2>
        <div className="bg-card p-4 rounded-lg border">
          <p className="text-sm mb-2">Point your AI tool through SpendSentinel:</p>
          <code className="block bg-muted p-3 rounded text-sm overflow-x-auto">
            ANTHROPIC_BASE_URL=http://localhost:3000/api/proxy
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            Add your key in the API Keys page first. Unknown keys are rejected by default.
          </p>
        </div>
      </div>
    </div>
  )
}
