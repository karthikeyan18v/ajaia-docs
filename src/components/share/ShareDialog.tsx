'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api-client';

export type Member = { userId: string; name: string; email: string; role: 'editor' | 'viewer' };
export type LinkAccess = 'restricted' | 'link_view';
export type PendingRequest = { id: string; userId: string; name: string; email: string };

const selectClass =
  'h-11 rounded-[var(--radius-control)] border border-line bg-paper px-2 text-[15px] text-ink hover:border-line-strong focus:outline-none focus:border-ink focus:ring-2 focus:ring-mark';

export function ShareDialog({
  open,
  onClose,
  docId,
  owner,
  initialMembers,
  initialLinkAccess,
  initialRequests,
  onRequestsChange,
}: {
  open: boolean;
  onClose: () => void;
  docId: string;
  owner: { id: string; name: string; email: string };
  initialMembers: Member[];
  initialLinkAccess: LinkAccess;
  initialRequests: PendingRequest[];
  onRequestsChange: (count: number) => void;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [members, setMembers] = useState(initialMembers);
  const [linkAccess, setLinkAccess] = useState<LinkAccess>(initialLinkAccess);
  const [requests, setRequests] = useState(initialRequests);

  async function changeLinkAccess(next: LinkAccess) {
    const prev = linkAccess;
    setLinkAccess(next);
    const res = await api(`/api/docs/${docId}/link`, { method: 'PUT', json: { linkAccess: next } });
    if (!res.ok) {
      setLinkAccess(prev);
      setError(res.error.message);
    } else flash(next === 'link_view' ? 'Anyone signed in with the link can now view.' : 'Only people you added can open it.');
  }

  async function decide(r: PendingRequest, decision: 'approve' | 'deny') {
    const res = await api<{ member: Member | null }>(`/api/docs/${docId}/requests/${r.id}`, { method: 'PATCH', json: { decision } });
    const remaining = requests.filter((x) => x.id !== r.id);
    if (!res.ok && res.error.status !== 409) {
      setError(res.error.message);
      return;
    }
    setRequests(remaining);
    onRequestsChange(remaining.length);
    if (res.ok && res.data.member) {
      const m = res.data.member;
      setMembers((list) => [...list.filter((x) => x.userId !== m.userId), m].sort((a, b) => a.name.localeCompare(b.name)));
      flash(`${r.name} can now edit.`);
    } else if (res.ok) flash(`Declined ${r.name}’s request.`);
  }
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function flash(msg: string) {
    setNote(msg);
    setTimeout(() => setNote((n) => (n === msg ? null : n)), 2500);
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await api<{ member: Member }>(`/api/docs/${docId}/members`, { method: 'POST', json: { email, role } });
    setPending(false);
    if (!res.ok) {
      setError(res.error.fields?.email ?? res.error.message);
      return;
    }
    const m = res.data.member;
    setMembers((list) => [...list.filter((x) => x.userId !== m.userId), m].sort((a, b) => a.name.localeCompare(b.name)));
    setEmail('');
    flash(`${m.name} can now ${m.role === 'editor' ? 'edit' : 'view'} this document.`);
    router.refresh();
  }

  async function changeRole(m: Member, next: 'viewer' | 'editor') {
    const prev = members;
    setMembers((list) => list.map((x) => (x.userId === m.userId ? { ...x, role: next } : x)));
    const res = await api(`/api/docs/${docId}/members`, { method: 'POST', json: { email: m.email, role: next } });
    if (!res.ok) {
      setMembers(prev);
      setError(res.error.message);
    } else flash(`${m.name} ${next === 'editor' ? 'can now edit' : 'is now view only'}.`);
  }

  async function remove(m: Member) {
    const prev = members;
    setMembers((list) => list.filter((x) => x.userId !== m.userId));
    const res = await api(`/api/docs/${docId}/members/${m.userId}`, { method: 'DELETE' });
    if (!res.ok) {
      setMembers(prev);
      setError(res.error.message);
    } else flash(`Removed ${m.name}.`);
  }

  async function copyLink() {
    const url = `${window.location.origin}/d/${docId}`;
    try {
      await navigator.clipboard.writeText(url);
      flash(linkAccess === 'link_view' ? 'Link copied. Anyone signed in can view it.' : 'Link copied. Only people with access can open it.');
    } catch {
      window.prompt('Copy this link', url);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="share-title"
      className="m-auto w-[min(520px,calc(100vw-24px))] rounded-[var(--radius-panel)] border border-line bg-paper p-0 text-ink shadow-[0_24px_60px_-20px_oklch(0.22_0.012_250/0.35)] backdrop:bg-ink/30 max-sm:mb-0 max-sm:w-full max-sm:max-w-full max-sm:rounded-b-none"
    >
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 id="share-title" className="text-[18px] font-semibold">
            Share
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-m-2 grid size-10 place-items-center rounded text-ink-soft hover:bg-panel hover:text-ink">
            ×
          </button>
        </div>

        {requests.length ? (
          <section aria-labelledby="req-title" className="flex flex-col gap-2 rounded-[var(--radius-panel)] bg-mark-soft p-3">
            <h3 id="req-title" className="text-[13px] font-medium">
              Asking for edit access
            </h3>
            <ul className="flex flex-col gap-2">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <Avatar name={r.name} idKey={r.email} size={28} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{r.name}</span>
                    <span className="truncate text-[13px] text-ink-soft">{r.email}</span>
                  </span>
                  <span className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => decide(r, 'deny')}>
                      Deny
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => decide(r, 'approve')}>
                      Allow editing
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <form onSubmit={add} noValidate className="flex flex-col gap-2">
          <label htmlFor="share-email" className="text-[13px] font-medium text-ink-soft">
            Add people by email
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="share-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="bob@ajaia.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'share-error' : undefined}
              className={`h-11 min-w-0 flex-1 basis-56 rounded-[var(--radius-control)] border bg-paper px-3 text-[16px] placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-mark ${error ? 'border-danger' : 'border-line'}`}
            />
            <select aria-label="Permission" value={role} onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')} className={selectClass}>
              <option value="viewer">Can view</option>
              <option value="editor">Can edit</option>
            </select>
            <Button type="submit" variant="primary" pending={pending} disabled={!email.trim()}>
              Share
            </Button>
          </div>
          {error ? (
            <p id="share-error" role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          ) : (
            <p className="text-[13px] text-ink-faint">New people can view only, unless you choose “Can edit”.</p>
          )}
        </form>

        <div className="flex flex-col gap-2">
          <h3 className="text-[13px] font-medium text-ink-soft">People with access</h3>
          <ul className="flex flex-col divide-y divide-line">
            <li className="flex items-center gap-3 py-2.5">
              <Avatar name={owner.name} idKey={owner.email} size={32} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{owner.name} (you)</span>
                <span className="truncate text-[13px] text-ink-faint">{owner.email}</span>
              </span>
              <span className="text-[13px] text-ink-soft">Owner</span>
            </li>
            {members.map((m) => (
              <li key={m.userId} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                <Avatar name={m.name} idKey={m.email} size={32} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{m.name}</span>
                  <span className="truncate text-[13px] text-ink-faint">{m.email}</span>
                </span>
                <span className="flex items-center gap-1">
                  <select
                    aria-label={`Permission for ${m.name}`}
                    value={m.role}
                    onChange={(e) => changeRole(m, e.target.value as 'viewer' | 'editor')}
                    className={selectClass}
                  >
                    <option value="viewer">Can view</option>
                    <option value="editor">Can edit</option>
                  </select>
                  <Button variant="ghost" size="sm" onClick={() => remove(m)} aria-label={`Remove ${m.name}`}>
                    Remove
                  </Button>
                </span>
              </li>
            ))}
          </ul>
          {members.length === 0 ? <p className="text-[14px] text-ink-faint">Only you can open this document.</p> : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <label htmlFor="link-access" className="text-[13px] font-medium text-ink-soft">
            General access
          </label>
          <select
            id="link-access"
            value={linkAccess}
            onChange={(e) => changeLinkAccess(e.target.value as LinkAccess)}
            className={selectClass}
          >
            <option value="restricted">Restricted: only people added above</option>
            <option value="link_view">Anyone with the link can view</option>
          </select>
          <p className="text-[13px] text-ink-faint">
            {linkAccess === 'link_view'
              ? 'Anyone signed in to Ajaia Docs with the link can read it. Nobody can edit unless you allow it.'
              : 'People without access see “not available”, so the document stays private.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" aria-live="polite" className="min-h-5 text-[13px] text-ink-soft">
            {note}
          </p>
          <Button variant="secondary" size="sm" onClick={copyLink}>
            Copy link
          </Button>
        </div>
      </div>
    </dialog>
  );
}
