export type VersionKind = 'created' | 'imported' | 'edit' | 'restore';

export type LatestVersion = {
  kind: VersionKind;
  authorId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const IDLE_GAP_MS = 10 * 60 * 1000;
export const SESSION_CAP_MS = 30 * 60 * 1000;

/**
 * One snapshot row per author editing session. Only an 'edit' row by the same
 * author, still within the idle gap and session cap, may be updated in place;
 * created/imported/restore rows are frozen so v1 is never overwritten.
 */
export function decideSnapshot(
  latest: LatestVersion | null,
  authorId: string,
  now: Date,
): 'insert' | 'update' {
  if (!latest) return 'insert';
  if (latest.kind !== 'edit') return 'insert';
  if (latest.authorId !== authorId) return 'insert';
  const t = now.getTime();
  if (t - latest.updatedAt.getTime() > IDLE_GAP_MS) return 'insert';
  if (t - latest.createdAt.getTime() > SESSION_CAP_MS) return 'insert';
  return 'update';
}
