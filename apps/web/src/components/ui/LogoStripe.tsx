/**
 * LogoStripe.tsx
 * ==============
 * Wordmark oficial de Stripe (marca registrada) para los sellos de confianza "Pago seguro/procesado
 * con Stripe" de los flujos de pago. SVG inline en el color de marca (#635BFF "Blurple" por defecto);
 * se escala con `alto` y mantiene su proporción (ancho automático). Para fondos oscuros, pasar
 * `color="#fff"`.
 *
 * Ubicación: apps/web/src/components/ui/LogoStripe.tsx
 */

export function LogoStripe({ alto = 16, color = '#635BFF', className = '' }: { alto?: number; color?: string; className?: string }) {
  return (
    <svg
      role="img"
      aria-label="Stripe"
      height={alto}
      viewBox="0 0 60 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: 'auto' }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.63 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.02-13.17 4.02-.86v3.54h3.14V9.1h-3.14l-.01 5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6 14.51 0 15.04 0 10.95 0 8.04 2.28 6.3 5.62 6.3c1.36 0 2.72.21 4.09.7v3.88a9.4 9.4 0 0 0-4.09-.94c-.84 0-1.36.25-1.36.92 0 1.06 6.04.58 6.04 4.69z"
        fill={color}
      />
    </svg>
  );
}

export default LogoStripe;
