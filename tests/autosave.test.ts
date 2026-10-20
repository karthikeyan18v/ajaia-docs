import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutosave, type SaveOutcome, type SaveStatus } from '@/lib/autosave/engine';

type Call = { content: unknown; base: number; keepalive: boolean };

function setup(responder: (call: Call, n: number) => Promise<SaveOutcome> | SaveOutcome) {
  const calls: Call[] = [];
  const statuses: SaveStatus[] = [];
  let content = 0;
  const auto = createAutosave({
    initialRevision: 1,
    getContent: () => content,
    save: async (c, base, { keepalive }) => {
      const call = { content: c, base, keepalive };
      calls.push(call);
      return responder(call, calls.length);
    },
    onStatus: (s) => statuses.push(s),
  });
  const type = () => {
    content += 1;
    auto.edit();
  };
  return { auto, calls, statuses, type };
}

const ok = (revision: number): SaveOutcome => ({ ok: true, revision });

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('autosave engine', () => {
  it('debounces: one save 1.5 s after the last edit', async () => {
    const { calls, type } = setup((c) => ok(c.base + 1));
    type();
    await vi.advanceTimersByTimeAsync(500);
    type();
    await vi.advanceTimersByTimeAsync(500);
    type();
    await vi.advanceTimersByTimeAsync(1499);
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ content: 3, base: 1, keepalive: false });
  });

  it('saves at least every 10 s during continuous typing', async () => {
    const { calls, type } = setup((c) => ok(c.base + 1));
    const times: number[] = [];
    for (let t = 0; t < 25_000; t += 1000) {
      const before = calls.length;
      type();
      await vi.advanceTimersByTimeAsync(1000);
      if (calls.length > before) times.push(t + 1000);
    }
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(times[0]).toBeLessThanOrEqual(10_000);
  });

  it('never runs two saves at once and sends the latest content next', async () => {
    const first = deferred<SaveOutcome>();
    const { calls, type } = setup((c, n) => (n === 1 ? first.promise : ok(c.base + 1)));
    type();
    await vi.advanceTimersByTimeAsync(1500);
    expect(calls).toHaveLength(1);
    type();
    type();
    await vi.advanceTimersByTimeAsync(1500);
    expect(calls).toHaveLength(1);
    first.resolve(ok(2));
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({ content: 3, base: 2 });
  });

  it('retries a network failure once, then reports an error', async () => {
    const { auto, calls, type } = setup(() => ({ ok: false, status: 0, message: 'offline' }));
    type();
    await vi.advanceTimersByTimeAsync(1500);
    await vi.advanceTimersByTimeAsync(2000);
    expect(calls).toHaveLength(2);
    expect(auto.status).toEqual({ kind: 'error', message: 'offline' });
  });

  it('recovers when the retry succeeds', async () => {
    const { auto, calls, type } = setup((c, n) => (n === 1 ? { ok: false, status: 503, message: 'busy' } : ok(5)));
    type();
    await vi.advanceTimersByTimeAsync(3500);
    expect(calls).toHaveLength(2);
    expect(auto.status.kind).toBe('saved');
    expect(auto.revision).toBe(5);
  });

  it('stops on a 409 conflict until the user decides', async () => {
    const current = { revision: 7, updatedBy: { id: 'b', name: 'Bob' } };
    const { auto, calls, type } = setup((c, n) => (n === 1 ? { ok: false, status: 409, message: 'stale', current } : ok(8)));
    type();
    await vi.advanceTimersByTimeAsync(1500);
    expect(auto.status).toEqual({ kind: 'conflict', current });
    type();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(calls).toHaveLength(1);
    auto.resolveKeepMine(7);
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toHaveLength(2);
    expect(calls[1].base).toBe(7);
    expect(auto.status.kind).toBe('saved');
  });

  it('adopts the server copy when taking theirs', async () => {
    const { auto, calls, type } = setup(() => ({ ok: false, status: 409, message: 'stale', current: { revision: 4 } }));
    type();
    await vi.advanceTimersByTimeAsync(1500);
    auto.resolveTakeTheirs(4);
    expect(auto.status.kind).toBe('saved');
    expect(auto.revision).toBe(4);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(calls).toHaveLength(1);
  });

  it('reports lost edit access on 403', async () => {
    const { auto, type } = setup(() => ({ ok: false, status: 403, message: 'view only' }));
    type();
    await vi.advanceTimersByTimeAsync(1500);
    expect(auto.status).toEqual({ kind: 'forbidden', message: 'view only' });
  });

  it('flush saves immediately with keepalive and resolves after it lands', async () => {
    const { auto, calls, type } = setup((c) => ok(c.base + 1));
    type();
    const done = auto.flush({ keepalive: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].keepalive).toBe(true);
    await done;
    expect(auto.status.kind).toBe('saved');
    await vi.advanceTimersByTimeAsync(20_000);
    expect(calls).toHaveLength(1);
  });

  it('flush with nothing to save resolves at once', async () => {
    const { auto, calls } = setup((c) => ok(c.base + 1));
    await auto.flush();
    expect(calls).toHaveLength(0);
  });

  it('dispose cancels pending saves', async () => {
    const { auto, calls, type } = setup((c) => ok(c.base + 1));
    type();
    auto.dispose();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(calls).toHaveLength(0);
  });
});
