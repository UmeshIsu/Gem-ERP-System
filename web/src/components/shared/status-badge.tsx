import { Badge } from '@/components/ui/badge';
import { STATUS_VARIANT } from '@/lib/constants';
import { titleCase } from '@/lib/format';

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? 'secondary'}>{titleCase(status)}</Badge>;
}
