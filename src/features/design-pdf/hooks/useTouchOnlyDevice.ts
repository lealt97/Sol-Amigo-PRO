import { useEffect, useState } from 'react';

const TOUCH_CAPABILITY_MEDIA_QUERIES = [
  '(hover: none)',
  '(pointer: coarse)',
  '(any-pointer: coarse)',
] as const;

function hasTouchCapability() {
  if (typeof window === 'undefined') return false;

  const hasTouchPoints = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  const exposesTouchEvents = 'ontouchstart' in window;
  const matchesTouchMediaQuery = typeof window.matchMedia === 'function'
    && TOUCH_CAPABILITY_MEDIA_QUERIES.some((query) => window.matchMedia(query).matches);

  return hasTouchPoints || exposesTouchEvents || matchesTouchMediaQuery;
}

export function useTouchOnlyDevice() {
  const [isTouchOnlyDevice, setIsTouchOnlyDevice] = useState(hasTouchCapability);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const mediaQueries = TOUCH_CAPABILITY_MEDIA_QUERIES.map((query) => window.matchMedia(query));
    const syncDeviceCapability = () => setIsTouchOnlyDevice(hasTouchCapability());
    const unsubscribers = mediaQueries.map((mediaQuery) => {
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', syncDeviceCapability);
        return () => mediaQuery.removeEventListener('change', syncDeviceCapability);
      }

      mediaQuery.addListener(syncDeviceCapability);
      return () => mediaQuery.removeListener(syncDeviceCapability);
    });

    syncDeviceCapability();
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  return isTouchOnlyDevice;
}
