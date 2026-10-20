'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/api-client';

// Title saves on blur or Enter. It's metadata, so it doesn't go through the
// content autosave or its revision check.
export function TitleField({
  docId,
  initialTitle,
  canEdit,
  autoFocus,
}: {
  docId: string;
  initialTitle: string;
  canEdit: boolean;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState(initialTitle);
  const saved = useRef(initialTitle);
  const [error, setError] = useState<string | null>(null);

  async function commit() {
    const next = value.trim();
    if (!next) {
      setValue(saved.current);
      setError(null);
      return;
    }
    if (next === saved.current) return;
    const res = await api<{ title: string }>(`/api/docs/${docId}`, { method: 'PATCH', json: { title: next } });
    if (res.ok) {
      saved.current = res.data.title;
      setValue(res.data.title);
      setError(null);
      document.title = `${res.data.title} · Ajaia Docs`;
    } else {
      setError(res.error.fields?.title ?? res.error.message);
    }
  }

  if (!canEdit) {
    return <h1 className="font-serif text-[30px] font-semibold leading-tight tracking-tight sm:text-[34px]">{value}</h1>;
  }

  return (
    <div>
      <input
        aria-label="Document title"
        value={value}
        maxLength={200}
        autoFocus={autoFocus}
        onFocus={(e) => autoFocus && e.currentTarget.select()}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          }
          if (e.key === 'Escape') {
            setValue(saved.current);
            e.currentTarget.blur();
          }
        }}
        className="w-full bg-transparent font-serif text-[30px] font-semibold leading-tight tracking-tight text-ink outline-none placeholder:text-ink-faint focus:shadow-[0_2px_0_var(--color-mark)] sm:text-[34px]"
        placeholder="Untitled document"
      />
      {error ? (
        <p role="alert" className="mt-1 text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
