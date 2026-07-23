'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Database, Download, Pencil, Plus, Power, RotateCcw, Users } from 'lucide-react';
import { api, Paginated } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCompany } from '@/lib/hooks';
import { formatDate, titleCase } from '@/lib/format';
import { ROLES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/page-header';

/** Field definitions per master-data entity. */
const ENTITIES: Record<string, { label: string; fields: { key: string; label: string; type?: string }[] }> = {
  gemType: {
    label: 'Gem Types',
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'species', label: 'Species' },
      { key: 'variety', label: 'Variety' },
      { key: 'colorHint', label: 'Color Hint' },
    ],
  },
  purchaseLocation: {
    label: 'Purchase Locations',
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'district', label: 'District' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  seller: {
    label: 'Sellers',
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'nicNumber', label: 'NIC Number' },
      { key: 'address', label: 'Address' },
    ],
  },
  buyer: {
    label: 'Buyers',
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'company', label: 'Company' },
      { key: 'country', label: 'Country' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
    ],
  },
  machine: {
    label: 'Machines',
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'type', label: 'Type (GAS or ELECTRIC)' },
      { key: 'maxTempC', label: 'Max Temp (°C)', type: 'number' },
      { key: 'location', label: 'Location' },
    ],
  },
  laboratory: {
    label: 'Laboratories',
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'country', label: 'Country' },
      { key: 'website', label: 'Website' },
      { key: 'contact', label: 'Contact' },
    ],
  },
};

function EntityDialog({ entity, item, onDone }: { entity: string; item?: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(ENTITIES[entity].fields.map((f) => [f.key, item?.[f.key] != null ? String(item[f.key]) : ''])),
  );
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of ENTITIES[entity].fields) {
        const v = values[f.key]?.trim();
        if (v) payload[f.key] = f.type === 'number' ? Number(v) : v;
      }
      if (item) {
        await api.patch(`/settings/master/${entity}/${item.id}`, payload);
        toast.success('Updated');
      } else {
        await api.post(`/settings/master/${entity}`, payload);
        toast.success('Created');
      }
      onDone();
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
        {item ? (
          <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
        ) : (
          <Button size="sm"><Plus /> Add</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Edit' : 'New'} — {ENTITIES[entity].label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {ENTITIES[entity].fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}{f.key === 'name' ? ' *' : ''}</Label>
              <Input
                type={f.type ?? 'text'}
                value={values[f.key]}
                onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!values.name?.trim()} loading={submitting}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MasterDataTab({ entity }: { entity: string }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['master', entity, 'all'],
    queryFn: () => api.get<any[]>(`/settings/master/${entity}`, { includeInactive: 'true' }),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['master', entity] });
    queryClient.invalidateQueries({ queryKey: ['master', entity, 'all'] });
  };

  const deactivate = async (id: string) => {
    try {
      await api.delete(`/settings/master/${entity}/${id}`);
      toast.success('Deactivated — historical records are preserved');
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    }
  };

  const reactivate = async (id: string) => {
    try {
      await api.post(`/settings/master/${entity}/${id}/reactivate`);
      toast.success('Reactivated');
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    }
  };

  const fields = ENTITIES[entity].fields;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>{ENTITIES[entity].label}</CardTitle>
          <CardDescription>Master data is deactivated, never deleted — history stays intact.</CardDescription>
        </div>
        <EntityDialog entity={entity} onDone={refresh} />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {fields.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((item: any) => (
              <TableRow key={item.id} className={!item.isActive ? 'opacity-50' : ''}>
                {fields.map((f) => (
                  <TableCell key={f.key} className={f.key === 'name' ? 'font-medium' : 'text-muted-foreground'}>
                    {item[f.key] ?? '—'}
                  </TableCell>
                ))}
                <TableCell>
                  <Badge variant={item.isActive ? 'success' : 'outline'}>{item.isActive ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <EntityDialog entity={entity} item={item} onDone={refresh} />
                    {item.isActive ? (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" title="Deactivate" onClick={() => deactivate(item.id)}>
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" title="Reactivate" onClick={() => reactivate(item.id)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function UserDialog({ user, onDone }: { user?: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(user?.email ?? '');
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [role, setRole] = useState(user?.role ?? 'VIEWER');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      if (user) {
        await api.patch(`/users/${user.id}`, { fullName, role, ...(password ? { password } : {}) });
        toast.success('User updated');
      } else {
        await api.post('/users', { email, fullName, role, password });
        toast.success('User created');
      }
      onDone();
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
        {user ? (
          <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
        ) : (
          <Button size="sm"><Plus /> Add User</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? `Edit ${user.fullName}` : 'New User'}</DialogTitle>
          <DialogDescription>Each role carries its own permissions across all modules.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!user && (
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{titleCase(r)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{user ? 'New Password (leave blank to keep)' : 'Password *'}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={!fullName.trim() || (!user && (!email.trim() || password.length < 8))}
            loading={submitting}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UsersTab() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<Paginated<any>>('/users', { limit: 100 }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const deactivate = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deactivated');
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    }
  };

  const reactivate = async (id: string) => {
    try {
      await api.post(`/users/${id}/reactivate`);
      toast.success('User reactivated');
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Users & Roles</CardTitle>
          <CardDescription>Deactivated users keep their audit history forever.</CardDescription>
        </div>
        <UserDialog onDone={refresh} />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.data ?? []).map((u: any) => (
              <TableRow key={u.id} className={!u.isActive ? 'opacity-50' : ''}>
                <TableCell className="font-medium">{u.fullName}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell><Badge variant="secondary">{titleCase(u.role)}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? 'success' : 'outline'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <UserDialog user={u} onDone={refresh} />
                    {u.isActive ? (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" title="Deactivate" onClick={() => deactivate(u.id)}>
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" title="Reactivate" onClick={() => reactivate(u.id)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function BackupTab() {
  const [downloading, setDownloading] = useState(false);

  const backup = async () => {
    setDownloading(true);
    try {
      const data = await api.get<any>('/settings/backup');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aura-gem-erp-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded');
    } catch (e: any) {
      toast.error(e?.message ?? 'Backup failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup & Restore</CardTitle>
        <CardDescription>
          Download a complete JSON snapshot of every table. For production restores use PostgreSQL point-in-time
          recovery or <code className="rounded bg-muted px-1">pg_restore</code>; this snapshot is your portable safety net.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={backup} loading={downloading}>
          <Download /> Download Full Backup
        </Button>
      </CardContent>
    </Card>
  );
}

function CompanyTab() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const value = (key: string) => form[key] ?? (company as any)?.[key] ?? '';
  const set = (key: string, v: string) => setForm((p) => ({ ...p, [key]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/company', {
        companyName: value('companyName'),
        legalName: value('legalName') || undefined,
        ownerName: value('ownerName') || undefined,
        email: value('email') || undefined,
        phone: value('phone') || undefined,
        address: value('address') || undefined,
        currency: value('currency') || undefined,
      });
      toast.success('Company profile updated');
      queryClient.invalidateQueries({ queryKey: ['company'] });
      setForm({});
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: string; label: string; full?: boolean }[] = [
    { key: 'companyName', label: 'Company Name' },
    { key: 'legalName', label: 'Legal / Registered Name' },
    { key: 'ownerName', label: 'Owner Name' },
    { key: 'currency', label: 'Currency Code' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address', full: true },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Profile</CardTitle>
        <CardDescription>
          This is the business this system belongs to. The name appears on the login screen and sidebar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className={`space-y-1.5 ${f.full ? 'sm:col-span-2' : ''}`}>
              <Label>{f.label}{f.key === 'companyName' ? ' *' : ''}</Label>
              <Input value={value(f.key)} onChange={(e) => set(f.key, e.target.value)} />
            </div>
          ))}
        </div>
        <Button onClick={save} disabled={!value('companyName').trim()} loading={saving}>Save Changes</Button>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { hasRole } = useAuth();

  if (!hasRole()) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          Settings are available to owners and administrators only.
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader title="Settings" description="Master data, users, workflows and backups." />
      <Tabs defaultValue="company">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="company"><Building2 className="mr-1.5 h-4 w-4" /> Company</TabsTrigger>
          {Object.entries(ENTITIES).map(([key, e]) => (
            <TabsTrigger key={key} value={key}>{e.label}</TabsTrigger>
          ))}
          <TabsTrigger value="users"><Users className="mr-1.5 h-4 w-4" /> Users</TabsTrigger>
          <TabsTrigger value="backup"><Database className="mr-1.5 h-4 w-4" /> Backup</TabsTrigger>
        </TabsList>
        <TabsContent value="company"><CompanyTab /></TabsContent>
        {Object.keys(ENTITIES).map((key) => (
          <TabsContent key={key} value={key}>
            <MasterDataTab entity={key} />
          </TabsContent>
        ))}
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="backup"><BackupTab /></TabsContent>
      </Tabs>
    </div>
  );
}
