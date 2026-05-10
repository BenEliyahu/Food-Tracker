import { useEffect, useRef } from 'react';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function Confetti({ onDone }: { onDone: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    for (let i = 0; i < 70; i++) {
      const el = document.createElement('div');
      const size = 6 + Math.random() * 8;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const left = Math.random() * 100;
      const dur = 1.5 + Math.random() * 1.5;
      const delay = Math.random() * 0.8;
      const isCircle = Math.random() > 0.5;

      el.style.cssText = `
        position:absolute;
        width:${size}px;
        height:${size}px;
        background:${color};
        border-radius:${isCircle ? '50%' : '2px'};
        left:${left}%;
        top:-20px;
        animation:confettiFall ${dur}s ${delay}s ease-in forwards;
        pointer-events:none;
      `;
      container.appendChild(el);
    }

    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
    />
  );
}
