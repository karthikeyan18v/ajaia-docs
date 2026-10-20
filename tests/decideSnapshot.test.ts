import { describe, expect, it } from 'vitest';
import {
  decideSnapshot,
  IDLE_GAP_MS,
  SESSION_CAP_MS,
  type LatestVersion,
} from '@/lib/history/decideSnapshot';

const NOW = new Date('2026-01-01T12:00:00.000Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);

const base = (over: Partial<LatestVersion> = {}): LatestVersion => ({
  kind: 'edit',
  authorId: 'alice',
  createdAt: ago(5 * 60 * 1000),
  updatedAt: ago(60 * 1000),
  ...over,
});

describe('constants', () => {
  it('idle gap is 10 minutes and session cap is 30 minutes', () => {
    expect(IDLE_GAP_MS).toBe(600_000);
    expect(SESSION_CAP_MS).toBe(1_800_000);
  });
});

describe('decideSnapshot', () => {
  const cases: Array<[string, LatestVersion | null, 'insert' | 'update']> = [
    ['no prior version', null, 'insert'],
    ['latest is created (v1 frozen)', base({ kind: 'created' }), 'insert'],
    ['latest is imported', base({ kind: 'imported' }), 'insert'],
    ['latest is restore', base({ kind: 'restore' }), 'insert'],
    ['different author', base({ authorId: 'bob' }), 'insert'],
    ['latest author is null', base({ authorId: null }), 'insert'],
    ['idle gap exceeded by 1ms', base({ updatedAt: ago(IDLE_GAP_MS + 1) }), 'insert'],
    ['idle gap exactly at limit', base({ updatedAt: ago(IDLE_GAP_MS) }), 'update'],
    [
      'session cap exceeded by 1ms',
      base({ createdAt: ago(SESSION_CAP_MS + 1), updatedAt: ago(1000) }),
      'insert',
    ],
    [
      'session cap exactly at limit',
      base({ createdAt: ago(SESSION_CAP_MS), updatedAt: ago(1000) }),
      'update',
    ],
    ['same author, active edit session', base(), 'update'],
  ];

  it.each(cases)('%s -> %s', (_name, latest, expected) => {
    expect(decideSnapshot(latest, 'alice', NOW)).toBe(expected);
  });
});
