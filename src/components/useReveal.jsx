import { useEffect, useRef } from 'react';

export function useReveal() {
  const ref = useRef(null);

  useEffect(() => {
    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.3 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const lines = entry.target.querySelectorAll('.cta-bounce-enter');
          lines.forEach((line, index) => {
            setTimeout(() => { line.classList.add('active'); }, index * 150);
          });
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return ref;
}