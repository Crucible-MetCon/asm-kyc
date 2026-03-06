import type { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  icon: LucideIcon;
  subtitle?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function PlaceholderCard({ title, icon: Icon, subtitle, disabled, onClick }: Props) {
  return (
    <div
      className={`card ${disabled ? 'disabled' : ''}`}
      onClick={!disabled ? onClick : undefined}
      style={!disabled && onClick ? { cursor: 'pointer' } : undefined}
    >
      <span className="card-icon">
        <Icon size={22} strokeWidth={2} />
      </span>
      <div className="card-content">
        <div className="card-title">{title}</div>
        <div className="card-subtitle">{subtitle || (disabled ? 'Coming soon' : '')}</div>
      </div>
    </div>
  );
}
