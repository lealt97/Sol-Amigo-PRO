import { BrandLogo } from './BrandLogo';

type AnimatedLoginLogoProps = { className?: string };

/** A autenticação utiliza a assinatura vertical oficial da Sol Amigo PRO. */
export function AnimatedLoginLogo({ className = '' }: AnimatedLoginLogoProps) {
  return <BrandLogo format="vertical" surface="auto" className={className} loading="eager" />;
}
