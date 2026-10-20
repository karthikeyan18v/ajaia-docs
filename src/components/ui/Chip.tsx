import type { ReactNode } from 'react';

type Tone = 'neutral' | 'mark' | 'outline';

const tones: Record<Tone, string> = {
  neutral: 'bg-panel text-ink-soft',
  mark: 'bg-mark-soft text-ink',
  outline: 'border border-line text-ink-soft',
};

export function Chip({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-full px-2 text-[12px] font-medium whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
}
