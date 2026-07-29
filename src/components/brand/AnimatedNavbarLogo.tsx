import { BrandLogo } from './BrandLogo';

type AnimatedNavbarLogoProps = { className?: string };

/** Compatibilidade com usos antigos: agora exibe o símbolo oficial compacto. */
export function AnimatedNavbarLogo({ className = '' }: AnimatedNavbarLogoProps) {
  return <BrandLogo format="icon" surface="auto" className={className} loading="eager" />;
}
