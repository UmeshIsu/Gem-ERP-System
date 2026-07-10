'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { api, Paginated } from '@/lib/api';
import { formatDateTime, titleCase } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';

const ALL = '__all__';
const ENTITY_OPTIONS = [
  'Stone', 'TreatmentBatch', 'ElectricTreatment', 'CuttingRecord', 'Certification',
  'ExportShipment', 'StoneExpense', 'CompanyExpense', 'ExpenseCategory', 'User',
  'GemType', 'PurchaseLocation', 'Seller', 'Buyer', 'Machine', 'Laboratory', 'WorkflowTemplate',
];

const ACTION_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'destructive' | 'secondary'> = {
  CREATE: 'success',
  UPDATE: 'info',
  STATUS_CHANGE: 'warning',
  SPLIT: 'warning',
  DELETE: 'destructive',
  DEACTIVATE: 'destructive',
  LOGIN: 'secondary',
};

function DiffView({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState(ALL);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, entity, search],
    queryFn: () =>
      api.get<Paginated<any>>('/audit-logs', {
        page,
        limit: 30,
        entity: entity === ALL ? undefined : entity,
        search: search || undefined,
      }),
  });

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Append-only record of every action: who, when, old value, new value, IP and browser. History is never deleted."
      />

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row">
          <form
            className="flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput);
              setPage(1);
            }}
          >
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search action, entity or record ID…"
            />
          </form>
          <Select value={entity} onValueChange={(v) => { setEntity(v); setPage(1); }}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All entities</SelectItem>
              {ENTITY_OPTIONS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        {isLoading ? (
          <CardContent className="space-y-2 p-4">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </CardContent>
        ) : (data?.data ?? []).length === 0 ? (
          <CardContent className="p-6">
            <EmptyState icon={ShieldCheck} title="No audit entries" description="Actions will appear here as users work in the system." />
          </CardContent>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="text-right">Changes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.data.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{log.user?.fullName ?? 'System'}</div>
                      {log.user && <div className="text-xs text-muted-foreground">{titleCase(log.user.role)}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ACTION_VARIANT[log.action] ?? 'secondary'}>{titleCase(log.action)}</Badge>
                    </TableCell>
                    <TableCell>{log.entity}</TableCell>
                    <TableCell className="max-w-[10rem] truncate font-mono text-xs text-muted-foreground">
                      {log.entityId ?? '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{log.ip ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {(log.before || log.after) && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className="text-sm text-primary hover:underline">View</button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{log.action} — {log.entity}</DialogTitle>
                              <DialogDescription>
                                {log.user?.fullName ?? 'System'} · {formatDateTime(log.createdAt)}
                                {log.userAgent ? ` · ${log.userAgent.slice(0, 80)}` : ''}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <DiffView label="Before" value={log.before} />
                              <DiffView label="After" value={log.after} />
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
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
