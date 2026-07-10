'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Award, FileUp, Plus } from 'lucide-react';
import { api, Paginated } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { carats, formatDate } from '@/lib/format';
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

function NewCertDialog() {
  const queryClient = useQueryClient();
  const { data: labs } = useMasterData('laboratory');
  const [open, setOpen] = useState(false);
  const [stoneId, setStoneId] = useState('');
  const [laboratoryId, setLaboratoryId] = useState('');
  const [cost, setCost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: stones } = useQuery({
    queryKey: ['stones', 'cert-eligible'],
    queryFn: () => api.get<Paginated<any>>('/stones', { limit: 100 }),
    enabled: open,
  });

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post('/certifications', {
        stoneId,
        laboratoryId,
        cost: cost ? Number(cost) : undefined,
      });
      toast.success('Sent to lab for certification');
      queryClient.invalidateQueries({ queryKey: ['certifications'] });
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
        <Button><Plus /> Send to Lab</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Stone for Certification</DialogTitle>
          <DialogDescription>Creates a pending certificate and books the cost.</DialogDescription>
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
            <Label>Laboratory *</Label>
            <Select value={laboratoryId} onValueChange={setLaboratoryId}>
              <SelectTrigger><SelectValue placeholder="Select laboratory" /></SelectTrigger>
              <SelectContent>
                {(labs ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Certification Cost (LKR)</Label>
            <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!stoneId || !laboratoryId} loading={submitting}>Send to Lab</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IssueCertDialog({ cert }: { cert: any }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [certificateNumber, setCertificateNumber] = useState(cert.certificateNumber ?? '');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [uploading, setUploading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(cert.pdfUrl ?? '');
  const [submitting, setSubmitting] = useState(false);

  const uploadPdf = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const uploaded = await api.upload<{ url: string }>('/uploads?folder=certificates', form);
      setPdfUrl(uploaded.url);
      toast.success('Certificate PDF uploaded');
    } catch (e: any) {
      toast.error(e?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/certifications/${cert.id}`, {
        certificateNumber: certificateNumber || undefined,
        issueDate,
        pdfUrl: pdfUrl || undefined,
        status: 'ISSUED',
      });
      toast.success('Certificate issued');
      queryClient.invalidateQueries({ queryKey: ['certifications'] });
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
        <Button size="sm" variant="outline">Mark Issued</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue Certificate — {cert.stone?.code}</DialogTitle>
          <DialogDescription>{cert.laboratory?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Certificate Number *</Label>
            <Input value={certificateNumber} onChange={(e) => setCertificateNumber(e.target.value)} placeholder="e.g. GRS2026-054321" />
          </div>
          <div className="space-y-1.5">
            <Label>Issue Date</Label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Certificate PDF</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <FileUp className="h-4 w-4" />
              {uploading ? 'Uploading…' : pdfUrl ? 'Replace PDF' : 'Upload PDF'}
              <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => uploadPdf(e.target.files?.[0])} />
            </label>
            {pdfUrl && <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View uploaded file</a>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!certificateNumber} loading={submitting}>Issue Certificate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CertificationsPage() {
  const { hasRole } = useAuth();
  const [page, setPage] = useState(1);
  const canManage = hasRole('MANAGER', 'INVENTORY_OFFICER');

  const { data, isLoading } = useQuery({
    queryKey: ['certifications', page],
    queryFn: () => api.get<Paginated<any>>('/certifications', { page, limit: 20 }),
  });

  return (
    <div>
      <PageHeader
        title="Certification"
        description="Laboratory certificates for every stone."
        actions={canManage && <NewCertDialog />}
      />
      <Card>
        {isLoading ? (
          <CardContent className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </CardContent>
        ) : (data?.data ?? []).length === 0 ? (
          <CardContent className="p-6">
            <EmptyState icon={Award} title="No certificates" description="Send a stone to a laboratory to begin certification." />
          </CardContent>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stone</TableHead>
                  <TableHead>Laboratory</TableHead>
                  <TableHead>Certificate #</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>PDF</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.data.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/inventory/${c.stone.id}`} className="font-mono font-semibold text-primary hover:underline">
                        {c.stone.code}
                      </Link>
                      <div className="text-xs text-muted-foreground">{c.stone.gemType?.name}</div>
                    </TableCell>
                    <TableCell>{c.laboratory?.name}</TableCell>
                    <TableCell className="font-mono text-sm">{c.certificateNumber ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.issueDate)}</TableCell>
                    <TableCell>
                      {c.pdfUrl ? (
                        <a href={c.pdfUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">View</a>
                      ) : '—'}
                    </TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="text-right">
                      {canManage && ['PENDING', 'SENT_TO_LAB'].includes(c.status) && <IssueCertDialog cert={c} />}
                    </TableCell>
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
