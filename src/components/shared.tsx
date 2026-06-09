import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Perfume } from '../data/perfumeData';

export function Button({
  variant = 'primary',
  size = 'medium',
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  children: ReactNode;
}) {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Badge({
  children,
  variant = 'default'
}: {
  children: ReactNode;
  variant?: 'default' | 'category' | 'mood';
}) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

export function SectionTitle({
  title,
  subtitle,
  align = 'center'
}: {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
}) {
  return (
    <div className={`section-title section-title-${align}`}>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

function hasImageSrc(image: string) {
  return image.startsWith('/') || image.startsWith('images/');
}

function getImageSrc(image: string) {
  const path = image.startsWith('/') ? image.slice(1) : image;
  return `${import.meta.env.BASE_URL}${path}`;
}

export function PerfumeImage({
  perfume,
  className = '',
  size = 'default'
}: {
  perfume: Perfume;
  className?: string;
  size?: 'default' | 'large' | 'small';
}) {
  if (hasImageSrc(perfume.image)) {
    return (
      <img
        src={getImageSrc(perfume.image)}
        alt={`${perfume.brand} ${perfume.name}`}
        className={`perfume-photo ${className}`.trim()}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`perfume-image-fallback ${className}`.trim()}
      style={{ background: perfume.color }}
    >
      <div
        className={`perfume-bottle-icon ${size === 'large' ? 'large' : size === 'small' ? 'small' : ''}`}
      >
        <svg viewBox="0 0 60 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="0" width="20" height="15" rx="2" fill="currentColor" opacity="0.6" />
          <rect x="22" y="15" width="16" height="5" fill="currentColor" opacity="0.4" />
          <path
            d="M10 25 L50 25 L55 90 Q55 95 50 95 L10 95 Q5 95 5 90 L10 25Z"
            fill="currentColor"
            opacity="0.3"
          />
          <path
            d="M15 35 L45 35 L48 85 Q48 88 45 88 L15 88 Q12 88 12 85 L15 35Z"
            fill="currentColor"
            opacity="0.15"
          />
        </svg>
      </div>
    </div>
  );
}

export function NoteList({
  topNote,
  middleNote,
  baseNote
}: {
  topNote: string[];
  middleNote: string[];
  baseNote: string[];
}) {
  return (
    <div className="note-list">
      <div className="note-item">
        <h4>Top Note</h4>
        <p>{topNote.join(', ')}</p>
      </div>
      <div className="note-item">
        <h4>Middle Note</h4>
        <p>{middleNote.join(', ')}</p>
      </div>
      <div className="note-item">
        <h4>Base Note</h4>
        <p>{baseNote.join(', ')}</p>
      </div>
    </div>
  );
}
