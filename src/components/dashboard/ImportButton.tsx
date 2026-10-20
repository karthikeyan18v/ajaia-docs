'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { buttonClass, Spinner } from '@/components/ui/Button';
import { api } from '@/lib/api-client';

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = '.txt,.md,.markdown,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Turns a .txt, .md or .docx file into a new editable document.
export function ImportButton() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) {
      setError('Files can be up to 2 MB.');
      return;
    }
    setPending(true);
    const form = new FormData();
    form.append('file', file);
    const res = await api<{ id: string; warnings: string[] }>('/api/import', { method: 'POST', body: form });
    if (input.current) input.current.value = '';
    if (res.ok) {
      const q = new URLSearchParams({ imported: file.name });
      if (res.data.warnings.length) q.set('warnings', res.data.warnings.join('|'));
      router.push(`/d/${res.data.id}?${q}`);
      return;
    }
    setPending(false);
    setError(res.error.message);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label className={buttonClass('secondary', 'md', `cursor-pointer ${pending ? 'pointer-events-none opacity-60' : ''}`)}>
        {pending ? <Spinner /> : null}
        Import file
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={pending}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>
      <p role={error ? 'alert' : undefined} className={`text-[12px] ${error ? 'text-danger' : 'text-ink-faint'}`}>
        {error ?? (
          <>
            .txt, .md or .docx, up to 2 MB ·{' '}
            <a href="/samples/sample.docx" download className="underline underline-offset-2 hover:text-ink">
              sample file
            </a>
          </>
        )}
      </p>
    </div>
  );
}
