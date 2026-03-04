interface Props {
  level: string;
}

const DEFAULT_STYLE = { bg: '#e6f4ea', color: '#16a34a' };

const RISK_COLORS: Record<string, { bg: string; color: string }> = {
  CRITICAL: { bg: '#fde8e8', color: '#dc2626' },
  HIGH: { bg: '#fff3e0', color: '#ea580c' },
  MEDIUM: { bg: '#fef9c3', color: '#ca8a04' },
  LOW: DEFAULT_STYLE,
};

export function RiskBadge({ level }: Props) {
  const style = RISK_COLORS[level] ?? DEFAULT_STYLE;
  return (
    <span
      className="badge"
      style={{
        backgroundColor: style.bg,
        color: style.color,
        fontWeight: 600,
      }}
    >
      {level}
    </span>
  );
}
