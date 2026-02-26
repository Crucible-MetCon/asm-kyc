interface StatusBadgeProps {
  status: string;
}

const badgeClassMap: Record<string, string> = {
  DRAFT: 'badge-draft',
  SUBMITTED: 'badge-submitted',
  PURCHASED: 'badge-purchased',
  PENDING: 'badge-pending',
  APPROVED: 'badge-approved',
  REJECTED: 'badge-rejected',
  FLAGGED: 'badge-flagged',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const cls = badgeClassMap[status] ?? 'badge-draft';
  return <span className={`badge ${cls}`}>{status}</span>;
}
