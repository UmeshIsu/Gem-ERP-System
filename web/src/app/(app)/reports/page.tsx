'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BarChart3, Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { api } from '@/lib/api';
import { money, formatDate, titleCase } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MonthPicker } from '@/components/ui/month-picker';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

const REPORTS = [
  { key: 'income-statement', label: 'Income Statement', period: true },
  { key: 'profit', label: 'Profit Report', period: true },
  { key: 'expenses', label: 'Expense Report', period: true },
  { key: 'cash-flow', label: 'Cash Flow', period: true },
  { key: 'inventory', label: 'Inventory Report', period: false },
  { key: 'purchases', label: 'Purchase Report', period: true },
  { key: 'treatments', label: 'Treatment Report', period: true },
  { key: 'exports', label: 'Export Report', period: true },
  { key: 'gem-types', label: 'Gem Type Report', period: false },
  { key: 'locations', label: 'Location Report', period: false },
] as const;

type ReportKey = (typeof REPORTS)[number]['key'];

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function SummaryTile({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${negative ? 'text-destructive' : ''}`}>{money(value)}</div>
    </div>
  );
}

export default function ReportsPage() {
  const [report, setReport] = useState<ReportKey>('income-statement');
  const [month, setMonth] = useState(currentMonth());
  const [downloading, setDownloading] = useState<string | null>(null);

  const meta = REPORTS.find((r) => r.key === report)!;
  const params = meta.period ? { month } : {};

  const { data, isLoading } = useQuery({
    queryKey: ['report', report, month],
    queryFn: () => api.get<any>(`/reports/${report}`, params),
  });

  const download = async (format: 'csv' | 'excel' | 'pdf') => {
    setDownloading(format);
    try {
      const url = await api.download(`/reports/${report}`, { ...params, format });
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report}${meta.period ? `-${month}` : ''}.${format === 'excel' ? 'xlsx' : format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message ?? 'Download failed');
    } finally {
      setDownloading(null);
    }
  };

  const rows: any[] = data?.rows ?? data?.sales ?? [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  const renderCell = (key: string, value: any) => {
    if (value == null) return '—';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDate(value);
    if (typeof value === 'number') {
      const moneyish = /price|cost|profit|amount|value|invested|revenue|expenses/i.test(key);
      if (moneyish) return money(value);
      return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
    return String(value);
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Financial and operational reporting with PDF, Excel and CSV export."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
              <Printer /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={() => download('csv')} loading={downloading === 'csv'} className="no-print">
              <Download /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => download('excel')} loading={downloading === 'excel'} className="no-print">
              <FileSpreadsheet /> Excel
            </Button>
            <Button size="sm" onClick={() => download('pdf')} loading={downloading === 'pdf'} className="no-print">
              <FileText /> PDF
            </Button>
          </>
        }
      />

      <Card className="no-print mb-4">
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="flex flex-col space-y-1.5">
            <Label>Report</Label>
            <Select value={report} onValueChange={(v) => setReport(v as ReportKey)}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REPORTS.map((r) => (
                  <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {meta.period && (
            <div className="flex flex-col space-y-1.5">
              <Label>Month</Label>
              <MonthPicker value={month} onChange={setMonth} className="w-44" />
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{meta.label}</CardTitle>
            <CardDescription>
              {meta.period ? `Period: ${month}` : `Generated ${formatDate(new Date())}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Summary tiles per report type */}
            {report === 'income-statement' && data && (
              <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryTile label="Revenue" value={data.revenue} />
                <SummaryTile label="Cost of Goods Sold" value={data.costOfGoodsSold} negative />
                <SummaryTile label="Overheads" value={data.overheads} negative />
                <SummaryTile label="Net Profit" value={data.netProfit} negative={data.netProfit < 0} />
              </div>
            )}
            {report === 'cash-flow' && data && (
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryTile label="Inflows (Sales)" value={data.inflows} />
                <SummaryTile label="Outflows" value={data.outflows} negative />
                <SummaryTile label="Net Cash Flow" value={data.netCashFlow} negative={data.netCashFlow < 0} />
              </div>
            )}
            {report === 'expenses' && data && (
              <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryTile label="Total Expenses" value={data.total} negative />
                {(data.byCategory ?? []).slice(0, 3).map((c: any) => (
                  <SummaryTile key={c.category} label={c.category} value={c.amount} />
                ))}
              </div>
            )}
            {report === 'inventory' && data && (
              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <SummaryTile label="Total Purchase Cost" value={data.totalPurchaseCost} />
                <SummaryTile label="Total Current Value" value={data.totalCurrentValue} />
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Stones</div>
                  <div className="mt-1 text-xl font-semibold tabular-nums">{data.count}</div>
                </div>
              </div>
            )}
            {report === 'profit' && data && (
              <div className="mb-6 grid gap-3 sm:grid-cols-2">
                <SummaryTile label="Total Revenue" value={data.totalRevenue} />
                <SummaryTile label="Total Net Profit" value={data.totalNetProfit} negative={data.totalNetProfit < 0} />
              </div>
            )}

            {/* Table */}
            {report !== 'cash-flow' && (
              rows.length === 0 ? (
                <EmptyState icon={BarChart3} title="No data for this period" description="Try a different month or add records first." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((c) => (
                        <TableHead key={c}>{titleCase(c.replace(/([A-Z])/g, '_$1'))}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow key={i}>
                        {columns.map((c) => (
                          <TableCell key={c} className={typeof row[c] === 'number' ? 'tabular-nums' : ''}>
                            {renderCell(c, row[c])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
