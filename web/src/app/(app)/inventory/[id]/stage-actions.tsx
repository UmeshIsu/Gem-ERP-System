'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Award, Check, Flame, Plane, Scissors, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { carats } from '@/lib/format';
import { useMasterData } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ACTIVE = ['PENDING', 'IN_PROGRESS'];

function useRefresh(stoneId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['stone', stoneId] });
    queryClient.invalidateQueries({ queryKey: ['stones'] });
  };
}

/** Shared dialog shell for a stage action. */
function ActionDialog({
  trigger,
  title,
  description,
  children,
  onSubmit,
  submitLabel,
  canSubmit = true,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit: () => Promise<void>;
  submitLabel: string;
  canSubmit?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    try {
      await onSubmit();
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4">{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!canSubmit} loading={submitting}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Simple stages: Inspection / Crack Removal / Polishing ──
function SimpleComplete({ stoneId, kind, label }: { stoneId: string; kind: string; label: string }) {
  const refresh = useRefresh(stoneId);
  const [note, setNote] = useState('');
  return (
    <ActionDialog
      trigger={<Button size="sm"><Check /> Complete</Button>}
      title={`Complete ${label}`}
      description="Marks this stage done on the stone's permanent timeline."
      submitLabel="Mark Complete"
      onSubmit={async () => {
        await api.post(`/workflow/stones/${stoneId}/complete-stage`, { kind, note: note || undefined });
        toast.success(`${label} completed`);
        refresh();
      }}
    >
      <div className="space-y-1.5">
        <Label>Note (optional)</Label>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Observations, findings…" />
      </div>
    </ActionDialog>
  );
}

// ── Gas heat: quick single-stone batch (create → start → complete) ──
function GasHeatAction({ stone }: { stone: any }) {
  const refresh = useRefresh(stone.id);
  const { data: machines } = useMasterData('machine');
  const gasMachines = (machines ?? []).filter((m: any) => m.type === 'GAS');
  const [machineId, setMachineId] = useState('');
  const [temperatureC, setTemperatureC] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [result, setResult] = useState('');
  const [weightAfterCt, setWeightAfterCt] = useState('');

  return (
    <ActionDialog
      trigger={<Button size="sm"><Flame /> Record Gas Heat</Button>}
      title={`Gas Heat — ${stone.code}`}
      description="Creates a heat batch for this stone and records the result in one step."
      submitLabel="Save Heat Result"
      canSubmit={!!machineId}
      onSubmit={async () => {
        const batch = await api.post<any>('/treatments/batches', {
          type: 'GAS',
          machineId,
          temperatureC: temperatureC ? Number(temperatureC) : undefined,
          durationHours: durationHours ? Number(durationHours) : undefined,
          stoneIds: [stone.id],
        });
        await api.post(`/treatments/batches/${batch.id}/start`);
        await api.post(`/treatments/batches/${batch.id}/complete`, {
          status: 'COMPLETED',
          results: [{ stoneId: stone.id, result: result || undefined, weightAfterCt: weightAfterCt ? Number(weightAfterCt) : undefined }],
        });
        toast.success('Gas heat recorded');
        refresh();
      }}
    >
      <div className="space-y-1.5">
        <Label>Machine *</Label>
        <Select value={machineId} onValueChange={setMachineId}>
          <SelectTrigger><SelectValue placeholder="Select furnace" /></SelectTrigger>
          <SelectContent>
            {gasMachines.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Temperature (°C)</Label><Input type="number" value={temperatureC} onChange={(e) => setTemperatureC(e.target.value)} placeholder="1750" /></div>
        <div className="space-y-1.5"><Label>Duration (h)</Label><Input type="number" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} placeholder="6" /></div>
      </div>
      <div className="space-y-1.5"><Label>Result</Label><Input value={result} onChange={(e) => setResult(e.target.value)} placeholder="e.g. Colour improved to vivid blue" /></div>
      <div className="space-y-1.5"><Label>Weight after (ct) — optional</Label><Input type="number" step="0.001" value={weightAfterCt} onChange={(e) => setWeightAfterCt(e.target.value)} placeholder={`was ${stone.weightCt}`} /></div>
      <p className="text-xs text-muted-foreground">Grouping several stones in one furnace run? Use the Heat Treatment page instead.</p>
    </ActionDialog>
  );
}

// ── Electric treatment ──
function ElectricAction({ stone }: { stone: any }) {
  const refresh = useRefresh(stone.id);
  const run = stone.electricRun;
  const running = run && ['RUNNING', 'PAUSED'].includes(run.status);
  const [plannedWeeks, setPlannedWeeks] = useState('8');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [pct, setPct] = useState('100');
  const [colour, setColour] = useState('');

  if (running) {
    return (
      <ActionDialog
        trigger={<Button size="sm" variant="success"><Zap /> Complete Electric</Button>}
        title={`Complete Electric Treatment — ${stone.code}`}
        description={`${run.completionPct}% logged so far. Log a final week and finish.`}
        submitLabel="Complete Treatment"
        onSubmit={async () => {
          await api.post(`/treatments/electric/${run.id}/progress`, {
            weekNumber: (run.logs?.length ?? 0) + 1,
            completionPct: Number(pct),
            colorImprovement: colour || undefined,
          });
          await api.patch(`/treatments/electric/${run.id}`, { status: 'COMPLETED' });
          toast.success('Electric treatment completed');
          refresh();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Final completion %</Label><Input type="number" min={0} max={100} value={pct} onChange={(e) => setPct(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>Colour improvement</Label><Input value={colour} onChange={(e) => setColour(e.target.value)} /></div>
      </ActionDialog>
    );
  }

  return (
    <ActionDialog
      trigger={<Button size="sm"><Zap /> Start Electric</Button>}
      title={`Start Electric Treatment — ${stone.code}`}
      description="Begins a week-based electric treatment run. Log weekly progress on the Heat Treatment page."
      submitLabel="Start Treatment"
      onSubmit={async () => {
        await api.post('/treatments/electric', { stoneId: stone.id, plannedWeeks: Number(plannedWeeks), startDate });
        toast.success('Electric treatment started');
        refresh();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Planned weeks *</Label><Input type="number" min={1} value={plannedWeeks} onChange={(e) => setPlannedWeeks(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Start date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
      </div>
    </ActionDialog>
  );
}

// ── Cutting ──
function CuttingAction({ stone }: { stone: any }) {
  const refresh = useRefresh(stone.id);
  const [cuttingDate, setCuttingDate] = useState(new Date().toISOString().slice(0, 10));
  const [cutterName, setCutterName] = useState('');
  const [weightAfterCt, setWeightAfterCt] = useState('');
  const [cost, setCost] = useState('');
  const before = Number(stone.weightCt);
  const after = Number(weightAfterCt) || 0;
  const lossPct = after > 0 && after < before ? (((before - after) / before) * 100).toFixed(2) : null;

  return (
    <ActionDialog
      trigger={<Button size="sm"><Scissors /> Record Cutting</Button>}
      title={`Record Cutting — ${stone.code}`}
      description="Updates the stone weight, computes loss %, and books the cutting cost."
      submitLabel="Save Cutting"
      canSubmit={!!cutterName && after > 0 && after < before}
      onSubmit={async () => {
        await api.post('/cutting', {
          stoneId: stone.id,
          cuttingDate,
          cutterName,
          weightBeforeCt: before,
          weightAfterCt: after,
          cost: Number(cost) || 0,
        });
        toast.success('Cutting recorded');
        refresh();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Cutting date *</Label><Input type="date" value={cuttingDate} onChange={(e) => setCuttingDate(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Cutter *</Label><Input value={cutterName} onChange={(e) => setCutterName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Weight before</Label><Input value={carats(stone.weightCt)} disabled /></div>
        <div className="space-y-1.5"><Label>Weight after (ct) *</Label><Input type="number" step="0.001" value={weightAfterCt} onChange={(e) => setWeightAfterCt(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Cost (LKR)</Label><Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Loss</Label><div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-semibold">{lossPct != null ? `−${lossPct}%` : '—'}</div></div>
      </div>
    </ActionDialog>
  );
}

// ── Certification: send to lab, or issue an existing one ──
function CertificationAction({ stone }: { stone: any }) {
  const refresh = useRefresh(stone.id);
  const { data: labs } = useMasterData('laboratory');
  const activeCert = (stone.certifications ?? []).find((c: any) => ['PENDING', 'SENT_TO_LAB'].includes(c.status));
  const [laboratoryId, setLaboratoryId] = useState('');
  const [cost, setCost] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));

  if (activeCert) {
    return (
      <ActionDialog
        trigger={<Button size="sm" variant="success"><Award /> Mark Issued</Button>}
        title={`Issue Certificate — ${stone.code}`}
        description={`${activeCert.laboratory?.name}. Completing this finishes the certification stage.`}
        submitLabel="Issue Certificate"
        canSubmit={!!certNumber}
        onSubmit={async () => {
          await api.patch(`/certifications/${activeCert.id}`, { certificateNumber: certNumber, issueDate, status: 'ISSUED' });
          toast.success('Certificate issued');
          refresh();
        }}
      >
        <div className="space-y-1.5"><Label>Certificate number *</Label><Input value={certNumber} onChange={(e) => setCertNumber(e.target.value)} placeholder="e.g. GRS2026-054321" /></div>
        <div className="space-y-1.5"><Label>Issue date</Label><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></div>
      </ActionDialog>
    );
  }

  return (
    <ActionDialog
      trigger={<Button size="sm"><Award /> Send to Lab</Button>}
      title={`Send to Lab — ${stone.code}`}
      description="Creates a pending certificate and books the cost."
      submitLabel="Send to Lab"
      canSubmit={!!laboratoryId}
      onSubmit={async () => {
        await api.post('/certifications', { stoneId: stone.id, laboratoryId, cost: cost ? Number(cost) : undefined });
        toast.success('Sent to lab');
        refresh();
      }}
    >
      <div className="space-y-1.5">
        <Label>Laboratory *</Label>
        <Select value={laboratoryId} onValueChange={setLaboratoryId}>
          <SelectTrigger><SelectValue placeholder="Select laboratory" /></SelectTrigger>
          <SelectContent>{(labs ?? []).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Cost (LKR)</Label><Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
    </ActionDialog>
  );
}

// ── Export / Sale: local sale inline, or link to shipments ──
function ExportSaleAction({ stone }: { stone: any }) {
  const refresh = useRefresh(stone.id);
  const { data: buyers } = useMasterData('buyer');
  const [buyerId, setBuyerId] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [salePrice, setSalePrice] = useState('');

  return (
    <div className="flex items-center gap-2">
      <ActionDialog
        trigger={<Button size="sm"><Check /> Record Sale</Button>}
        title={`Record Local Sale — ${stone.code}`}
        description="Sells this stone locally and freezes its profit. For an export shipment, use Exports & Sales."
        submitLabel="Record Sale"
        canSubmit={Number(salePrice) > 0}
        onSubmit={async () => {
          const sale = await api.post<any>('/exports/local-sale', { stoneId: stone.id, buyerId: buyerId || undefined, saleDate, salePrice: Number(salePrice) });
          toast.success(`Sold — net profit ${sale.netProfit != null ? `LKR ${Number(sale.netProfit).toLocaleString()}` : 'recorded'}`);
          refresh();
        }}
      >
        <div className="space-y-1.5">
          <Label>Buyer</Label>
          <Select value={buyerId} onValueChange={setBuyerId}>
            <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
            <SelectContent>{(buyers ?? []).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Sale date *</Label><Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Sale price (LKR) *</Label><Input type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} /></div>
        </div>
      </ActionDialog>
      <Button asChild size="sm" variant="outline">
        <Link href="/exports"><Plane /> Export Shipment</Link>
      </Button>
    </div>
  );
}

const SIMPLE_LABELS: Record<string, string> = {
  INSPECTION: 'Inspection',
  CRACK_REMOVAL: 'Crack Removal',
  POLISHING: 'Polishing',
};

/** Renders the right inline action(s) for a stone's stage, plus a "Mark N/A" option. */
export function StageActions({ stone, stage, canEdit }: { stone: any; stage: any; canEdit: boolean }) {
  const refresh = useRefresh(stone.id);
  if (!canEdit || !ACTIVE.includes(stage.status)) return null;

  const markNA = async () => {
    try {
      await api.post(`/workflow/stones/${stone.id}/applicability`, { kind: stage.kind, applicable: false });
      toast.success('Marked Not Applicable');
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    }
  };

  let action: ReactNode = null;
  if (SIMPLE_LABELS[stage.kind]) action = <SimpleComplete stoneId={stone.id} kind={stage.kind} label={SIMPLE_LABELS[stage.kind]} />;
  else if (stage.kind === 'GAS_HEAT') action = <GasHeatAction stone={stone} />;
  else if (stage.kind === 'ELECTRIC_TREATMENT') action = <ElectricAction stone={stone} />;
  else if (stage.kind === 'CUTTING') action = <CuttingAction stone={stone} />;
  else if (stage.kind === 'CERTIFICATION') action = <CertificationAction stone={stone} />;
  else if (stage.kind === 'EXPORT_SALE') action = <ExportSaleAction stone={stone} />;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {action}
      {stage.kind !== 'EXPORT_SALE' && (
        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={markNA}>
          Mark N/A
        </Button>
      )}
    </div>
  );
}
