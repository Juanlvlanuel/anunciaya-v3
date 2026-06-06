import { Icon } from './icons';

interface StarsProps {
  /** 0..5 con decimales (4.8 → redondea visualmente a 5) */
  rating: number;
  size?: number;
  className?: string;
}

/**
 * 5 estrellas inline. **No** usar variantes oro/plata/bronce — el brief lo prohíbe.
 */
export function Stars({ rating, size = 12, className = '' }: StarsProps) {
  const rounded = Math.round(rating);
  return (
    <div className={`flex items-center gap-0.5 ${className}`} aria-label={`${rating} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon.Star
          key={i}
          size={size}
          className={i <= rounded ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
        />
      ))}
    </div>
  );
}
