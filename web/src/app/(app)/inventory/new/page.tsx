'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { STONE_KINDS, STAGE_LABELS } from '@/lib/constants';
import { titleCase } from '@/lib/format';
import { useMasterData, useWorkflowTemplates } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/shared/page-header';

const schema = z.object({
  gemTypeId: z.string().uuid('Select a gem type'),
  purchaseLocationId: z.string().uuid('Select a purchase location'),
  sellerId: z.string().optional(),
  workflowTemplateId: z.string().uuid('Select a workflow'),
  stoneKind: z.enum(['ROUGH', 'GEUDA', 'SEMI_TREATED', 'CUT', 'FACETED']),
  weightCt: z.coerce.number().positive('Weight must be positive'),
  shape: z.string().optional(),
  dimensions: z.string().optional(),
  color: z.string().optional(),
  clarity: z.string().optional(),
  origin: z.string().optional(),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  purchaseCost: z.coerce.number().min(0, 'Cost must be zero or more'),
  currentValue: z.coerce.number().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function NewStonePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [skipStages, setSkipStages] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  const { data: gemTypes } = useMasterData('gemType');
  const { data: locations } = useMasterData('purchaseLocation');
  const { data: sellers } = useMasterData('seller');
  const { data: templates } = useWorkflowTemplates();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      stoneKind: 'ROUGH',
      origin: 'Sri Lanka',
      purchaseDate: new Date().toISOString().slice(0, 10),
    },
  });

  const selectedTemplateId = watch('workflowTemplateId');
  const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId);
  const optionalStages = (selectedTemplate?.stages ?? []).filter((s) => s.isOptional);

  const toggleSkip = (kind: string, include: boolean) => {
    setSkipStages((prev) => (include ? prev.filter((k) => k !== kind) : [...prev, kind]));
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const stone = await api.post<any>('/stones', {
        ...values,
        sellerId: values.sellerId || undefined,
        currentValue: values.currentValue || undefined,
        skipStages,
      });

      // Upload purchase images (best-effort, after creation)
      for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        try {
          const uploaded = await api.upload<{ url: string; thumbUrl?: string }>('/uploads?folder=stones', form);
          await api.post(`/stones/${stone.id}/images`, { url: uploaded.url, thumbUrl: uploaded.thumbUrl, stage: 'PURCHASE' });
        } catch {
          toast.warning(`Could not upload ${file.name}`);
        }
      }

      toast.success(`Stone ${stone.code} registered`);
      router.push(`/inventory/${stone.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to create stone');
      setSubmitting(false);
    }
  };

  const field = (label: string, name: keyof FormValues, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} {...props} {...register(name)} />
      {errors[name] && <p className="text-xs text-destructive">{String(errors[name]?.message)}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Register New Stone" description="Record a purchase and choose the processing workflow." />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Stone Details</CardTitle>
            <CardDescription>Physical characteristics of the stone.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Gem Type *</Label>
              <Select onValueChange={(v) => setValue('gemTypeId', v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select gem type" /></SelectTrigger>
                <SelectContent>
                  {(gemTypes ?? []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.gemTypeId && <p className="text-xs text-destructive">{errors.gemTypeId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Stone Kind *</Label>
              <Select defaultValue="ROUGH" onValueChange={(v) => setValue('stoneKind', v as FormValues['stoneKind'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STONE_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>{titleCase(k)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {field('Weight (carats) *', 'weightCt', { type: 'number', step: '0.001', placeholder: '12.345' })}
            {field('Shape', 'shape', { placeholder: 'Rough / Oval / Cushion' })}
            {field('Dimensions', 'dimensions', { placeholder: '12.4 × 9.1 × 6.2 mm' })}
            {field('Color', 'color', { placeholder: 'Royal Blue' })}
            {field('Clarity', 'clarity', { placeholder: 'VS / SI' })}
            {field('Origin', 'origin')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Information</CardTitle>
            <CardDescription>Where, when and from whom the stone was bought.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Purchase Location *</Label>
              <Select onValueChange={(v) => setValue('purchaseLocationId', v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  {(locations ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.purchaseLocationId && <p className="text-xs text-destructive">{errors.purchaseLocationId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Seller</Label>
              <Select onValueChange={(v) => setValue('sellerId', v)}>
                <SelectTrigger><SelectValue placeholder="Select seller (optional)" /></SelectTrigger>
                <SelectContent>
                  {(sellers ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {field('Purchase Date *', 'purchaseDate', { type: 'date' })}
            {field('Purchase Price (LKR) *', 'purchaseCost', { type: 'number', step: '0.01', placeholder: '850000' })}
            {field('Estimated Current Value (LKR)', 'currentValue', { type: 'number', step: '0.01', placeholder: 'Defaults to purchase price' })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Processing Workflow</CardTitle>
            <CardDescription>
              Not every stone follows the same lifecycle — pick the workflow, then switch off any optional stages this
              stone will skip. Skipped stages stay visible on the timeline as “Not Applicable”.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {(templates ?? []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setValue('workflowTemplateId', t.id, { shouldValidate: true });
                    setSkipStages([]);
                  }}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    selectedTemplateId === t.id
                      ? 'border-primary bg-accent ring-1 ring-primary'
                      : 'hover:border-primary/40 hover:bg-accent/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                      {t.code}
                    </span>
                    <span className="text-sm font-semibold">{t.name}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{t.description}</p>
                </button>
              ))}
            </div>
            {errors.workflowTemplateId && <p className="text-xs text-destructive">{errors.workflowTemplateId.message}</p>}

            {optionalStages.length > 0 && (
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="mb-3 text-sm font-medium">Optional stages for this stone</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {optionalStages.map((s) => {
                    const included = !skipStages.includes(s.kind);
                    return (
                      <div key={s.kind} className="flex items-center justify-between rounded-md bg-card px-3 py-2.5 shadow-sm">
                        <span className="text-sm">
                          {STAGE_LABELS[s.kind]}
                          {s.kind === 'SPLITTING' && (
                            <span className="block text-xs text-muted-foreground">Will this stone be split?</span>
                          )}
                        </span>
                        <Switch checked={included} onCheckedChange={(v) => toggleSkip(s.kind, v)} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Images</CardTitle>
            <CardDescription>Photos taken at the time of purchase. More can be added at every stage later.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {files.map((f, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(f)} alt={f.name} className="h-24 w-24 rounded-lg border object-cover" />
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                <ImagePlus className="h-5 w-5" />
                <span className="text-[10px] font-medium">Add photos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
                />
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea rows={3} placeholder="Any remarks about this stone…" {...register('notes')} />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            Register Stone
          </Button>
        </div>
      </form>
    </div>
  );
}
