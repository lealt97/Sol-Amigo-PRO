import { useEffect, useState } from 'react';

export type BrandLogoFormat = 'horizontal' | 'vertical' | 'icon';
export type BrandLogoSurface = 'light' | 'dark' | 'auto';

type ResolvedSurface = Exclude<BrandLogoSurface, 'auto'>;

export const SOL_AMIGO_PRO_BRAND_ASSETS: Record<ResolvedSurface, Record<BrandLogoFormat, string>> = {
  light: {
    horizontal: '/brand/sol-amigo-pro/logo-horizontal-light.svg',
    vertical: '/brand/sol-amigo-pro/logo-vertical-light.svg',
    icon: '/brand/sol-amigo-pro/icon-light.svg',
  },
  dark: {
    horizontal: '/brand/sol-amigo-pro/logo-horizontal-dark.svg',
    vertical: '/brand/sol-amigo-pro/logo-vertical-dark.svg',
    icon: '/brand/sol-amigo-pro/icon-dark.svg',
  },
};

const readPlatformSurface = (): ResolvedSurface => (
  typeof document !== 'undefined'
    && document.documentElement.dataset.platformThemeMode === 'light'
    ? 'light'
    : 'dark'
);

function usePlatformSurface() {
  const [surface, setSurface] = useState<ResolvedSurface>(readPlatformSurface);

  useEffect(() => {
    const root = document.documentElement;
    const syncSurface = () => setSurface(readPlatformSurface());
    syncSurface();

    const observer = new MutationObserver(syncSurface);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-platform-theme-mode'],
    });

    return () => observer.disconnect();
  }, []);

  return surface;
}

export type BrandLogoProps = {
  format?: BrandLogoFormat;
  surface?: BrandLogoSurface;
  className?: string;
  alt?: string;
  loading?: 'eager' | 'lazy';
};

export function BrandLogo({
  format = 'horizontal',
  surface = 'auto',
  className = '',
  alt = 'Sol Amigo PRO',
  loading = 'lazy',
}: BrandLogoProps) {
  const platformSurface = usePlatformSurface();
  const resolvedSurface = surface === 'auto' ? platformSurface : surface;
  const src = SOL_AMIGO_PRO_BRAND_ASSETS[resolvedSurface][format];

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      draggable={false}
      className={`block max-w-full select-none object-contain ${className}`.trim()}
    />
  );
}
