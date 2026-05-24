'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullPage?: boolean;
  className?: string;
}

const sizes = {
  sm: { dot: 'w-1.5 h-1.5', showText: false, bounce: '-4px', py: 'py-12' },
  md: { dot: 'w-2.5 h-2.5', showText: true, bounce: '-8px', py: 'py-20' },
  lg: { dot: 'w-3.5 h-3.5', showText: true, bounce: '-12px', py: 'py-20' },
};

const dots = [
  { col: 1, row: 2, delay: '0s', dir: 1 },
  { col: 2, row: 1, delay: '0.12s', dir: -1 },
  { col: 3, row: 2, delay: '0.24s', dir: 1 },
  { col: 4, row: 1, delay: '0.36s', dir: -1 },
  { col: 5, row: 2, delay: '0.48s', dir: 1 },
];

export default function LoadingSpinner({
  size = 'md',
  text = 'Loading...',
  fullPage = false,
  className = '',
}: LoadingSpinnerProps) {
  const s = sizes[size];

  return (
    <div className={`flex flex-col items-center justify-center ${fullPage ? 'min-h-[60vh]' : s.py} ${className}`}>
      <div className="grid grid-cols-5 justify-items-center gap-x-2 sm:gap-x-3">
        {dots.map((d) => (
          <div
            key={d.col}
            className={`${s.dot} rounded-full bg-[#062E22]`}
            style={{ gridColumn: d.col, gridRow: d.row, animation: `waveBounce 0.8s ease-in-out infinite ${d.delay}`, '--bounce': s.bounce, '--dir': d.dir } as React.CSSProperties}
          />
        ))}
      </div>
      {s.showText && text && (
        <p className="mt-3 text-xs text-slate-400">{text}</p>
      )}

      <style>{`
        @keyframes waveBounce {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(calc(var(--bounce) * var(--dir))); }
          50% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
