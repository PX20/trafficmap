import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ViewTrackingOptions {
  threshold: number;        // 0.5 = 50% visible
  minViewTime: number;     // milliseconds
  maxViewsPerDay: number;  // prevent spam
}

export function useAdTracking(options: ViewTrackingOptions = {
  threshold: 0.5,
  minViewTime: 2000,
  maxViewsPerDay: 3
}) {
  const { user } = useAuth();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const viewTimersRef = useRef<Map<string, { startTime: number; timer: NodeJS.Timeout }>>(new Map());
  const viewedTodayRef = useRef<Set<string>>(new Set());

  const trackAdView = useCallback(async (adId: string, duration: number) => {
    // Check daily limit
    if (viewedTodayRef.current.has(adId) && viewedTodayRef.current.size >= options.maxViewsPerDay) {
      return;
    }

    try {
      const response = await fetch('/api/ads/track-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adId,
          duration,
          userSuburb: user?.homeSuburb,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        viewedTodayRef.current.add(adId);
        console.log(`Ad view tracked: ${adId}, duration: ${duration}ms`);
      }
    } catch (error) {
      console.error('Failed to track ad view:', error);
    }
  }, [user?.homeSuburb, options.maxViewsPerDay]);

  const startViewTimer = useCallback((adId: string) => {
    if (viewTimersRef.current.has(adId)) return; // Already tracking

    const startTime = Date.now();
    const timer = setTimeout(() => {
      const duration = Date.now() - startTime;
      trackAdView(adId, duration);
      viewTimersRef.current.delete(adId);
    }, options.minViewTime);

    viewTimersRef.current.set(adId, { startTime, timer });
  }, [trackAdView, options.minViewTime]);

  const stopViewTimer = useCallback((adId: string) => {
    const timerData = viewTimersRef.current.get(adId);
    if (timerData) {
      clearTimeout(timerData.timer);
      viewTimersRef.current.delete(adId);
    }
  }, []);

  const observeAd = useCallback((element: HTMLElement) => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const adId = entry.target.getAttribute('data-ad-id');
            if (!adId) return;

            if (entry.isIntersecting && entry.intersectionRatio >= options.threshold) {
              startViewTimer(adId);
            } else {
              stopViewTimer(adId);
            }
          });
        },
        {
          threshold: [options.threshold],
          rootMargin: '0px'
        }
      );
    }

    if (element) {
      observerRef.current.observe(element);
    }
  }, [startViewTimer, stopViewTimer, options.threshold]);

  const unobserveAd = useCallback((element: HTMLElement) => {
    if (observerRef.current && element) {
      const adId = element.getAttribute('data-ad-id');
      if (adId) {
        stopViewTimer(adId);
      }
      observerRef.current.unobserve(element);
    }
  }, [stopViewTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      viewTimersRef.current.forEach(({ timer }) => clearTimeout(timer));
      viewTimersRef.current.clear();
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { observeAd, unobserveAd };
}