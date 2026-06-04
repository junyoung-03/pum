interface OptionCardProps {
  option: string;
  isSelected: boolean;
  onClick: () => void;
}

export default function OptionCard({ option, isSelected, onClick }: OptionCardProps) {
  return (
    <button
      className={`option-card ${isSelected ? 'option-card-selected' : ''}`}
      onClick={onClick}
      type="button"
    >
      <span className="option-text">{option}</span>
      {isSelected && <span className="option-check">✓</span>}
    </button>
  );
}
