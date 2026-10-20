import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const base =
  'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap rounded-[var(--radius-control)] ' +
  'transition-[background-color,border-color,color,opacity,scale,box-shadow] duration-150 ease-[cubic-bezier(0.2,0,0,1)] ' +
  'active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none';

const variants: Record<Variant, string> = {
  primary:
    'bg-ink text-paper shadow-[0_1px_2px_oklch(0.22_0.012_250/0.25),inset_0_1px_0_oklch(1_0_0/0.12)] hover:bg-ink/90',
  secondary: 'bg-paper text-ink shadow-[var(--shadow-paper)] hover:shadow-[var(--shadow-lift)]',
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
