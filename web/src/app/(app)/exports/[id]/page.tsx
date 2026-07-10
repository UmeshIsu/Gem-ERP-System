'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronRight, FileUp, Plane, Plus, Trash2, Truck } from 'lucide-react';
import { api, Paginated } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { money, carats, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/status-badge';

function AddItemDialog({ shipmentId }: { shipmentId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [stoneId, setStoneId] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: stones } = useQuery({
    queryKey: ['stones', 'export-eligible'],
    queryFn: () => api.get<Paginated<any>>('/stones', { limit: 100 }),
    enabled: open,
  });

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post(`/exports/${shipmentId}/items`, { stoneId, salePrice: Number(salePrice) });
      toast.success('Stone added to shipment');
      queryClient.invalidateQueries({ queryKey: ['export', shipmentId] });
      setOpen(false);
      setStoneId(''); setSalePrice('');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus /> Add Stone</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Stone to Shipment</DialogTitle>
          <DialogDescription>Sale price is frozen into the profit record when the shipment ships.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Stone *</Label>
            <Select value={stoneId} onValueChange={setStoneId}>
              <SelectTrigger><SelectValue placeholder="Select stone" /></SelectTrigger>
              <SelectContent>
                {(stones?.data ?? []).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code} — {s.gemType?.name} ({carats(s.weightCt)}) · invested {money(s.purchaseCost, true)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Sale Price (LKR) *</Label>
            <Input type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!stoneId || !(Number(salePrice) > 0)} loading={submitting}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const canManage = hasRole('MANAGER', 'FINANCE_OFFICER');
  const [tracking, setTracking] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: shipment, isLoading } = useQuery({
    queryKey: ['export', id],
    queryFn: () => api.get<any>(`/exports/${id}`),
  });

  if (isLoading || !shipment) {
    return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-96" /></div>;
  }

  const editable = ['DRAFT', 'PENDING'].includes(shipment.status);

  const ship = async () => {
    if (!confirm(`Mark ${shipment.shipmentCode} as SHIPPED? All ${shipment.items.length} stones become EXPORTED and their profit is frozen. This cannot be undone.`)) return;
    try {
      await api.post(`/exports/${id}/status`, { status: 'SHIPPED' });
      toast.success('Shipment marked as shipped');
      queryClient.invalidateQueries({ queryKey: ['export', id] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    }
  };

  const saveTracking = async () => {
    try {
      await api.patch(`/exports/${id}`, { trackingNumber: tracking });
      toast.success('Tracking updated');
      queryClient.invalidateQueries({ queryKey: ['export', id] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await api.delete(`/exports/${id}/items/${itemId}`);
      queryClient.invalidateQueries({ queryKey: ['export', id] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    }
  };

  const uploadDocument = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const uploaded = await api.upload<{ url: string }>('/uploads?folder=exports', form);
      await api.post(`/exports/${id}/documents`, { name: file.name, url: uploaded.url });
      toast.success('Document attached');
      queryClient.invalidateQueries({ queryKey: ['export', id] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/exports" className="hover:text-foreground">Exports</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-mono">{shipment.shipmentCode}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-bold text-primary">{shipment.shipmentCode}</h1>
            <StatusBadge status={shipment.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {shipment.buyer?.name}{shipment.buyer?.company ? ` (${shipment.buyer.company})` : ''} · {shipment.country}
            {shipment.courier ? ` · ${shipment.courier}` : ''}
            {shipment.exportDate ? ` · ${formatDate(shipment.exportDate)}` : ''}
          </p>
        </div>
        {canManage && editable && (
          <Button variant="success" onClick={ship} disabled={shipment.items.length === 0}>
            <Plane /> Mark as Shipped
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Stones ({shipment.items.length})</CardTitle>
                <CardDescription>Total export value {money(shipment.exportValue)}</CardDescription>
              </div>
              {canManage && editable && <AddItemDialog shipmentId={id} />}
            </CardHeader>
            <CardContent className="p-0">
              {shipment.items.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No stones added yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stone</TableHead>
                      <TableHead>Gem Type</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead className="text-right">Sale Price</TableHead>
                      {canManage && editable && <TableHead className="w-12" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipment.items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Link href={`/inventory/${item.stone.id}`} className="font-mono font-semibold text-primary hover:underline">
                            {item.stone.code}
                          </Link>
                        </TableCell>
                        <TableCell>{item.stone.gemType?.name}</TableCell>
                        <TableCell className="tabular-nums">{carats(item.stone.weightCt)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{money(item.salePrice)}</TableCell>
                        {canManage && editable && (
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Documents ({shipment.documents.length})</CardTitle>
              {canManage && (
                <label className="flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent">
                  <FileUp className="h-4 w-4" />
                  {uploading ? 'Uploading…' : 'Attach'}
                  <input type="file" className="hidden" onChange={(e) => uploadDocument(e.target.files?.[0])} />
                </label>
              )}
            </CardHeader>
            <CardContent>
              {shipment.documents.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No documents attached (invoice, permits, customs…)</p>
              ) : (
                <div className="space-y-2">
                  {shipment.documents.map((d: any) => (
                    <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent/50">
                      <span className="font-medium">{d.name}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</span>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Shipment Details</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {[
                ['Invoice', shipment.invoiceNumber],
                ['Courier', shipment.courier],
                ['Country', shipment.country],
                ['Shipping Cost', shipment.shippingCost ? money(shipment.shippingCost) : null],
                ['Export Date', shipment.exportDate ? formatDate(shipment.exportDate) : null],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-right font-medium">{v ?? '—'}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total Value</span>
                <span className="tabular-nums">{money(shipment.exportValue)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Truck className="h-4 w-4" /> Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {shipment.trackingNumber ? (
                <div className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm">{shipment.trackingNumber}</div>
              ) : (
                <p className="text-sm text-muted-foreground">No tracking number yet.</p>
              )}
              {canManage && editable && (
                <div className="flex gap-2">
                  <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number" />
                  <Button variant="outline" onClick={saveTracking} disabled={!tracking.trim()}>Save</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {shipment.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{shipment.notes}</p></CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
