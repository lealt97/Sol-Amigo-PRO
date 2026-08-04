import { useEffect, useState } from 'react';

const TOUCH_ONLY_MEDIA_QUERY = '(hover: none) and (pointer: coarse)';

export function useTouchOnlyDevice() {
  const [isTouchOnlyDevice, setIsTouchOnlyDevice] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(TOUCH_ONLY_MEDIA_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const mediaQuery = window.matchMedia(TOUCH_ONLY_MEDIA_QUERY);
    const syncDeviceCapability = () => setIsTouchOnlyDevice(mediaQuery.matches);

    syncDeviceCapability();
    mediaQuery.addEventListener('change', syncDeviceCapability);

    return () => mediaQuery.removeEventListener('change', syncDeviceCapability);
  }, []);

  return isTouchOnlyDevice;
}
