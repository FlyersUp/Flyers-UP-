'use client';

import { useEffect } from 'react';

const OUTLINE = 'fu-overflow-debug-outline';

/**
 * Development-only: outlines elements whose layout width exceeds the visual viewport.
 * Enable with ?overflowDebug=1 or localStorage flyersup:overflowDebug=1
 */
export function ViewportOverflowDebug() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const enabled = () => {
      try {
        if (typeof window === 'undefined') return false;
        if (window.localStorage.getItem('flyersup:overflowDebug') === '1') return true;
        return new URLSearchParams(window.location.search).get('overflowDebug') === '1';
      } catch {
        return false;
      }
    };

    if (!enabled()) return;

    const style = document.createElement('style');
    style.setAttribute('data-fu-overflow-debug', '');
    style.textContent = `.${OUTLINE}{outline:2px solid #e11d48!important;outline-offset:-1px!important;background:rgba(225,29,72,0.06)!important;}`;
    document.head.appendChild(style);

    const clear = () => {
      document.querySelectorAll(`.${OUTLINE}`).forEach((el) => el.classList.remove(OUTLINE));
    };

    const mark = () => {
      clear();
      const vw = window.visualViewport?.width ?? window.innerWidth;
      const nodes = document.body.querySelectorAll<HTMLElement>('*');
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        const r = el.getBoundingClientRect();
        if (r.width <= vw + 0.5) continue;
        if (r.height === 0 || r.width === 0) continue;
        el.classList.add(OUTLINE);
      }
    };

    mark();
    const onResize = () => mark();
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    const interval = window.setInterval(mark, 2500);

    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      window.clearInterval(interval);
      clear();
      style.remove();
    };
  }, []);

  return null;
}
