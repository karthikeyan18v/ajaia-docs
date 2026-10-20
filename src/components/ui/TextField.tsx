import { useId, type InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

// 16px input text so iOS Safari never zooms on focus.
export function TextField({ label, error, hint, className = '', ...rest }: Props) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink-soft">
        {label}
      </label>
      <input
        id={id}
        {...rest}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={
          'h-11 w-full rounded-[var(--radius-control)] border bg-paper px-3 text-[16px] text-ink ' +
          'placeholder:text-ink-faint transition-colors duration-150 ' +
          'focus:outline-none focus:border-ink focus:ring-2 focus:ring-mark ' +
          (error ? 'border-danger' : 'border-line hover:border-line-strong')
        }
      />
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
