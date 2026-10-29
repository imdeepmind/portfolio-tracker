'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      let registrationRef: ServiceWorkerRegistration | null = null;

      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          registrationRef = registration;

          // Check for SW updates every time the user refocuses/switches back to the app
          const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && registrationRef) {
              registrationRef.update();
            }
          };

          const handleOnline = () => {
            if (registrationRef) {
              registrationRef.update();
            }
          };

          document.addEventListener('visibilitychange', handleVisibilityChange);
          window.addEventListener('online', handleOnline);

          // Periodically check for updates every 30 minutes in background
          const intervalId = setInterval(
            () => {
              if (registrationRef) {
                registrationRef.update();
              }
            },
            30 * 60 * 1000
          );

          return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
            clearInterval(intervalId);
          };
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('PWA ServiceWorker registration error:', err);
          }
        }
      };

      // Listen for the active controller changing (new SW version took over)
      let refreshing = false;
      const handleControllerChange = () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }

      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }
  }, []);

  return null;
}
