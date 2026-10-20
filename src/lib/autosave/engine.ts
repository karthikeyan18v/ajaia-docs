// Framework-free autosave: debounce + max-wait timers, one save in flight,
// one retry for transient failures, and explicit conflict handling. The React
// editor wraps this; the timing rules are unit-tested on their own.

export type ConflictInfo = { revision: number; updatedAt?: string; updatedBy?: { id: string; name: string } | null };

export type SaveOutcome =
  | { ok: true; revision: number }
  | { ok: false; status: number; message: string; current?: ConflictInfo };

export type SaveStatus =
  | { kind: 'saved'; at: number | null }
  | { kind: 'dirty' }
  | { kind: 'saving' }
  | { kind: 'error'; message: string }
  | { kind: 'conflict'; current: ConflictInfo }
  | { kind: 'forbidden'; message: string };

export type Timers = {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
  now: () => number;
};

export type AutosaveOptions = {
  initialRevision: number;
  getContent: () => unknown;
  save: (content: unknown, baseRevision: number, opts: { keepalive: boolean }) => Promise<SaveOutcome>;
  onStatus: (s: SaveStatus) => void;
  debounceMs?: number;
  maxWaitMs?: number;
  retryDelayMs?: number;
  timers?: Timers;
};

export type Autosave = {
  edit(): void;
  flush(opts?: { keepalive?: boolean }): Promise<void>;
  retry(): void;
  resolveKeepMine(currentRevision: number): void;
  resolveTakeTheirs(revision: number): void;
  readonly revision: number;
  readonly status: SaveStatus;
  dispose(): void;
};

const defaultTimers: Timers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  now: () => Date.now(),
};

export function createAutosave(opts: AutosaveOptions): Autosave {
  const t = opts.timers ?? defaultTimers;
  const debounceMs = opts.debounceMs ?? 1500;
  const maxWaitMs = opts.maxWaitMs ?? 10_000;
  const retryDelayMs = opts.retryDelayMs ?? 2000;

  let revision = opts.initialRevision;
  let status: SaveStatus = { kind: 'saved', at: null };
  let editCount = 0; // bumped on every edit
  let savedCount = 0; // editCount captured by the last successful save
  let debounceTimer: unknown = null;
  let maxWaitTimer: unknown = null;
  let retryTimer: unknown = null;
  let inFlight = false;
  let disposed = false;
  let waiters: Array<() => void> = [];

  const dirty = () => editCount > savedCount;
  const blocked = () => status.kind === 'conflict' || status.kind === 'forbidden';

  function setStatus(next: SaveStatus) {
    const changed = next.kind !== status.kind || next.kind === 'saved';
    status = next;
    if (changed && !disposed) opts.onStatus(next);
  }

  function clearTimers() {
    if (debounceTimer !== null) t.clearTimeout(debounceTimer);
    if (maxWaitTimer !== null) t.clearTimeout(maxWaitTimer);
    debounceTimer = maxWaitTimer = null;
  }

  function settle() {
    if (inFlight && !disposed) return;
    const pending = waiters;
    waiters = [];
    pending.forEach((resolve) => resolve());
  }

  function trigger(keepalive = false) {
    if (disposed || blocked() || inFlight || !dirty()) return;
    void runSave(keepalive);
  }

  async function runSave(keepalive: boolean) {
    clearTimers();
    inFlight = true;
    setStatus({ kind: 'saving' });
    let retried = false;

    for (;;) {
      const captured = editCount;
      const result = await opts.save(opts.getContent(), revision, { keepalive });
      if (disposed) return;

      if (result.ok) {
        revision = result.revision;
        savedCount = captured;
        if (dirty()) continue; // edits landed during the request: save the newest content now
        inFlight = false;
        setStatus({ kind: 'saved', at: t.now() });
        return settle();
      }

      if ((result.status === 0 || result.status >= 500) && !retried) {
        retried = true;
        await new Promise<void>((resolve) => (retryTimer = t.setTimeout(resolve, retryDelayMs)));
        retryTimer = null;
        if (disposed) return;
        continue;
      }

      inFlight = false;
      if (result.status === 409) {
        clearTimers();
        setStatus({ kind: 'conflict', current: result.current ?? { revision } });
      } else if (result.status === 403) {
        clearTimers();
        setStatus({ kind: 'forbidden', message: result.message });
      } else {
        setStatus({ kind: 'error', message: result.message });
      }
      return settle();
    }
  }

  return {
    edit() {
      if (disposed) return;
      editCount += 1;
      if (blocked()) return;
      if (!inFlight) setStatus({ kind: 'dirty' });
      if (debounceTimer !== null) t.clearTimeout(debounceTimer);
      debounceTimer = t.setTimeout(() => {
        debounceTimer = null;
        trigger();
      }, debounceMs);
      if (maxWaitTimer === null) {
        maxWaitTimer = t.setTimeout(() => {
          maxWaitTimer = null;
          trigger();
        }, maxWaitMs);
      }
    },

    flush({ keepalive = false } = {}) {
      if (disposed) return Promise.resolve();
      const done = new Promise<void>((resolve) => waiters.push(resolve));
      if (!inFlight) {
        if (dirty() && !blocked()) void runSave(keepalive);
        else settle();
      }
      return done;
    },

    retry() {
      if (status.kind === 'error') trigger();
    },

    resolveKeepMine(currentRevision: number) {
      if (disposed) return;
      revision = currentRevision;
      setStatus({ kind: 'dirty' });
      if (!dirty()) editCount = savedCount + 1; // the local copy differs from the server's even with no new edits
      trigger();
    },

    resolveTakeTheirs(nextRevision: number) {
      revision = nextRevision;
      savedCount = editCount;
      clearTimers();
      setStatus({ kind: 'saved', at: t.now() });
    },

    get revision() {
      return revision;
    },

    get status() {
      return status;
    },

    dispose() {
      disposed = true;
      clearTimers();
      if (retryTimer !== null) t.clearTimeout(retryTimer);
      const pending = waiters;
      waiters = [];
      pending.forEach((resolve) => resolve());
    },
  };
}
