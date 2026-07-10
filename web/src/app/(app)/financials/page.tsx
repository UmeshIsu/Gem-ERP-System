'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FolderPlus, Plus, Receipt, Wallet } from 'lucide-react';
import { api, Paginated } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { money, formatDate } from '@/lib/format';
import { useExpenseCategories } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';

const ALL = '__all__';

function NewCategoryDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post('/financials/categories', { name, description: description || undefined });
      toast.success(`Category "${name}" created`);
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      setOpen(false);
      setName('');
      setDescription('');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><FolderPlus /> New Category</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Expense Category</DialogTitle>
          <DialogDescription>Categories are unlimited and fully customizable.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Photography" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!name.trim()} loading={submitting}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewCompanyExpenseDialog() {
  const queryClient = useQueryClient();
  const { data: categories } = useExpenseCategories();
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [incurredAt, setIncurredAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post('/financials/company-expenses', {
        categoryId,
        amount: Number(amount),
        incurredAt,
        note: note || undefined,
      });
      toast.success('Overhead expense recorded');
      queryClient.invalidateQueries({ queryKey: ['company-expenses'] });
      setOpen(false);
      setAmount(''); setNote('');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus /> Company Expense</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Company Expense</DialogTitle>
          <DialogDescription>Overheads not tied to a specific stone (salaries, maintenance, fuel…).</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {(categories ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Amount (LKR) *</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={incurredAt} onChange={(e) => setIncurredAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!categoryId || !(Number(amount) > 0)} loading={submitting}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FinancialsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('MANAGER', 'FINANCE_OFFICER');
  const { data: categories } = useExpenseCategories();
  const [stonePage, setStonePage] = useState(1);
  const [companyPage, setCompanyPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState(ALL);

  const { data: stoneExpenses, isLoading: sLoading } = useQuery({
    queryKey: ['stone-expenses', stonePage, categoryFilter],
    queryFn: () => api.get<Paginated<any>>('/financials/expenses', {
      page: stonePage, limit: 25,
      categoryId: categoryFilter === ALL ? undefined : categoryFilter,
    }),
  });
  const { data: companyExpenses, isLoading: cLoading } = useQuery({
    queryKey: ['company-expenses', companyPage],
    queryFn: () => api.get<Paginated<any>>('/financials/company-expenses', { page: companyPage, limit: 25 }),
  });

  return (
    <div>
      <PageHeader
        title="Financials"
        description="Stone expenses, company overheads and expense categories."
        actions={canManage && (
          <>
            <NewCategoryDialog />
            <NewCompanyExpenseDialog />
          </>
        )}
      />

      <Tabs defaultValue="stone">
        <TabsList>
          <TabsTrigger value="stone"><Receipt className="mr-1.5 h-4 w-4" /> Stone Expenses</TabsTrigger>
          <TabsTrigger value="company"><Wallet className="mr-1.5 h-4 w-4" /> Company Overheads</TabsTrigger>
          <TabsTrigger value="categories">Categories ({categories?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="stone">
          <Card>
            <CardContent className="border-b p-4">
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setStonePage(1); }}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All categories</SelectItem>
                  {(categories ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
            {sLoading ? (
              <CardContent className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </CardContent>
            ) : (stoneExpenses?.data ?? []).length === 0 ? (
              <CardContent className="p-6">
                <EmptyState icon={Receipt} title="No expenses" description="Stone expenses appear here as they are recorded." />
              </CardContent>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Stone</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stoneExpenses!.data.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-muted-foreground">{formatDate(e.incurredAt)}</TableCell>
                        <TableCell>
                          <Link href={`/inventory/${e.stone.id}`} className="font-mono font-semibold text-primary hover:underline">
                            {e.stone.code}
                          </Link>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{e.category?.name}</Badge></TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">{e.note ?? '—'}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{money(e.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="px-4">
                  <Pagination meta={stoneExpenses!.meta} onPageChange={setStonePage} />
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="company">
          <Card>
            {cLoading ? (
              <CardContent className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </CardContent>
            ) : (companyExpenses?.data ?? []).length === 0 ? (
              <CardContent className="p-6">
                <EmptyState icon={Wallet} title="No overhead expenses" description="Company-level expenses (salaries, machines, fuel) appear here." />
              </CardContent>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyExpenses!.data.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-muted-foreground">{formatDate(e.incurredAt)}</TableCell>
                        <TableCell><Badge variant="secondary">{e.category?.name}</Badge></TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">{e.note ?? '—'}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{money(e.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="px-4">
                  <Pagination meta={companyExpenses!.meta} onPageChange={setCompanyPage} />
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(categories ?? []).map((c: any) => (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-sm font-semibold">{c.name}</div>
                    {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
                  </div>
                  {c.isSystem && <Badge variant="outline">System</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
