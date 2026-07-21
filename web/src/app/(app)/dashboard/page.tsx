'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Boxes,
  Flame,
  Gem,
  Plane,
  ShoppingBag,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '@/lib/api';
import { money, carats, formatDate } from '@/lib/format';
import { SERIES, chartAxis, chartGrid, compactNumber, tooltipStyle } from '@/components/charts/chart-theme';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/status-badge';
import { PageHeader } from '@/components/shared/page-header';

interface Summary {
  inventoryValue: number;
  inventoryCount: number;
  cashInvestment: number;
  todayPurchases: { total: number; count: number };
  monthPurchases: { total: number; count: number };
  monthSales: { total: number; count: number };
  monthProfit: number;
  monthExpenses: number;
  pendingHeatTreatments: number;
  runningHeatTreatments: number;
  electricQueue: number;
  upcomingExports: number;
  certificatesWaiting: number;
  recentPurchases: any[];
  latestExports: any[];
}

interface Charts {
  trend: { month: string; revenue: number; profit: number; purchases: number; expenses: number }[];
  inventoryByGemType: { name: string; value: number; count: number }[];
  purchasesByLocation: { name: string; value: number; count: number }[];
  stonesByStatus: { status: string; count: number }[];
  expensesByCategory: { name: string; value: number }[];
  exportsByCountry: { country: string; value: number; count: number }[];
  topGemTypes: { name: string; revenue: number; profit: number; count: number }[];
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  index,
  positive,
  href,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  index: number;
  positive?: boolean;
  href?: string;
}) {
  const cardContent = (
    <Card className={`group relative overflow-hidden transition-all duration-150 ${href ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lift hover:border-primary/40' : ''}`}>
      {/* corner glow that wakes on hover */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/[0.06] blur-2xl transition-opacity duration-300 group-hover:opacity-100 lg:opacity-0" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="mt-1.5 truncate font-display text-2xl font-bold tracking-tight tabular-nums">{value}</p>
            {sub && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                {positive === true && <ArrowUpRight className="h-3 w-3 text-success" />}
                {positive === false && <ArrowDownRight className="h-3 w-3 text-destructive" />}
                {sub}
              </p>
            )}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-secondary shadow-soft ring-1 ring-border/60 transition-transform duration-200 group-hover:scale-110">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
    >
      {href ? <Link href={href}>{cardContent}</Link> : cardContent}
    </motion.div>
  );
}

function AlertPill({
  label,
  count,
  href,
  icon: Icon,
}: {
  label: string;
  count: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/15 ring-1 ring-warning/20 transition-transform duration-200 group-hover:scale-110">
        <Icon className="h-4 w-4 text-warning" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{label}</div>
      </div>
      <div className="font-display text-lg font-bold tabular-nums">{count}</div>
    </Link>
  );
}

export default function DashboardPage() {
  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.get<Summary>('/dashboard/summary'),
  });
  const chartsQuery = useQuery({
    queryKey: ['dashboard', 'charts'],
    queryFn: () => api.get<Charts>('/dashboard/charts'),
  });
  const { data: summary, isLoading: sLoading } = summaryQuery;
  const { data: charts, isLoading: cLoading } = chartsQuery;

  // A settled-but-empty query means the request failed (e.g. API not running) — show a retry panel, never crash.
  if (!sLoading && !cLoading && (!summary || !charts)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <ArrowDownRight className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Couldn’t load the dashboard</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            The API server didn’t respond. Make sure the backend is running (<code className="rounded bg-muted px-1">npm run start:dev</code> in the <code className="rounded bg-muted px-1">api</code> folder), then retry.
          </p>
        </div>
        <button
          onClick={() => {
            summaryQuery.refetch();
            chartsQuery.refetch();
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  if (sLoading || cLoading || !summary || !charts) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const s = summary!;
  const c = charts!;

  const getLocalDateString = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split('T')[0];
  };

  const todayStr = getLocalDateString(new Date());
  const startOfMonthStr = getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Business overview · ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
      />

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} title="Inventory Value" value={money(s.inventoryValue, true)} sub={`${s.inventoryCount} stones in stock`} icon={Gem} href="/inventory" />
        <StatCard index={1} title="Cash Investment" value={money(s.cashInvestment, true)} sub="capital in current inventory" icon={Wallet} href="/financials" />
        <StatCard index={2} title="Monthly Sales" value={money(s.monthSales.total, true)} sub={`${s.monthSales.count} sales this month`} icon={TrendingUp} positive={s.monthSales.total > 0 ? true : undefined} href="/exports" />
        <StatCard index={3} title="Monthly Profit" value={money(s.monthProfit, true)} sub="net, after all expenses" icon={ArrowUpRight} positive={s.monthProfit >= 0} href="/financials" />
        <StatCard index={4} title="Today's Purchases" value={money(s.todayPurchases.total, true)} sub={`${s.todayPurchases.count} stones today`} icon={ShoppingBag} href={`/inventory?purchasedFrom=${todayStr}&purchasedTo=${todayStr}`} />
        <StatCard index={5} title="Monthly Purchases" value={money(s.monthPurchases.total, true)} sub={`${s.monthPurchases.count} stones this month`} icon={Boxes} href={`/inventory?purchasedFrom=${startOfMonthStr}&purchasedTo=${todayStr}`} />
        <StatCard index={6} title="Monthly Expenses" value={money(s.monthExpenses, true)} sub="stone costs + overheads" icon={Wallet} positive={false} href="/financials" />
        <StatCard index={7} title="Inventory Quantity" value={s.inventoryCount.toLocaleString()} sub="active stones" icon={Gem} href="/inventory" />
      </div>

      {/* Alerts */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AlertPill label="Pending Heat Treatments" count={s.pendingHeatTreatments + s.runningHeatTreatments} href="/treatments" icon={Flame} />
        <AlertPill label="Electric Treatment Queue" count={s.electricQueue} href="/treatments?tab=electric" icon={Zap} />
        <AlertPill label="Certificates Waiting" count={s.certificatesWaiting} href="/certifications" icon={Award} />
        <AlertPill label="Upcoming Exports" count={s.upcomingExports} href="/exports" icon={Plane} />
      </div>

      {/* Revenue & profit trend */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Revenue & Profit Trend</CardTitle>
            <CardDescription>Last 12 months</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={c.trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...chartGrid} />
                <XAxis dataKey="month" {...chartAxis} />
                <YAxis {...chartAxis} tickFormatter={compactNumber} width={48} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => money(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke={SERIES[0]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="profit" name="Net Profit" stroke={SERIES[2]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Inventory by Gem Type</CardTitle>
            <CardDescription>Current stock value</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={c.inventoryByGemType.slice(0, 6)}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={2}
                  strokeWidth={2}
                  stroke="hsl(var(--card))"
                >
                  {c.inventoryByGemType.slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={SERIES[i % SERIES.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(v: number) => money(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Purchases / expenses trend + location analytics */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Purchases vs Expenses</CardTitle>
            <CardDescription>Monthly cash outflows, last 12 months</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid {...chartGrid} />
                <XAxis dataKey="month" {...chartAxis} />
                <YAxis {...chartAxis} tickFormatter={compactNumber} width={48} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => money(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="purchases" name="Purchases" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="expenses" name="Expenses" fill={SERIES[3]} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchases by Location</CardTitle>
            <CardDescription>Total invested per buying location</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={c.purchasesByLocation.slice(0, 8)}
                layout="vertical"
                margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
              >
                <CartesianGrid {...chartGrid} horizontal={false} vertical />
                <XAxis type="number" {...chartAxis} tickFormatter={compactNumber} />
                <YAxis type="category" dataKey="name" {...chartAxis} width={90} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => money(v)} />
                <Bar dataKey="value" name="Invested" fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Expense breakdown + export destinations + top gem types */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>All-time by category</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={c.expensesByCategory.slice(0, 7)}
                layout="vertical"
                margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
              >
                <XAxis type="number" {...chartAxis} tickFormatter={compactNumber} />
                <YAxis type="category" dataKey="name" {...chartAxis} width={110} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => money(v)} />
                <Bar dataKey="value" name="Amount" fill={SERIES[4]} radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export Destinations</CardTitle>
            <CardDescription>Shipped value by country</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={c.exportsByCountry.slice(0, 7)}
                layout="vertical"
                margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
              >
                <XAxis type="number" {...chartAxis} tickFormatter={compactNumber} />
                <YAxis type="category" dataKey="country" {...chartAxis} width={90} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => money(v)} />
                <Bar dataKey="value" name="Export Value" fill={SERIES[1]} radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Gem Types</CardTitle>
            <CardDescription>By realized net profit</CardDescription>
          </CardHeader>
          <CardContent>
            {c.topGemTypes.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No sales recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {c.topGemTypes.slice(0, 6).map((g, i) => (
                  <div key={g.name} className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: SERIES[i % SERIES.length] }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">{g.name}</span>
                        <span className="text-sm font-semibold tabular-nums">{money(g.profit, true)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {g.count} sold · {money(g.revenue, true)} revenue
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Purchases</CardTitle>
            <CardDescription>Latest stones added to inventory</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {s.recentPurchases.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No purchases yet.</p>
            )}
            {s.recentPurchases.map((st: any) => (
              <Link
                key={st.id}
                href={`/inventory/${st.id}`}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-mono text-[10px] font-bold text-accent-foreground">
                    {st.code}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {st.code} · {st.gemType?.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {carats(st.weightCt)} · {st.purchaseLocation?.name ?? '—'} · {formatDate(st.purchaseDate)}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums">{money(st.purchaseCost, true)}</div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Exports</CardTitle>
            <CardDescription>Recently shipped consignments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {s.latestExports.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No exports yet.</p>
            )}
            {s.latestExports.map((ex: any) => (
              <Link
                key={ex.id}
                href={`/exports/${ex.id}`}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                    <Plane className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {ex.shipmentCode} · {ex.buyer?.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ex.country} · {ex.items?.length ?? 0} stones · {formatDate(ex.exportDate)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={ex.status} />
                  <span className="text-sm font-semibold tabular-nums">{money(ex.exportValue, true)}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
