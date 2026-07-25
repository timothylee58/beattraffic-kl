import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, AlertTriangle, BarChart3, Bus, CheckCircle2, Clock,
  Eye, Plus, Settings, Shield, Ticket, Train, Trash2, Users, Zap,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { useAuth } from '../hooks/useAuth'
import { blink } from '../lib/blink'
import { fetchIncidents } from '../lib/dosmApi'
import { predictLineDelays, LINE_NAMES, LINE_COLORS } from '../lib/delayPrediction'
import type { LineDelayPrediction } from '../lib/delayPrediction'
import type { TransitIncident } from '../lib/transitData'

interface TicketRow { id: string; from_station_id: string; to_station_id: string; fare: number; status: string; created_at: string }

const MOCK_SLACK_LOGS = [
  { ts: '08:32', channel: '#transit-alerts', msg: 'LRT Kelana Jaya: Signal delay near Pasar Seni (~6 min)' },
  { ts: '07:15', channel: '#transit-alerts', msg: 'KTM Komuter: High crowd at KL Sentral (peak hour)' },
  { ts: '06:50', channel: '#ops-team', msg: 'System health check passed. All feeds nominal.' },
  { ts: '06:00', channel: '#transit-alerts', msg: 'Morning crowd prediction published to dashboard.' },
]

const MOCK_SUSPICIOUS = [
  { id: 'T-SUSP001', reason: 'QR scanned 4× in 2 min at different gates', station: 'Masjid Jamek', risk: 'high' },
  { id: 'T-SUSP002', reason: 'Ticket date mismatch', station: 'KL Sentral', risk: 'medium' },
  { id: 'T-SUSP003', reason: 'User account flagged for chargebacks', station: 'Bukit Bintang', risk: 'low' },
]

export default function AdminDashboard() {
  const { user, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [incidents, setIncidents] = useState<TransitIncident[]>([])
  const [delays, setDelays] = useState<LineDelayPrediction[]>([])
  const [lineStatus, setLineStatus] = useState<Array<{ line: string; status: string; waitingTime: number }>>([])
  const [newIncidentMsg, setNewIncidentMsg] = useState('')

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate('/')
  }, [loading, isAuthenticated, navigate])

  const loadData = useCallback(async () => {
    const [{ data }, incidentData] = await Promise.all([
      blink.db.tickets.list({ orderBy: { created_at: 'desc' } }),
      fetchIncidents(),
    ])
    setTickets((data as TicketRow[]) || [])
    setIncidents(incidentData)
    setDelays(predictLineDelays(incidentData))

    try {
      const res = await fetch('https://lkkep88b--get-train-status.functions.blink.new')
      if (res.ok) setLineStatus(await res.json())
    } catch { /* offline */ }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const resolveIncident = (id: string) => {
    setIncidents(prev => prev.filter(i => i.id !== id))
  }

  const totalRevenue = tickets.reduce((s, t) => s + t.fare, 0)
  const activeTickets = tickets.filter(t => t.status === 'active').length

  if (loading) return null

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-sm">Beat KL traffic — Operator Dashboard</p>
              <p className="text-xs text-primary-foreground/60">Real-time network intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-primary-foreground/60">{user?.email}</span>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => navigate('/')}>
              ← Back to App
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Tickets', value: tickets.length, icon: <Ticket className="h-5 w-5" />, color: 'text-primary' },
            { label: 'Active Tickets', value: activeTickets, icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-green-600' },
            { label: 'Total Revenue', value: `RM ${totalRevenue.toFixed(2)}`, icon: <BarChart3 className="h-5 w-5" />, color: 'text-accent' },
            { label: 'Live Incidents', value: incidents.length, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-destructive' },
          ].map(kpi => (
            <Card key={kpi.label}>
              <CardContent className="pt-5 pb-4 flex items-center gap-4">
                <div className={kpi.color}>{kpi.icon}</div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="line-status">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="line-status"><Train className="h-3.5 w-3.5 mr-1.5" />Line Status</TabsTrigger>
            <TabsTrigger value="tickets"><Ticket className="h-3.5 w-3.5 mr-1.5" />Ticket Sales</TabsTrigger>
            <TabsTrigger value="crowd"><Users className="h-3.5 w-3.5 mr-1.5" />Crowd Heatmap</TabsTrigger>
            <TabsTrigger value="incidents"><AlertTriangle className="h-3.5 w-3.5 mr-1.5" />Incidents</TabsTrigger>
            <TabsTrigger value="suspicious"><Eye className="h-3.5 w-3.5 mr-1.5" />Suspicious Activity</TabsTrigger>
            <TabsTrigger value="slack"><Zap className="h-3.5 w-3.5 mr-1.5" />Slack Logs</TabsTrigger>
          </TabsList>

          {/* Line Status */}
          <TabsContent value="line-status">
            <div className="grid md:grid-cols-2 gap-4">
              {lineStatus.length > 0 ? lineStatus.map(s => (
                <Card key={s.line}>
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${s.status === 'Normal' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="font-semibold">{s.line}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{s.waitingTime}m wait</span>
                      <Badge variant={s.status === 'Normal' ? 'outline' : 'destructive'}>{s.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              )) : delays.map(d => (
                <Card key={d.line}>
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${LINE_COLORS[d.line]}`} />
                      <span className="font-semibold">{d.lineName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{d.estimatedDelay > 0 ? `+${d.estimatedDelay}m` : 'On time'}</span>
                      <Badge variant={d.severity === 'none' ? 'outline' : 'destructive'}>
                        {d.severity === 'none' ? 'Normal' : d.severity}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Ticket Sales */}
          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Ticket Sales</CardTitle>
              </CardHeader>
              <CardContent>
                {tickets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No ticket data yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground text-left">
                          <th className="pb-2 font-medium">ID</th>
                          <th className="pb-2 font-medium">From</th>
                          <th className="pb-2 font-medium">To</th>
                          <th className="pb-2 font-medium">Fare</th>
                          <th className="pb-2 font-medium">Status</th>
                          <th className="pb-2 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {tickets.slice(0, 20).map(t => (
                          <tr key={t.id}>
                            <td className="py-2 font-mono text-xs">{t.id}</td>
                            <td className="py-2">{t.from_station_id}</td>
                            <td className="py-2">{t.to_station_id}</td>
                            <td className="py-2 font-semibold">RM {t.fare.toFixed(2)}</td>
                            <td className="py-2">
                              <Badge variant={t.status === 'active' ? 'default' : 'outline'}>{t.status}</Badge>
                            </td>
                            <td className="py-2 text-muted-foreground text-xs">
                              {new Date(t.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Crowd Heatmap */}
          <TabsContent value="crowd">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Station Crowd Heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {delays.map(d => {
                    const score = Math.min(100, d.estimatedDelay * 5 + 30)
                    const bg = score < 35 ? 'bg-green-100 border-green-300' : score < 60 ? 'bg-yellow-100 border-yellow-300' : score < 80 ? 'bg-orange-100 border-orange-300' : 'bg-red-100 border-red-300'
                    const text = score < 35 ? 'text-green-800' : score < 60 ? 'text-yellow-800' : score < 80 ? 'text-orange-800' : 'text-red-800'
                    return (
                      <div key={d.line} className={`rounded-xl border p-4 ${bg}`}>
                        <div className={`w-3 h-1.5 rounded-full ${LINE_COLORS[d.line]} mb-2`} />
                        <p className={`text-sm font-bold ${text}`}>{d.lineName}</p>
                        <p className={`text-2xl font-black ${text}`}>{score}</p>
                        <p className={`text-xs ${text} opacity-70`}>{score < 35 ? 'Calm' : score < 60 ? 'Moderate' : score < 80 ? 'Busy' : 'Critical'}</p>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-4">Scale 0–100. Refresh to update predictions.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incidents */}
          <TabsContent value="incidents">
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Active Incidents</CardTitle>
                  <Button size="sm" onClick={() => {
                    const msg = prompt('Incident message:')
                    if (msg) setIncidents(prev => [...prev, { id: `INC-${Date.now()}`, line: 'MRT_PUTRAJAYA', severity: 'low', message: msg, reportedAt: new Date().toISOString() }])
                  }}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    New Incident
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {incidents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No active incidents.</p>
                  ) : incidents.map(inc => (
                    <div key={inc.id} className="flex items-start justify-between rounded-lg border p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={inc.severity === 'high' ? 'destructive' : inc.severity === 'medium' ? 'default' : 'outline'}>
                            {inc.severity}
                          </Badge>
                          <span className="text-sm font-semibold">{LINE_NAMES[inc.line]}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{inc.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(inc.reportedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" className="text-muted-foreground" onClick={() => resolveIncident(inc.id)}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Suspicious Activity */}
          <TabsContent value="suspicious">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Flagged Ticket Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {MOCK_SUSPICIOUS.map(s => (
                  <div key={s.id} className="flex items-start justify-between rounded-lg border p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={s.risk === 'high' ? 'destructive' : s.risk === 'medium' ? 'default' : 'outline'}>
                          {s.risk} risk
                        </Badge>
                        <span className="font-mono text-sm">{s.id}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{s.reason}</p>
                      <p className="text-xs text-muted-foreground">Station: {s.station}</p>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0">Review</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Slack Alert Logs */}
          <TabsContent value="slack">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Slack Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {MOCK_SLACK_LOGS.map((log, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg bg-secondary/40 px-4 py-3 text-sm">
                    <span className="font-mono text-xs text-muted-foreground w-10 shrink-0 pt-0.5">{log.ts}</span>
                    <div>
                      <span className="text-xs font-bold text-primary">{log.channel} </span>
                      <span className="text-muted-foreground">{log.msg}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
