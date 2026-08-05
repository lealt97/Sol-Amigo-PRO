import { useEffect, useState } from 'react';

export type BrandLogoFormat = 'horizontal' | 'vertical' | 'icon';
export type BrandLogoSurface = 'light' | 'dark' | 'auto';

type ResolvedSurface = Exclude<BrandLogoSurface, 'auto'>;

const brandAsset = (fileName: string) => (
  `${import.meta.env.BASE_URL}brand/sol-amigo-pro/${fileName}`
);

export const SOL_AMIGO_PRO_BRAND_ASSETS: Record<ResolvedSurface, Record<BrandLogoFormat, string>> = {
  light: {
    horizontal: brandAsset('logo-horizontal-light.svg'),
    vertical: brandAsset('logo-vertical-light.svg'),
    icon: brandAsset('icon-light.svg'),
  },
  dark: {
    horizontal: brandAsset('logo-horizontal-dark.svg'),
    vertical: brandAsset('logo-vertical-dark.svg'),
    icon: brandAsset('icon-dark.svg'),
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
