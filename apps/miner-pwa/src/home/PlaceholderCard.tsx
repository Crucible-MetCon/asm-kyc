interface Props {
  title: string;
  icon: string;
  subtitle?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function PlaceholderCard({ title, icon, subtitle, disabled, onClick }: Props) {
  return (
    <div
      className={`card ${disabled ? 'disabled' : ''}`}
      onClick={!disabled ? onClick : undefined}
      style={!disabled && onClick ? { cursor: 'pointer' } : undefined}
    >
      <span className="card-icon">{icon}</span>
      <div className="card-content">
        <div className="card-title">{title}</div>
        <div className="card-subtitle">{subtitle || (disabled ? 'Coming soon' : '')}</div>
      </div>
    </div>
  );
}
