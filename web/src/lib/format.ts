export const CURRENCY = 'LKR';

export function money(value: number | string | null | undefined, compact = false): string {
  if (value == null) return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return '—';
  if (compact && Math.abs(n) >= 1_000_000) {
    return `${CURRENCY} ${(n / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}M`;
  }
  if (compact && Math.abs(n) >= 1_000) {
    return `${CURRENCY} ${(n / 1_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K`;
  }
  return `${CURRENCY} ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export function carats(value: number | string | null | undefined): string {
  if (value == null) return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 3 })} ct`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function percent(value: number | string | null | undefined): string {
  if (value == null) return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  return `${n > 0 ? '+' : ''}${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
