import { Perfume } from '../../types/perfume';

interface PerfumeImageProps {
  perfume: Perfume;
  className?: string;
  size?: 'default' | 'large' | 'small';
}

function hasImageSrc(image: string) {
  return image.startsWith('/');
}

export default function PerfumeImage({
  perfume,
  className = '',
  size = 'default'
}: PerfumeImageProps) {
  if (hasImageSrc(perfume.image)) {
    return (
      <img
        src={perfume.image}
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
      <div className={`perfume-bottle-icon ${size === 'large' ? 'large' : size === 'small' ? 'small' : ''}`}>
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
