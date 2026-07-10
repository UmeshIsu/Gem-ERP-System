/** Categorical palette — reads the validated CSS custom properties so light/dark swap automatically. */
export const SERIES = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
];

export const chartAxis = {
  stroke: 'hsl(var(--muted-foreground) / 0.5)',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

export const chartGrid = {
  stroke: 'hsl(var(--border) / 0.6)',
  strokeDasharray: '3 3',
  vertical: false,
} as const;

export const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
    color: 'hsl(var(--popover-foreground))',
    boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)',
  },
  labelStyle: { color: 'hsl(var(--popover-foreground))', fontWeight: 600 },
  cursor: { fill: 'hsl(var(--muted) / 0.4)' },
} as const;

export function compactNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}
