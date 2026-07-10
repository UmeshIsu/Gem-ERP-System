'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Archive,
  Check,
  ChevronRight,
  Circle,
  CircleDot,
  ImagePlus,
  Minus,
  QrCode,
  SkipForward,
  Split,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { money, carats, formatDate, formatDateTime, percent, titleCase } from '@/lib/format';
import { IMAGE_STAGES, STAGE_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/status-badge';
import { SplitDialog } from './split-dialog';
import { ExpenseDialog } from './expense-dialog';
import { StageActions } from './stage-actions';

function StageIcon({ status }: { status: string }) {
  switch (status) {
    case 'COMPLETED':
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-success text-white">
          <Check className="h-3.5 w-3.5" />
        </div>
      );
    case 'IN_PROGRESS':
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-accent text-primary">
          <CircleDot className="h-3.5 w-3.5 animate-pulse" />
        </div>
      );
    case 'NOT_APPLICABLE':
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border bg-muted text-muted-foreground">
          <Minus className="h-3.5 w-3.5" />
        </div>
      );
    case 'SKIPPED':
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border bg-warning/15 text-warning">
          <SkipForward className="h-3.5 w-3.5" />
        </div>
      );
    default:
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border bg-card text-muted-foreground">
          <Circle className="h-3 w-3" />
        </div>
      );
  }
}

function ImageUploadDialog({ stoneId }: { stoneId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState('OTHER');
  const [uploading, setUploading] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        const uploaded = await api.upload<{ url: string; thumbUrl?: string }>('/uploads?folder=stones', form);
        await api.post(`/stones/${stoneId}/images`, { url: uploaded.url, thumbUrl: uploaded.thumbUrl, stage });
      }
      toast.success('Images uploaded');
      queryClient.invalidateQueries({ queryKey: ['stone', stoneId] });
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ImagePlus /> Add Images
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Images</DialogTitle>
          <DialogDescription>Tag photos to a lifecycle stage (before/after heating, cutting…).</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {IMAGE_STAGES.map((s) => (
                <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary">
            <ImagePlus className="h-6 w-6" />
            <span className="text-sm">{uploading ? 'Uploading…' : 'Click to choose images'}</span>
            <input type="file" accept="image/*,video/*" multiple className="hidden" disabled={uploading} onChange={(e) => onFiles(e.target.files)} />
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function StoneDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  const { data: stone, isLoading } = useQuery({
    queryKey: ['stone', id],
    queryFn: () => api.get<any>(`/stones/${id}`),
  });
  const { data: codes } = useQuery({
    queryKey: ['stone', id, 'codes'],
    queryFn: () => api.get<{ qrPayload: string; barcodePayload: string; label: string }>(`/stones/${id}/codes`),
    enabled: !!stone,
  });
  const { data: timeline } = useQuery({
    queryKey: ['stone', id, 'timeline'],
    queryFn: () => api.get<{ stages: any[]; events: any[] }>(`/stones/${id}/timeline`),
  });

  if (isLoading || !stone) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const fin = stone.financials;
  const canEdit = hasRole('MANAGER', 'INVENTORY_OFFICER');
  const splittable =
    canEdit && !['SPLIT', 'EXPORTED', 'SOLD_LOCALLY', 'ARCHIVED'].includes(stone.status);

  const archive = async () => {
    if (!confirm(`Archive ${stone.code}? It stays in the system permanently but leaves active inventory.`)) return;
    try {
      await api.post(`/stones/${id}/archive`);
      toast.success('Stone archived');
      queryClient.invalidateQueries({ queryKey: ['stone', id] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/inventory" className="hover:text-foreground">Inventory</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-mono">{stone.code}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-bold tracking-tight text-primary">{stone.code}</h1>
            <h2 className="text-2xl font-semibold">{stone.gemType?.name}</h2>
            <StatusBadge status={stone.status} />
            {stone.isArchived && <Badge variant="outline"><Archive className="mr-1 h-3 w-3" />Archived</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {carats(stone.weightCt)} · {titleCase(stone.stoneKind)} · {stone.color ?? 'No color noted'} ·{' '}
            {stone.origin ?? '—'} · Purchased {formatDate(stone.purchaseDate)}
            {stone.purchaseLocation && ` at ${stone.purchaseLocation.name}`}
            {stone.seller && ` from ${stone.seller.name}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {codes && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><QrCode /> Codes</Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>{codes.label}</DialogTitle>
                  <DialogDescription>QR and barcode payloads for labelling.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  {/* QR rendered via external-free SVG data — payload shown for scanner apps/label printers */}
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <div className="text-xs font-medium text-muted-foreground">QR payload</div>
                    <code className="mt-1 block break-all text-xs">{codes.qrPayload}</code>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <div className="text-xs font-medium text-muted-foreground">Barcode (Code 128)</div>
                    <div className="mt-1 font-mono text-2xl font-bold tracking-widest">{codes.barcodePayload}</div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {canEdit && <ImageUploadDialog stoneId={id} />}
          {canEdit && <ExpenseDialog stoneId={id} stoneCode={stone.code} />}
          {splittable && <SplitDialog stone={stone} />}
          {canEdit && !stone.isArchived && (
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={archive}>
              <Archive /> Archive
            </Button>
          )}
        </div>
      </div>

      {/* Lineage banner */}
      {(stone.parent || stone.children?.length > 0) && (
        <Card className="border-primary/30 bg-accent/40">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <Split className="h-4 w-4 text-primary" />
            {stone.parent && (
              <span className="text-sm">
                Created from split of{' '}
                <Link href={`/inventory/${stone.parent.id}`} className="font-mono font-semibold text-primary hover:underline">
                  {stone.parent.code}
                </Link>{' '}
                ({carats(stone.parent.weightCt)})
              </span>
            )}
            {stone.children?.length > 0 && (
              <span className="flex flex-wrap items-center gap-2 text-sm">
                Split into:
                {stone.children.map((c: any) => (
                  <Link
                    key={c.id}
                    href={`/inventory/${c.id}`}
                    className="rounded-md border bg-card px-2 py-0.5 font-mono text-xs font-semibold text-primary hover:bg-accent"
                  >
                    {c.code} · {carats(c.weightCt)}
                  </Link>
                ))}
              </span>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: timeline + tabs */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Timeline</CardTitle>
              <CardDescription>
                The permanent lifecycle record. Skipped stages are shown as Not Applicable — never hidden.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {(stone.stages ?? []).map((stage: any, i: number) => (
                  <div key={stage.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <StageIcon status={stage.status} />
                      {i < stone.stages.length - 1 && <div className="w-px flex-1 bg-border" />}
                    </div>
                    <div className={`pb-6 ${stage.status === 'NOT_APPLICABLE' ? 'opacity-50' : ''}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{STAGE_LABELS[stage.kind] ?? stage.kind}</span>
                        <Badge
                          variant={
                            stage.status === 'COMPLETED'
                              ? 'success'
                              : stage.status === 'IN_PROGRESS'
                                ? 'info'
                                : stage.status === 'SKIPPED'
                                  ? 'warning'
                                  : 'secondary'
                          }
                        >
                          {stage.status === 'NOT_APPLICABLE' ? 'Not Applicable' : titleCase(stage.status)}
                        </Badge>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {stage.completedAt
                          ? `Completed ${formatDateTime(stage.completedAt)}`
                          : stage.startedAt
                            ? `Started ${formatDateTime(stage.startedAt)}`
                            : stage.skippedReason
                              ? `Skipped — ${stage.skippedReason}`
                              : ''}
                      </div>
                      <StageActions stone={stone} stage={stage} canEdit={canEdit} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="gallery">
            <TabsList>
              <TabsTrigger value="gallery">Gallery ({stone.images?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="expenses">Expenses ({stone.expenses?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="history">History ({timeline?.events?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="records">Records</TabsTrigger>
            </TabsList>

            <TabsContent value="gallery">
              {(stone.images ?? []).length === 0 ? (
                <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No images yet.</CardContent></Card>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {stone.images.map((img: any) => (
                    <a key={img.id} href={img.url} target="_blank" rel="noreferrer" className="group relative overflow-hidden rounded-lg border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.thumbUrl ?? img.url}
                        alt={img.caption ?? titleCase(img.stage)}
                        className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {titleCase(img.stage)}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="expenses">
              <Card>
                <CardContent className="p-0">
                  {(stone.expenses ?? []).length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">No expenses recorded.</p>
                  ) : (
                    <div className="divide-y">
                      {stone.expenses.map((e: any) => (
                        <div key={e.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <div className="text-sm font-medium">{e.category?.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(e.incurredAt)}{e.note ? ` · ${e.note}` : ''}
                            </div>
                          </div>
                          <span className="text-sm font-semibold tabular-nums">{money(e.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {(timeline?.events ?? []).map((ev: any) => (
                      <div key={ev.id} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{ev.title}</span>
                          <span className="text-xs text-muted-foreground">{formatDateTime(ev.createdAt)}</span>
                        </div>
                        {ev.detail && <p className="mt-0.5 text-xs text-muted-foreground">{ev.detail}</p>}
                        {ev.user && <p className="mt-0.5 text-[11px] text-muted-foreground/70">by {ev.user.fullName}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="records">
              <div className="space-y-4">
                {(stone.batchLinks ?? []).length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Heat Treatment Batches</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {stone.batchLinks.map((l: any) => (
                        <Link key={l.id} href={`/treatments/${l.batch.id}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent/50">
                          <span className="font-mono font-medium">{l.batch.batchCode}</span>
                          <span className="text-xs text-muted-foreground">{l.batch.machine?.name} · {l.batch.temperatureC ?? '—'}°C</span>
                          <StatusBadge status={l.batch.status} />
                        </Link>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {(stone.cuttingRecords ?? []).length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Cutting Records</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {stone.cuttingRecords.map((c: any) => (
                        <div key={c.id} className="rounded-md border px-3 py-2 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">{c.cutterName}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(c.cuttingDate)}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {carats(c.weightBeforeCt)} → {carats(c.weightAfterCt)} (−{Number(c.lossPct)}%) · {money(c.cost)}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {(stone.certifications ?? []).length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Certificates</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {stone.certifications.map((c: any) => (
                        <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <div>
                            <span className="font-medium">{c.laboratory?.name}</span>
                            <span className="ml-2 font-mono text-xs text-muted-foreground">{c.certificateNumber ?? 'No number yet'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {c.pdfUrl && <a href={c.pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">PDF</a>}
                            <StatusBadge status={c.status} />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {(stone.electricRun) && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Electric Treatment</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <span>{stone.electricRun.plannedWeeks} weeks planned · {stone.electricRun.completionPct}% complete</span>
                        <StatusBadge status={stone.electricRun.status} />
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stone.electricRun.completionPct}%` }} />
                      </div>
                    </CardContent>
                  </Card>
                )}
                {(stone.batchLinks ?? []).length === 0 && (stone.cuttingRecords ?? []).length === 0 &&
                  (stone.certifications ?? []).length === 0 && !stone.electricRun && (
                    <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No processing records yet.</CardContent></Card>
                  )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column: financials */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
              <CardDescription>Live cost basis and profitability.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Purchase Cost{stone.parent ? ' (allocated)' : ''}</span>
                <span className="font-medium tabular-nums">{money(fin.purchaseCost)}</span>
              </div>
              {fin.expensesByCategory.map((e: any) => (
                <div key={e.category} className="flex justify-between pl-3">
                  <span className="text-muted-foreground">+ {e.category}</span>
                  <span className="tabular-nums">{money(e.amount)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total Investment</span>
                <span className="tabular-nums">{money(fin.totalInvestment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Value</span>
                <span className="tabular-nums">{money(fin.currentValue)}</span>
              </div>
              {fin.salePrice != null && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sale Price</span>
                    <span className="font-medium tabular-nums">{money(fin.salePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Profit</span>
                    <span className="tabular-nums">{money(fin.grossProfit)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Net Profit</span>
                    <span className={`tabular-nums ${Number(fin.netProfit) >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {money(fin.netProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ROI</span>
                    <span className={`font-semibold tabular-nums ${Number(fin.roi) >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {percent(fin.roi)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Attributes</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {[
                ['Species', stone.gemType?.species],
                ['Variety', stone.gemType?.variety],
                ['Shape', stone.shape],
                ['Dimensions', stone.dimensions],
                ['Clarity', stone.clarity],
                ['Workflow', stone.workflowTemplate ? `${stone.workflowTemplate.code} — ${stone.workflowTemplate.name}` : null],
                ['Registered by', stone.createdBy?.fullName],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-right font-medium">{v ?? '—'}</span>
                </div>
              ))}
              {stone.notes && (
                <>
                  <Separator />
                  <p className="text-muted-foreground">{stone.notes}</p>
                </>
              )}
              {(stone.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {stone.tags.map((t: string) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {stone.saleRecord && (
            <Card className="border-success/40">
              <CardHeader><CardTitle className="text-success">Sold</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Channel</span>
                  <span>{titleCase(stone.saleRecord.channel)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Buyer</span>
                  <span>{stone.saleRecord.buyer?.name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{formatDate(stone.saleRecord.saleDate)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
