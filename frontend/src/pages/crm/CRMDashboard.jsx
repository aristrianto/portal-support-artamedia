import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Ticket, TrendingUp, CheckCircle2, Timer, ShieldAlert, PlayCircle, Users, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts';
import api, { formatApiError } from '@/lib/api';
import { toast } from 'sonner';
import Breadcrumb from '@/components/Breadcrumb';
import { cn } from '@/lib/utils';

const PRIORITY_COLORS = { Critical: '#e11d48', High: '#ea580c', Medium: '#0284c7', Low: '#64748b' };
const STATUS_COLORS = ['#e11d48', '#0284c7', '#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#64748b'];

export default function CRMDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/crm/stats').then(({ data }) => setStats(data)).catch((err) => toast.error(formatApiError(err))).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'CRM' }, { label: 'CRM Dashboard' }]} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>CRM Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Ringkasan operasional tiket Broadband & Dedicated.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={Ticket} label="Total Tickets" value={stats?.total_tickets} loading={loading} tone="slate" />
        <StatCard icon={PlayCircle} label="Open" value={stats?.total_open} loading={loading} tone="rose" />
        <StatCard icon={Timer} label="In Progress" value={stats?.in_progress} loading={loading} tone="sky" />
        <StatCard icon={CheckCircle2} label="Closed" value={stats?.closed} loading={loading} tone="emerald" />
        <StatCard icon={ShieldAlert} label="Over SLA" value={stats?.over_sla} loading={loading} tone="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend */}
        <Card className="border-border lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <div className="text-sm font-semibold" style={{ fontFamily: 'Manrope' }}>Ticket Trends (14 hari)</div>
            </div>
            {loading ? <Skeleton className="h-64 w-full" /> : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.trend || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="broadband" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} name="Broadband" />
                    <Line type="monotone" dataKey="dedicated" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Dedicated" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Priority */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-primary" />
              <div className="text-sm font-semibold" style={{ fontFamily: 'Manrope' }}>Tickets by Priority</div>
            </div>
            {loading ? <Skeleton className="h-64 w-full" /> : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(stats?.by_priority || {}).map(([name, value]) => ({ name, value }))}
                      dataKey="value" nameKey="name"
                      innerRadius={40} outerRadius={70} paddingAngle={2}
                    >
                      {Object.keys(stats?.by_priority || {}).map((k, i) => (
                        <Cell key={i} fill={PRIORITY_COLORS[k] || STATUS_COLORS[i % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Provider */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-primary" />
              <div className="text-sm font-semibold" style={{ fontFamily: 'Manrope' }}>Tickets by Provider</div>
            </div>
            {loading ? <Skeleton className="h-56 w-full" /> : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.entries(stats?.by_provider || {}).map(([name, value]) => ({ name, value }))} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="value" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Status combined */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <PlayCircle className="w-4 h-4 text-primary" />
              <div className="text-sm font-semibold" style={{ fontFamily: 'Manrope' }}>Tickets by Status</div>
            </div>
            {loading ? <Skeleton className="h-56 w-full" /> : (
              <div className="space-y-4">
                <StatusBarRow title="Broadband" data={stats?.broadband_by_status || {}} />
                <StatusBarRow title="Dedicated" data={stats?.dedicated_by_status || {}} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, loading, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
    rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
    sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  };
  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold mt-1 tabular-nums" style={{ fontFamily: 'Manrope' }}>
              {loading ? <Skeleton className="h-7 w-16" /> : (value ?? 0)}
            </div>
          </div>
          <div className={cn('w-9 h-9 rounded-md border flex items-center justify-center shrink-0', tones[tone])}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBarRow({ title, data }) {
  const total = Object.values(data).reduce((s, v) => s + v, 0) || 1;
  const entries = Object.entries(data);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-medium">{title}</span>
        <span className="text-muted-foreground tabular-nums">{total} tickets</span>
      </div>
      <div className="flex h-6 rounded-md overflow-hidden border border-border">
        {entries.map(([k, v], i) => (
          <div key={k} className="h-full transition-all"
            style={{ width: `${(v / total) * 100}%`, background: STATUS_COLORS[i % STATUS_COLORS.length] }}
            title={`${k}: ${v}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
        {entries.map(([k, v], i) => (
          <div key={k} className="text-[10px] flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} />
            <span className="text-muted-foreground">{k}:</span>
            <span className="tabular-nums">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
