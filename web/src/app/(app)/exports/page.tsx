'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { HandCoins, Plane, Plus } from 'lucide-react';
import { api, Paginated } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { money, carats, formatDate } from '@/lib/format';
import { useMasterData } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/status-badge';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';

function NewShipmentDialog() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: buyers } = useMasterData('buyer');
  const [open, setOpen] = useState(false);
  const [buyerId, setBuyerId] = useState('');
  const [country, setCountry] = useState('');
  const [courier, setCourier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onBuyerChange = (id: string) => {
    setBuyerId(id);
    const buyer = (buyers ?? []).find((b: any) => b.id === id) as any;
    if (buyer?.country && !country) setCountry(buyer.country);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const shipment = await api.post<any>('/exports', {
        buyerId,
        country,
        courier: courier || undefined,
        invoiceNumber: invoiceNumber || undefined,
      });
      toast.success(`Shipment ${shipment.shipmentCode} created`);
      queryClient.invalidateQueries({ queryKey: ['exports'] });
      setOpen(false);
      router.push(`/exports/${shipment.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus /> New Shipment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Export Shipment</DialogTitle>
          <DialogDescription>Create the consignment, then add stones and documents.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Buyer *</Label>
            <Select value={buyerId} onValueChange={onBuyerChange}>
              <SelectTrigger><SelectValue placeholder="Select buyer" /></SelectTrigger>
              <SelectContent>
                {(buyers ?? []).map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}{b.company ? ` — ${b.company}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Country *</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Germany" />
            </div>
            <div className="space-y-1.5">
              <Label>Courier</Label>
              <Input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="DHL / FedEx" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Invoice Number</Label>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-2026-…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!buyerId || !country.trim()} loading={submitting}>Create Shipment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LocalSaleDialog() {
  const queryClient = useQueryClient();
  const { data: buyers } = useMasterData('buyer');
  const [open, setOpen] = useState(false);
  const [stoneId, setStoneId] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [salePrice, setSalePrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: stones } = useQuery({
    queryKey: ['stones', 'sale-eligible'],
    queryFn: () => api.get<Paginated<any>>('/stones', { limit: 100 }),
    enabled: open,
  });

  const submit = async () => {
    setSubmitting(true);
    try {
      const sale = await api.post<any>('/exports/local-sale', {
        stoneId,
        buyerId: buyerId || undefined,
        saleDate,
        salePrice: Number(salePrice),
      });
      toast.success(`Sold — net profit ${money(sale.netProfit)}`);
      queryClient.invalidateQueries({ queryKey: ['stones'] });
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
        <Button variant="secondary"><HandCoins /> Local Sale</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Local Sale</DialogTitle>
          <DialogDescription>Sells a stone outside an export shipment and freezes its profit.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Stone *</Label>
            <Select value={stoneId} onValueChange={setStoneId}>
              <SelectTrigger><SelectValue placeholder="Select stone" /></SelectTrigger>
              <SelectContent>
                {(stones?.data ?? []).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.code} — {s.gemType?.name} ({carats(s.weightCt)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Buyer</Label>
            <Select value={buyerId} onValueChange={setBuyerId}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                {(buyers ?? []).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Sale Date *</Label>
              <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Sale Price (LKR) *</Label>
              <Input type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!stoneId || !(Number(salePrice) > 0)} loading={submitting}>Record Sale</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ExportsPage() {
  const { hasRole } = useAuth();
  const router = useRouter();
  const canManage = hasRole('MANAGER', 'FINANCE_OFFICER');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['exports', page],
    queryFn: () => api.get<Paginated<any>>('/exports', { page, limit: 20 }),
  });

  return (
    <div>
      <PageHeader
        title="Exports & Sales"
        description="Consignments, buyers, invoices and local sales."
        actions={canManage && (
          <>
            <LocalSaleDialog />
            <NewShipmentDialog />
          </>
        )}
      />
      <Card>
        {isLoading ? (
          <CardContent className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </CardContent>
        ) : (data?.data ?? []).length === 0 ? (
          <CardContent className="p-6">
            <EmptyState icon={Plane} title="No shipments" description="Create a shipment to start exporting stones." />
          </CardContent>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Stones</TableHead>
                  <TableHead>Export Date</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.data.map((s: any) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => router.push(`/exports/${s.id}`)}>
                    <TableCell className="font-mono font-semibold text-primary">{s.shipmentCode}</TableCell>
                    <TableCell>
                      <div className="font-medium">{s.buyer?.name}</div>
                      {s.buyer?.company && <div className="text-xs text-muted-foreground">{s.buyer.company}</div>}
                    </TableCell>
                    <TableCell>{s.country}</TableCell>
                    <TableCell>{s.items?.length ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(s.exportDate)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{s.trackingNumber ?? '—'}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{money(s.exportValue, true)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4">
              <Pagination meta={data!.meta} onPageChange={setPage} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
