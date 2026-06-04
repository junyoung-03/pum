interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = (current / total) * 100;

  return (
    <div className="progress-bar-container">
      <div className="progress-bar-header">
        <span className="progress-step">STEP {current} / {total}</span>
        <span className="progress-percentage">{Math.round(percentage)}%</span>
      </div>
      <div className="progress-bar-track">
        <div 
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
