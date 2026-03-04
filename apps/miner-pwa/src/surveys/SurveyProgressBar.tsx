interface Props {
  current: number;
  total: number;
}

export function SurveyProgressBar({ current, total }: Props) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="survey-progress">
      <div className="survey-progress-bar">
        <div className="survey-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="survey-progress-text">{current}/{total}</span>
    </div>
  );
}
