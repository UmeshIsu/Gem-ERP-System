'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Flame, Play, Zap } from 'lucide-react';
import { api, Paginated } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatDateTime, titleCase } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';
import { CreateBatchDialog, CreateElectricDialog } from './batch-dialogs';

function CompleteBatchDialog({ batch }: { batch: any }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [results, setResults] = useState<Record<string, { result: string; weightAfterCt: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post(`/treatments/batches/${batch.id}/complete`, {
        status: failed ? 'FAILED' : 'COMPLETED',
        remarks: remarks || undefined,
        results: batch.stones.map((l: any) => ({
          stoneId: l.stone.id,
          result: results[l.stone.id]?.result || undefined,
          weightAfterCt: results[l.stone.id]?.weightAfterCt ? Number(results[l.stone.id].weightAfterCt) : undefined,
        })),
      });
      toast.success(`Batch ${batch.batchCode} ${failed ? 'marked failed' : 'completed'}`);
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="success" onClick={(e) => e.stopPropagation()}>Finish</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Finish Batch {batch.batchCode}</DialogTitle>
          <DialogDescription>Record the outcome per stone. Weight changes update the inventory.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {batch.stones.map((l: any) => (
            <div key={l.id} className="rounded-md border p-3">
              <div className="mb-2 font-mono text-sm font-semibold text-primary">{l.stone.code}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Result (e.g. Color improved to vivid blue)"
                  value={results[l.stone.id]?.result ?? ''}
                  onChange={(e) => setResults((p) => ({ ...p, [l.stone.id]: { ...p[l.stone.id], result: e.target.value, weightAfterCt: p[l.stone.id]?.weightAfterCt ?? '' } }))}
                />
                <Input
                  type="number"
                  step="0.001"
                  placeholder={`Weight after (was ${l.weightBeforeCt ?? l.stone.weightCt} ct)`}
                  value={results[l.stone.id]?.weightAfterCt ?? ''}
                  onChange={(e) => setResults((p) => ({ ...p, [l.stone.id]: { ...p[l.stone.id], weightAfterCt: e.target.value, result: p[l.stone.id]?.result ?? '' } }))}
                />
              </div>
            </div>
          ))}
          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Batch notes" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-input" checked={failed} onChange={(e) => setFailed(e.target.checked)} />
            Mark this batch as <span className="font-semibold text-destructive">FAILED</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} loading={submitting} variant={failed ? 'destructive' : 'success'}>
            {failed ? 'Mark Failed' : 'Complete Batch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ElectricProgressDialog({ run }: { run: any }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [weekNumber, setWeekNumber] = useState(String((run.logs?.length ?? 0) + 1));
  const [completionPct, setCompletionPct] = useState(String(run.completionPct ?? 0));
  const [colorImprovement, setColorImprovement] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (complete = false) => {
    setSubmitting(true);
    try {
      await api.post(`/treatments/electric/${run.id}/progress`, {
        weekNumber: Number(weekNumber),
        completionPct: Number(completionPct),
        colorImprovement: colorImprovement || undefined,
      });
      if (complete) {
        await api.patch(`/treatments/electric/${run.id}`, { status: 'COMPLETED' });
      }
      toast.success(complete ? 'Treatment completed' : 'Progress logged');
      queryClient.invalidateQueries({ queryKey: ['electric'] });
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Log Week</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Weekly Progress — {run.stone?.code}</DialogTitle>
          <DialogDescription>{run.plannedWeeks} weeks planned · currently {run.completionPct}%</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Week #</Label>
            <Input type="number" min={1} value={weekNumber} onChange={(e) => setWeekNumber(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Completion %</Label>
            <Input type="number" min={0} max={100} value={completionPct} onChange={(e) => setCompletionPct(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Color Improvement</Label>
            <Input value={colorImprovement} onChange={(e) => setColorImprovement(e.target.value)} placeholder="e.g. Milkiness reduced, blue emerging" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => submit(true)} loading={submitting}>Log & Complete</Button>
          <Button onClick={() => submit(false)} loading={submitting}>Log Progress</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TreatmentsContent() {
  const searchParams = useSearchParams();
  const { hasRole } = useAuth();
  const canOperate = hasRole('MANAGER', 'HEAT_OPERATOR');
  const [tab, setTab] = useState(searchParams.get('tab') === 'electric' ? 'electric' : 'gas');
  const [batchPage, setBatchPage] = useState(1);
  const [electricPage, setElectricPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: batches, isLoading: bLoading } = useQuery({
    queryKey: ['batches', batchPage],
    queryFn: () => api.get<Paginated<any>>('/treatments/batches', { page: batchPage, limit: 20 }),
  });
  const { data: electric, isLoading: eLoading } = useQuery({
    queryKey: ['electric', electricPage],
    queryFn: () => api.get<Paginated<any>>('/treatments/electric', { page: electricPage, limit: 20 }),
  });

  const startBatch = async (id: string, code: string) => {
    try {
      await api.post(`/treatments/batches/${id}/start`);
      toast.success(`Batch ${code} started`);
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to start');
    }
  };

  return (
    <div>
      <PageHeader
        title="Heat Treatment"
        description="Gas furnace batches and week-based electric treatment runs."
        actions={canOperate && (
          <>
            <CreateElectricDialog />
            <CreateBatchDialog />
          </>
        )}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="gas"><Flame className="mr-1.5 h-4 w-4" /> Gas Batches</TabsTrigger>
          <TabsTrigger value="electric"><Zap className="mr-1.5 h-4 w-4" /> Electric Treatment</TabsTrigger>
        </TabsList>

        <TabsContent value="gas">
          <Card>
            {bLoading ? (
              <CardContent className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
              </CardContent>
            ) : (batches?.data ?? []).length === 0 ? (
              <CardContent className="p-6">
                <EmptyState icon={Flame} title="No treatment batches" description="Create a gas batch to start tracking heat treatments." />
              </CardContent>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch</TableHead>
                      <TableHead>Machine</TableHead>
                      <TableHead>Operator</TableHead>
                      <TableHead>Stones</TableHead>
                      <TableHead>Temp / Duration</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches!.data.map((b: any) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono font-semibold text-primary">{b.batchCode}</TableCell>
                        <TableCell>{b.machine?.name}</TableCell>
                        <TableCell>{b.operator?.fullName ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {b.stones.slice(0, 4).map((l: any) => (
                              <Link key={l.id} href={`/inventory/${l.stone.id}`} className="rounded bg-accent px-1.5 py-0.5 font-mono text-xs font-medium text-accent-foreground hover:underline">
                                {l.stone.code}
                              </Link>
                            ))}
                            {b.stones.length > 4 && <span className="text-xs text-muted-foreground">+{b.stones.length - 4}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {b.temperatureC ? `${b.temperatureC}°C` : '—'} / {b.durationHours ? `${b.durationHours}h` : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{b.startAt ? formatDateTime(b.startAt) : '—'}</TableCell>
                        <TableCell><StatusBadge status={b.status} /></TableCell>
                        <TableCell className="text-right">
                          {canOperate && b.status === 'PENDING' && (
                            <Button size="sm" variant="outline" onClick={() => startBatch(b.id, b.batchCode)}>
                              <Play /> Start
                            </Button>
                          )}
                          {canOperate && b.status === 'RUNNING' && <CompleteBatchDialog batch={b} />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="px-4">
                  <Pagination meta={batches!.meta} onPageChange={setBatchPage} />
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="electric">
          <Card>
            {eLoading ? (
              <CardContent className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
              </CardContent>
            ) : (electric?.data ?? []).length === 0 ? (
              <CardContent className="p-6">
                <EmptyState icon={Zap} title="No electric treatments" description="Start an electric treatment run to track weekly color improvement." />
              </CardContent>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stone</TableHead>
                      <TableHead>Gem Type</TableHead>
                      <TableHead>Weeks</TableHead>
                      <TableHead className="w-56">Progress</TableHead>
                      <TableHead>Est. Finish</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {electric!.data.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Link href={`/inventory/${r.stone.id}`} className="font-mono font-semibold text-primary hover:underline">
                            {r.stone.code}
                          </Link>
                        </TableCell>
                        <TableCell>{r.stone.gemType?.name}</TableCell>
                        <TableCell className="text-sm">{r.logs?.length ?? 0} / {r.plannedWeeks}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${r.completionPct}%` }} />
                            </div>
                            <span className="w-9 text-right text-xs font-semibold tabular-nums">{r.completionPct}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(r.estimatedFinish)}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-right">
                          {canOperate && ['RUNNING', 'PAUSED'].includes(r.status) && <ElectricProgressDialog run={r} />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="px-4">
                  <Pagination meta={electric!.meta} onPageChange={setElectricPage} />
                </div>
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function TreatmentsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <TreatmentsContent />
    </Suspense>
  );
}
