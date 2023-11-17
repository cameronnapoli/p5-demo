import _ from 'lodash';
import { useEffect, useCallback, useRef, useMemo, DependencyList, useState } from 'react';

type AnyFn = (...args: any[]) => void;

export const useAsyncEffect = (
  fn: (isCancelled: () => boolean) => Promise<void | (() => void)>,
  deps: DependencyList,
) => {
  useEffect(() => {
    let cancelled = false;
    let cleanup: (null | AnyFn) = null;

    fn(() => cancelled)
      .then((fnCleanup) => {
        // call cleanup immediately if already cancelled
        if (cancelled && fnCleanup) {
          fnCleanup();
        } else {
          cleanup = fnCleanup || null;
        }
      })
      .catch(console.warn);

    return () => {
      cancelled = true;
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

export const useOnce = (fn: () => void, trigger: boolean, reset?: boolean) => {
  const hasRun = useRef(false);

  useEffect(() => {
    if (trigger && !hasRun.current) {
      fn();
      hasRun.current = true;
    }
    if (reset) {
      hasRun.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, reset]);
};

export const useRefCallback = (
  fn: AnyFn,
  deps: DependencyList,
) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cb = useCallback(fn, deps);
  const ref = useRef(cb);
  ref.current = cb;
  return ref;
};

export const useIsRendered = () => {
  const [isRendered, setIsRendered] = useState(false);
  useEffect(() => {
    setIsRendered(true);
  }, []);
  return isRendered;
};

export const useBreakpoint = (): { isDesktop: boolean } => {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 768);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return useMemo(() => ({ isDesktop }), [isDesktop]);
};

export const useHasScrolled = () => {
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    setHasScrolled(window.scrollY > 0);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return hasScrolled;
};

export const useMousePosition = (throttled = 25, cb?: (pos: {x: number, y: number}) => any) => {
  const [position, setPosition] = useState<{x: number, y: number} | null>(null);
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (cb) {
        cb({ x: e.clientX, y: e.clientY });
      }
    };
    const throttledHandleMouseMove = _.throttle(handleMouseMove, throttled);
    window.addEventListener('mousemove', throttledHandleMouseMove);
    return () => window.removeEventListener('mousemove', throttledHandleMouseMove);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return position;
};

export const useWindowDimensions = () => {
  const [dimensions, setDimensions] = useState<{ width: number, height: number } | null>(null);
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return dimensions;
};

export const useObserveIntersection = (
  ref: React.MutableRefObject<HTMLElement | null>,
  cb: (isIntersecting: boolean) => void,
  options?: IntersectionObserverInit,
) => {
  useEffect(() => {
    if (!ref.current) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      cb(entry.isIntersecting);
    }, options);
    observer.observe(ref.current);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current]);
};

export const useIsVisible = (
  ref: React.MutableRefObject<HTMLElement | null>,
  options?: IntersectionObserverInit,
) => {
  const [isVisible, setIsVisible] = useState(false);
  useObserveIntersection(ref, setIsVisible, options);
  return isVisible;
};

/**
 * returns true if the mouse has not moved in the last `timeout` ms
 */
export const useMouseStagnant = (timout = 500) => {
  const [isStagnant, setIsStagnant] = useState(false);
  const lastMove = useRef(Date.now());
  useMousePosition(50, () => {
    lastMove.current = Date.now();
  });
  useEffect(() => {
    const interval = setInterval(() => {
      setIsStagnant(Date.now() - lastMove.current > timout);
    }, 100);
    return () => clearInterval(interval);
  }, [timout]);
  return isStagnant;
};
