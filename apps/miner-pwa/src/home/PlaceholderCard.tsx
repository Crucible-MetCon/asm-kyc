interface Props {
  title: string;
  icon: string;
  subtitle?: string;
  disabled?: boolean;
}

export function PlaceholderCard({ title, icon, subtitle, disabled }: Props) {
  return (
    <div className={`card ${disabled ? 'disabled' : ''}`}>
      <span className="card-icon">{icon}</span>
      <div className="card-content">
        <div className="card-title">{title}</div>
        <div className="card-subtitle">{subtitle || (disabled ? 'Coming soon' : '')}</div>
      </div>
    </div>
  );
}
