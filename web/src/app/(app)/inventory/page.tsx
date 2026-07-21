'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Boxes, Filter, Plus, Search, X } from 'lucide-react';
import { api, Paginated } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { money, carats, formatDate, titleCase } from '@/lib/format';
import { STONE_STATUSES } from '@/lib/constants';
import { useMasterData } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/status-badge';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';

const ALL = '__all__';

function InventoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { hasRole } = useAuth();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [searchInput, setSearchInput] = useState(search);
  const [status, setStatus] = useState(searchParams.get('status') ?? ALL);
  const [gemTypeId, setGemTypeId] = useState(searchParams.get('gemTypeId') ?? ALL);
  const [locationId, setLocationId] = useState(searchParams.get('locationId') ?? ALL);
  const [includeArchived, setIncludeArchived] = useState(searchParams.get('includeArchived') === 'true');
  const [showFilters, setShowFilters] = useState(
    !!(searchParams.get('gemTypeId') || searchParams.get('locationId') || searchParams.get('purchasedFrom') || searchParams.get('purchasedTo'))
  );
  const [minWeight, setMinWeight] = useState(searchParams.get('minWeight') ?? '');
  const [maxWeight, setMaxWeight] = useState(searchParams.get('maxWeight') ?? '');
  const [purchasedFrom, setPurchasedFrom] = useState(searchParams.get('purchasedFrom') ?? '');
  const [purchasedTo, setPurchasedTo] = useState(searchParams.get('purchasedTo') ?? '');

  const [minWeightInput, setMinWeightInput] = useState(minWeight);
  const [maxWeightInput, setMaxWeightInput] = useState(maxWeight);
  const [purchasedFromInput, setPurchasedFromInput] = useState(purchasedFrom);
  const [purchasedToInput, setPurchasedToInput] = useState(purchasedTo);

  const { data: gemTypes } = useMasterData('gemType');
  const { data: locations } = useMasterData('purchaseLocation');

  const params = {
    page,
    limit: 20,
    search: search || undefined,
    status: status === ALL ? undefined : status,
    gemTypeId: gemTypeId === ALL ? undefined : gemTypeId,
    purchaseLocationId: locationId === ALL ? undefined : locationId,
    includeArchived: includeArchived || undefined,
    minWeight: minWeight || undefined,
    maxWeight: maxWeight || undefined,
    purchasedFrom: purchasedFrom || undefined,
    purchasedTo: purchasedTo || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['stones', params],
    queryFn: () => api.get<Paginated<any>>('/stones', params),
  });

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const applyFilters = () => {
    setMinWeight(minWeightInput);
    setMaxWeight(maxWeightInput);
    setPurchasedFrom(purchasedFromInput);
    setPurchasedTo(purchasedToInput);
    setPage(1);
  };

  const clearFilters = () => {
    setStatus(ALL);
    setGemTypeId(ALL);
    setLocationId(ALL);
    setMinWeightInput('');
    setMaxWeightInput('');
    setPurchasedFromInput('');
    setPurchasedToInput('');
    setMinWeight('');
    setMaxWeight('');
    setPurchasedFrom('');
    setPurchasedTo('');
    setIncludeArchived(false);
    setSearch('');
    setSearchInput('');
    setPage(1);
  };

  const hasActiveFilters =
    status !== ALL || gemTypeId !== ALL || locationId !== ALL || minWeight || maxWeight || purchasedFrom || purchasedTo || includeArchived;

  return (
    <div>
      <PageHeader
        title="Stone Inventory"
        description="Every stone, from purchase to sale — nothing ever disappears."
        actions={
          hasRole('MANAGER', 'INVENTORY_OFFICER') && (
            <Button asChild>
              <Link href="/inventory/new">
                <Plus /> New Stone
              </Link>
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <form onSubmit={applySearch} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by code, gem type, seller, certificate, color…"
                className="pl-9"
              />
            </form>
            <div className="flex items-center gap-2">
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All statuses</SelectItem>
                  {STONE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant={showFilters ? 'secondary' : 'outline'} onClick={() => setShowFilters(!showFilters)}>
                <Filter /> Filters
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters} aria-label="Clear filters">
                  <X />
                </Button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Gem Type</label>
                <Select value={gemTypeId} onValueChange={(v) => { setGemTypeId(v); setPage(1); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All gem types</SelectItem>
                    {(gemTypes ?? []).map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Purchase Location</label>
                <Select value={locationId} onValueChange={(v) => { setLocationId(v); setPage(1); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All locations</SelectItem>
                    {(locations ?? []).map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Weight (ct)</label>
                <div className="flex items-center gap-2">
                  <Input type="number" step="0.001" placeholder="Min" value={minWeightInput} onChange={(e) => setMinWeightInput(e.target.value)} />
                  <Input type="number" step="0.001" placeholder="Max" value={maxWeightInput} onChange={(e) => setMaxWeightInput(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Purchase Date</label>
                <div className="flex items-center gap-2">
                  <Input type="date" value={purchasedFromInput} onChange={(e) => setPurchasedFromInput(e.target.value)} />
                  <Input type="date" value={purchasedToInput} onChange={(e) => setPurchasedToInput(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col justify-end sm:col-span-2">
                <label className="flex items-center gap-2 text-sm mb-2">
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(e) => { setIncludeArchived(e.target.checked); setPage(1); }}
                    className="h-4 w-4 rounded border-input"
                  />
                  Include archived stones (split parents, exported, sold)
                </label>
              </div>
              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4 justify-end">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
                <Button size="sm" onClick={applyFilters}>
                  Apply Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        {isLoading ? (
          <CardContent className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </CardContent>
        ) : (data?.data ?? []).length === 0 ? (
          <CardContent className="p-6">
            <EmptyState
              icon={Boxes}
              title="No stones found"
              description={hasActiveFilters ? 'Try adjusting your search or filters.' : 'Add your first stone to start tracking your inventory.'}
              action={
                hasRole('MANAGER', 'INVENTORY_OFFICER') && !hasActiveFilters ? (
                  <Button asChild>
                    <Link href="/inventory/new"><Plus /> New Stone</Link>
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Gem Type</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Purchased</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.data.map((s: any) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/inventory/${s.id}`)}
                  >
                    <TableCell>
                      <span className="font-mono text-sm font-semibold text-primary">{s.code}</span>
                      {s._count?.children > 0 && (
                        <span className="ml-1.5 text-xs text-muted-foreground">→ {s._count.children} children</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{s.gemType?.name}</div>
                      <div className="text-xs text-muted-foreground">{titleCase(s.stoneKind)}</div>
                    </TableCell>
                    <TableCell className="tabular-nums">{carats(s.weightCt)}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell>{s.purchaseLocation?.name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(s.purchaseDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(s.purchaseCost, true)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{money(s.currentValue, true)}</TableCell>
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

export default function InventoryPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <InventoryContent />
    </Suspense>
  );
}
