'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Split, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { money, carats } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ChildRow {
  weightCt: string;
  dimensions: string;
  color: string;
  allocatedCost: string;
  notes: string;
}

const emptyChild = (): ChildRow => ({ weightCt: '', dimensions: '', color: '', allocatedCost: '', notes: '' });

export function SplitDialog({ stone }: { stone: { id: string; code: string; weightCt: string; purchaseCost: string } }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [allocation, setAllocation] = useState<'BY_WEIGHT' | 'MANUAL'>('BY_WEIGHT');
  const [children, setChildren] = useState<ChildRow[]>([emptyChild(), emptyChild()]);
  const [submitting, setSubmitting] = useState(false);

  const parentCost = Number(stone.purchaseCost);
  const totalWeight = children.reduce((s, c) => s + (Number(c.weightCt) || 0), 0);
  const manualTotal = children.reduce((s, c) => s + (Number(c.allocatedCost) || 0), 0);

  const setChild = (i: number, key: keyof ChildRow, value: string) => {
    setChildren((prev) => prev.map((c, idx) => (idx === i ? { ...c, [key]: value } : c)));
  };

  const previewCost = (c: ChildRow): number | null => {
    if (allocation === 'MANUAL') return Number(c.allocatedCost) || 0;
    const w = Number(c.weightCt) || 0;
    if (totalWeight <= 0) return null;
    return (parentCost * w) / totalWeight;
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        allocation,
        children: children.map((c) => ({
          weightCt: Number(c.weightCt),
          dimensions: c.dimensions || undefined,
          color: c.color || undefined,
          notes: c.notes || undefined,
          ...(allocation === 'MANUAL' ? { allocatedCost: Number(c.allocatedCost) } : {}),
        })),
      };
      const result = await api.post<{ children: { code: string }[] }>(`/stones/${stone.id}/split`, payload);
      toast.success(`Split into ${result.children.map((c) => c.code).join(', ')}`);
      queryClient.invalidateQueries({ queryKey: ['stone', stone.id] });
      queryClient.invalidateQueries({ queryKey: ['stones'] });
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Split failed');
    } finally {
      setSubmitting(false);
    }
  };

  const valid =
    children.length >= 2 &&
    children.every((c) => Number(c.weightCt) > 0) &&
    (allocation === 'BY_WEIGHT' || Math.abs(manualTotal - parentCost) < 0.01);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Split /> Split Stone
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Split {stone.code}</DialogTitle>
          <DialogDescription>
            The parent stone ({carats(stone.weightCt)}, cost {money(parentCost)}) will be archived and each child
            continues its own lifecycle. The relationship is preserved forever.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="shrink-0">Cost Allocation</Label>
            <Select value={allocation} onValueChange={(v) => setAllocation(v as typeof allocation)}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BY_WEIGHT">Automatic — by weight</SelectItem>
                <SelectItem value="MANUAL">Manual allocation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {children.map((c, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold text-primary">
                    {stone.code}-{String.fromCharCode(65 + i)}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      Allocated: <span className="font-semibold text-foreground">{previewCost(c) != null ? money(previewCost(c)) : '—'}</span>
                    </span>
                    {children.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setChildren((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-4">
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="Weight (ct) *"
                    value={c.weightCt}
                    onChange={(e) => setChild(i, 'weightCt', e.target.value)}
                  />
                  <Input placeholder="Dimensions" value={c.dimensions} onChange={(e) => setChild(i, 'dimensions', e.target.value)} />
                  <Input placeholder="Color" value={c.color} onChange={(e) => setChild(i, 'color', e.target.value)} />
                  {allocation === 'MANUAL' ? (
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Cost (LKR) *"
                      value={c.allocatedCost}
                      onChange={(e) => setChild(i, 'allocatedCost', e.target.value)}
                    />
                  ) : (
                    <Input placeholder="Notes" value={c.notes} onChange={(e) => setChild(i, 'notes', e.target.value)} />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={children.length >= 26}
              onClick={() => setChildren((prev) => [...prev, emptyChild()])}
            >
              <Plus /> Add child
            </Button>
            <div className="text-sm text-muted-foreground">
              Total weight: <span className="font-semibold text-foreground">{totalWeight.toFixed(3)} ct</span>
              {allocation === 'MANUAL' && (
                <>
                  {' · '}Allocated:{' '}
                  <span className={Math.abs(manualTotal - parentCost) < 0.01 ? 'font-semibold text-success' : 'font-semibold text-destructive'}>
                    {money(manualTotal)} / {money(parentCost)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!valid} loading={submitting}>
            <Split /> Split into {children.length} stones
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
