'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Flame, Plus, Zap } from 'lucide-react';
import { api, Paginated } from '@/lib/api';
import { carats } from '@/lib/format';
import { useMasterData } from '@/lib/hooks';
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

/** Multi-select of eligible stones (in-stock, searchable). */
function StonePicker({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const [search, setSearch] = useState('');
  const { data } = useQuery({
    queryKey: ['stones', 'picker', search],
    queryFn: () => api.get<Paginated<any>>('/stones', { limit: 30, search: search || undefined }),
  });

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-2">
      <Input placeholder="Search stones by code or gem type…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
        {(data?.data ?? []).map((s: any) => (
          <label key={s.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={selected.includes(s.id)}
              onChange={() => toggle(s.id)}
            />
            <span className="font-mono font-semibold text-primary">{s.code}</span>
            <span className="flex-1 truncate">{s.gemType?.name}</span>
            <span className="text-xs text-muted-foreground">{carats(s.weightCt)}</span>
          </label>
        ))}
        {(data?.data ?? []).length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">No matching stones</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{selected.length} stone(s) selected</p>
    </div>
  );
}

export function CreateBatchDialog() {
  const queryClient = useQueryClient();
  const { data: machines } = useMasterData('machine');
  const [open, setOpen] = useState(false);
  const [machineId, setMachineId] = useState('');
  const [temperatureC, setTemperatureC] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [expectedEndAt, setExpectedEndAt] = useState('');
  const [remarks, setRemarks] = useState('');
  const [stoneIds, setStoneIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const gasMachines = (machines ?? []).filter((m: any) => m.type === 'GAS');

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post('/treatments/batches', {
        type: 'GAS',
        machineId,
        temperatureC: temperatureC ? Number(temperatureC) : undefined,
        durationHours: durationHours ? Number(durationHours) : undefined,
        expectedEndAt: expectedEndAt || undefined,
        remarks: remarks || undefined,
        stoneIds,
      });
      toast.success('Batch created');
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      setOpen(false);
      setStoneIds([]);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to create batch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus /> New Gas Batch</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-warning" /> New Gas Heat Batch</DialogTitle>
          <DialogDescription>Group stones into a furnace run. The batch gets an auto code (HT-YYYY-###).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Machine *</Label>
            <Select value={machineId} onValueChange={setMachineId}>
              <SelectTrigger><SelectValue placeholder="Select furnace" /></SelectTrigger>
              <SelectContent>
                {gasMachines.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.name} (max {m.maxTempC ?? '—'}°C)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Temperature (°C)</Label>
            <Input type="number" value={temperatureC} onChange={(e) => setTemperatureC(e.target.value)} placeholder="1750" />
          </div>
          <div className="space-y-1.5">
            <Label>Duration (hours)</Label>
            <Input type="number" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} placeholder="6" />
          </div>
          <div className="space-y-1.5">
            <Label>Expected Finish</Label>
            <Input type="datetime-local" value={expectedEndAt} onChange={(e) => setExpectedEndAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-2 block">Stones in this batch *</Label>
            <StonePicker selected={stoneIds} onChange={setStoneIds} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!machineId || stoneIds.length === 0} loading={submitting}>
            Create Batch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreateElectricDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [stoneIds, setStoneIds] = useState<string[]>([]);
  const [plannedWeeks, setPlannedWeeks] = useState('8');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      for (const stoneId of stoneIds) {
        await api.post('/treatments/electric', {
          stoneId,
          plannedWeeks: Number(plannedWeeks),
          startDate,
        });
      }
      toast.success(`Electric treatment started for ${stoneIds.length} stone(s)`);
      queryClient.invalidateQueries({ queryKey: ['electric'] });
      setOpen(false);
      setStoneIds([]);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to start treatment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary"><Zap /> Start Electric Treatment</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-warning" /> Electric Treatment</DialogTitle>
          <DialogDescription>Week-based low-temperature treatment with progress logging.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Planned Weeks *</Label>
              <Input type="number" min={1} max={104} value={plannedWeeks} onChange={(e) => setPlannedWeeks(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Stones *</Label>
            <StonePicker selected={stoneIds} onChange={setStoneIds} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={stoneIds.length === 0 || !(Number(plannedWeeks) > 0)} loading={submitting}>
            Start Treatment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
