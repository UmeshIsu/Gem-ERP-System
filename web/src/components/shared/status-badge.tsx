import { Badge } from '@/components/ui/badge';
import { STATUS_VARIANT } from '@/lib/constants';
import { titleCase } from '@/lib/format';
import { cn } from '@/lib/utils';

const DOT_COLOR: Record<string, string> = {
  default: 'bg-primary-foreground',
  secondary: 'bg-muted-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-primary',
  destructive: 'bg-destructive',
  outline: 'bg-muted-foreground',
};

export function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT[status] ?? 'secondary';
  return (
    <Badge variant={variant} className="gap-1.5 pl-2">
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT_COLOR[variant])} />
      {titleCase(status)}
    </Badge>
  );
}
