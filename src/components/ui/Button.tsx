import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const base =
  'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap rounded-[var(--radius-control)] ' +
  'transition-[background-color,border-color,color,opacity] duration-150 ease-[var(--ease-out-quart)] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed select-none';

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink/88 active:bg-ink/80',
  secondary: 'bg-paper text-ink border border-line hover:border-line-strong hover:bg-panel active:bg-panel',
  ghost: 'text-ink-soft hover:text-ink hover:bg-panel active:bg-line/60',
  danger: 'bg-danger text-paper hover:bg-danger/90 active:bg-danger/80',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-[14px] max-sm:h-11',
  md: 'h-11 px-4 text-[15px]',
};

export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', extra = '') {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  pending?: boolean;
};

export function Button({ variant = 'secondary', size = 'md', pending, className = '', children, disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={buttonClass(variant, size, className)}
    >
      {pending ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden
      className="size-3.5 rounded-full border-2 border-current border-r-transparent animate-spin opacity-70"
    />
  );
}
