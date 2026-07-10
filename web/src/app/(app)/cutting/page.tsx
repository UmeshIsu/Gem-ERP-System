'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Scissors } from 'lucide-react';
import { api, Paginated } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { money, carats, formatDate } from '@/lib/format';
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
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';

function NewCuttingDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [stoneId, setStoneId] = useState('');
  const [cuttingDate, setCuttingDate] = useState(new Date().toISOString().slice(0, 10));
  const [cutterName, setCutterName] = useState('');
  const [weightBeforeCt, setWeightBeforeCt] = useState('');
  const [weightAfterCt, setWeightAfterCt] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: stones } = useQuery({
    queryKey: ['stones', 'cutting-eligible'],
    queryFn: () => api.get<Paginated<any>>('/stones', { limit: 100 }),
    enabled: open,
  });

  const selected = stones?.data.find((s: any) => s.id === stoneId);
  const before = Number(weightBeforeCt) || Number(selected?.weightCt) || 0;
  const after = Number(weightAfterCt) || 0;
  const lossPct = before > 0 && after > 0 && after < before ? (((before - after) / before) * 100).toFixed(2) : null;

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post('/cutting', {
        stoneId,
        cuttingDate,
        cutterName,
        weightBeforeCt: before,
        weightAfterCt: after,
        cost: Number(cost) || 0,
        notes: notes || undefined,
      });
      toast.success('Cutting recorded');
      queryClient.invalidateQueries({ queryKey: ['cutting'] });
      queryClient.invalidateQueries({ queryKey: ['stones'] });
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to record cutting');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus /> Record Cutting</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Record Cutting</DialogTitle>
          <DialogDescription>
            Updates the stone weight, computes loss % and books the cost under the Cutting expense category.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Stone *</Label>
            <Select value={stoneId} onValueChange={(v) => { setStoneId(v); const s = stones?.data.find((x: any) => x.id === v); if (s) setWeightBeforeCt(String(s.weightCt)); }}>
              <SelectTrigger><SelectValue placeholder="Select stone" /></SelectTrigger>
              <SelectContent>
                {(stones?.data ?? []).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.code} — {s.gemType?.name} ({carats(s.weightCt)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cutting Date *</Label>
            <Input type="date" value={cuttingDate} onChange={(e) => setCuttingDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Cutter *</Label>
            <Input value={cutterName} onChange={(e) => setCutterName(e.target.value)} placeholder="Cutter name" />
          </div>
          <div className="space-y-1.5">
            <Label>Weight Before (ct) *</Label>
            <Input type="number" step="0.001" value={weightBeforeCt} onChange={(e) => setWeightBeforeCt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Weight After (ct) *</Label>
            <Input type="number" step="0.001" value={weightAfterCt} onChange={(e) => setWeightAfterCt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Cost (LKR)</Label>
            <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Loss</Label>
            <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-semibold">
              {lossPct != null ? `−${lossPct}%` : '—'}
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!stoneId || !cutterName || !(after > 0) || !(after < before)} loading={submitting}>
            Save Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CuttingPage() {
  const { hasRole } = useAuth();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['cutting', page],
    queryFn: () => api.get<Paginated<any>>('/cutting', { page, limit: 20 }),
  });

  return (
    <div>
      <PageHeader
        title="Cutting Management"
        description="Weight loss, cutters and cost for every cutting operation."
        actions={hasRole('MANAGER', 'INVENTORY_OFFICER') && <NewCuttingDialog />}
      />
      <Card>
        {isLoading ? (
          <CardContent className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </CardContent>
        ) : (data?.data ?? []).length === 0 ? (
          <CardContent className="p-6">
            <EmptyState icon={Scissors} title="No cutting records" description="Record a cutting to track weight loss and costs." />
          </CardContent>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stone</TableHead>
                  <TableHead>Gem Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Cutter</TableHead>
                  <TableHead className="text-right">Before</TableHead>
                  <TableHead className="text-right">After</TableHead>
                  <TableHead className="text-right">Loss</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.data.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/inventory/${c.stone.id}`} className="font-mono font-semibold text-primary hover:underline">
                        {c.stone.code}
                      </Link>
                    </TableCell>
                    <TableCell>{c.stone.gemType?.name}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.cuttingDate)}</TableCell>
                    <TableCell>{c.cutterName}</TableCell>
                    <TableCell className="text-right tabular-nums">{carats(c.weightBeforeCt)}</TableCell>
                    <TableCell className="text-right tabular-nums">{carats(c.weightAfterCt)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-warning">−{Number(c.lossPct)}%</TableCell>
                    <TableCell className="text-right tabular-nums">{money(c.cost)}</TableCell>
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
