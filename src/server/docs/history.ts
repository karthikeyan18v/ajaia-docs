import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Db } from '@/server/db/client';
import { documents, documentVersions, users } from '@/server/db/schema';
import { AppError } from '@/server/http/errors';
import { assertCan, getDocWithAccess, type Actor } from './service';

export type VersionSummary = {
  versionNo: number;
  kind: 'created' | 'imported' | 'edit' | 'restore';
  authorName: string | null;
  restoredFrom: number | null;
  saveCount: number;
  createdAt: string;
  updatedAt: string;
};

export async function listVersions(db: Db, rawId: string, actor: Actor): Promise<VersionSummary[]> {
  const { doc, access } = await getDocWithAccess(db, rawId, actor.id);
  assertCan(access, 'viewHistory', 'Only the owner and editors can see version history.');
  const rows = await db
    .select({
      versionNo: documentVersions.versionNo,
      kind: documentVersions.kind,
      authorName: users.name,
      restoredFrom: documentVersions.restoredFrom,
      saveCount: documentVersions.saveCount,
      createdAt: documentVersions.createdAt,
      updatedAt: documentVersions.updatedAt,
    })
    .from(documentVersions)
    .leftJoin(users, eq(users.id, documentVersions.authorId))
    .where(eq(documentVersions.documentId, doc.id))
    .orderBy(desc(documentVersions.versionNo));
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }));
}

function parseVersionNo(raw: string) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new AppError('NOT_FOUND', 'That version doesn’t exist.');
  return n;
}

export async function getVersion(db: Db, rawId: string, actor: Actor, rawNo: string) {
  const { doc, access } = await getDocWithAccess(db, rawId, actor.id);
  assertCan(access, 'viewHistory', 'Only the owner and editors can see version history.');
  const [row] = await db
    .select({ versionNo: documentVersions.versionNo, content: documentVersions.content })
    .from(documentVersions)
    .where(and(eq(documentVersions.documentId, doc.id), eq(documentVersions.versionNo, parseVersionNo(rawNo))));
  if (!row) throw new AppError('NOT_FOUND', 'That version doesn’t exist.');
  return row;
}

// Restoring never deletes anything: the old version's content becomes the
// current document and is recorded as a new "restore" version on top.
export async function restoreVersion(db: Db, rawId: string, actor: Actor, rawNo: string) {
  const { doc, access } = await getDocWithAccess(db, rawId, actor.id);
  assertCan(access, 'restore', 'Only the owner can restore a version.');
  const versionNo = parseVersionNo(rawNo);

  return db.transaction(async (tx) => {
    // Lock the document row first so concurrent saves queue behind the restore.
    const [locked] = await tx
      .update(documents)
      .set({ revision: sql`${documents.revision} + 1`, updatedAt: sql`now()`, updatedBy: actor.id })
      .where(eq(documents.id, doc.id))
      .returning({ revision: documents.revision, updatedAt: documents.updatedAt });

    const [latest] = await tx
      .select({ versionNo: documentVersions.versionNo })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, doc.id))
      .orderBy(desc(documentVersions.versionNo))
      .limit(1);
    if (latest?.versionNo === versionNo) throw new AppError('BAD_REQUEST', 'That version is already the current one.');

    const [source] = await tx
      .select({ content: documentVersions.content })
      .from(documentVersions)
      .where(and(eq(documentVersions.documentId, doc.id), eq(documentVersions.versionNo, versionNo)));
    if (!source) throw new AppError('NOT_FOUND', 'That version doesn’t exist.');

    await tx.update(documents).set({ content: source.content }).where(eq(documents.id, doc.id));
    await tx.insert(documentVersions).values({
      documentId: doc.id,
      versionNo: (latest?.versionNo ?? 0) + 1,
      kind: 'restore',
      content: source.content,
      authorId: actor.id,
      restoredFrom: versionNo,
      revision: locked.revision,
      createdAt: locked.updatedAt,
      updatedAt: locked.updatedAt,
    });
    return { revision: locked.revision };
  });
}
