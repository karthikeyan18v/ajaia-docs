import 'server-only';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { can, resolveRole, type Access, type Action } from '@/lib/access/policy';
import { decideSnapshot } from '@/lib/history/decideSnapshot';
import { docId as docIdSchema } from '@/lib/validation';
import type { Db } from '@/server/db/client';
import { documentMembers, documents, documentVersions, EMPTY_DOC, users, type Document } from '@/server/db/schema';
import { AppError } from '@/server/http/errors';

export type Actor = { id: string; name: string };

// ---------- access ----------

// Loads a document and the caller's access. Strangers get 404 (never 403) so
// the API doesn't confirm a document exists.
export async function getDocWithAccess(db: Db, rawId: string, userId: string) {
  const parsed = docIdSchema.safeParse(rawId);
  if (!parsed.success) throw new AppError('NOT_FOUND', 'Document not found.');
  const [row] = await db
    .select({ doc: documents, memberRole: documentMembers.role })
    .from(documents)
    .leftJoin(documentMembers, and(eq(documentMembers.documentId, documents.id), eq(documentMembers.userId, userId)))
    .where(eq(documents.id, parsed.data))
    .limit(1);
  if (!row) throw new AppError('NOT_FOUND', 'Document not found.');
  const access = resolveRole(row.doc, userId, row.memberRole ?? null);
  if (access.role === 'none') throw new AppError('NOT_FOUND', 'Document not found.');
  return { doc: row.doc, access };
}

export function assertCan(access: Access, action: Action, message = 'You don’t have permission to do that.') {
  if (!can(access, action)) throw new AppError('FORBIDDEN', message);
}

// ---------- reads ----------

type JsonNode = { type?: string; text?: string; attrs?: { level?: number }; content?: JsonNode[] };

// First few blocks of a document as plain text, for dashboard thumbnails.
export function previewBlocks(content: unknown, max = 5): { kind: 'h' | 'p' | 'li'; text: string }[] {
  const out: { kind: 'h' | 'p' | 'li'; text: string }[] = [];
  const textOf = (n: JsonNode): string => (n.text ?? '') + (n.content ?? []).map(textOf).join('');
  const walk = (n: JsonNode, inList = false) => {
    if (out.length >= max) return;
    if (n.type === 'heading' || n.type === 'paragraph') {
      const text = textOf(n).trim();
      if (text) out.push({ kind: n.type === 'heading' ? 'h' : inList ? 'li' : 'p', text: text.slice(0, 140) });
      return;
    }
    const list = inList || n.type === 'bulletList' || n.type === 'orderedList';
    (n.content ?? []).forEach((c) => walk(c, list));
  };
  walk(content as JsonNode);
  return out;
}

export type DocListItem = {
  id: string;
  title: string;
  preview: ReturnType<typeof previewBlocks>;
  updatedAt: Date;
  updatedByName: string | null;
  ownerId: string;
  ownerName: string;
  role: 'owner' | 'editor' | 'viewer';
};

export async function listForUser(db: Db, userId: string): Promise<DocListItem[]> {
  const owner = alias(users, 'owner');
  const editorUser = alias(users, 'editor_user');
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      content: documents.content,
      updatedAt: documents.updatedAt,
      updatedByName: editorUser.name,
      ownerId: documents.ownerId,
      ownerName: owner.name,
      memberRole: documentMembers.role,
    })
    .from(documents)
    .innerJoin(owner, eq(owner.id, documents.ownerId))
    .leftJoin(editorUser, eq(editorUser.id, documents.updatedBy))
    .leftJoin(documentMembers, and(eq(documentMembers.documentId, documents.id), eq(documentMembers.userId, userId)))
    .where(sql`${documents.ownerId} = ${userId} or ${documentMembers.userId} is not null`)
    .orderBy(desc(documents.updatedAt));
  return rows.map(({ memberRole, content, ...r }) => ({
    ...r,
    preview: previewBlocks(content),
    role: r.ownerId === userId ? 'owner' : (memberRole ?? 'viewer'),
  }));
}

export async function getOwnerName(db: Db, ownerId: string) {
  const [row] = await db.select({ name: users.name }).from(users).where(eq(users.id, ownerId)).limit(1);
  return row?.name ?? 'Unknown';
}

export async function listMembers(db: Db, documentId: string) {
  return db
    .select({ userId: users.id, name: users.name, email: users.email, role: documentMembers.role })
    .from(documentMembers)
    .innerJoin(users, eq(users.id, documentMembers.userId))
    .where(eq(documentMembers.documentId, documentId))
    .orderBy(users.name);
}

// ---------- writes ----------

export async function createDoc(
  db: Db,
  ownerId: string,
  input: { title?: string; content?: object; kind?: 'created' | 'imported' } = {},
): Promise<Pick<Document, 'id'>> {
  const content = input.content ?? EMPTY_DOC;
  return db.transaction(async (tx) => {
    const [doc] = await tx
      .insert(documents)
      .values({ ownerId, title: input.title ?? 'Untitled document', content, updatedBy: ownerId })
      .returning({ id: documents.id });
    // Version 1 is the original and is never overwritten.
    await tx.insert(documentVersions).values({
      documentId: doc.id,
      versionNo: 1,
      kind: input.kind ?? 'created',
      content,
      authorId: ownerId,
      revision: 1,
    });
    return doc;
  });
}

export async function renameDoc(db: Db, rawId: string, actor: Actor, title: string) {
  const { doc, access } = await getDocWithAccess(db, rawId, actor.id);
  assertCan(access, 'rename', 'Only the owner and editors can rename this document.');
  // Title is last-write-wins metadata: it doesn't bump the content revision.
  const [row] = await db
    .update(documents)
    .set({ title, updatedAt: sql`now()`, updatedBy: actor.id })
    .where(eq(documents.id, doc.id))
    .returning({ title: documents.title });
  return row;
}

export async function deleteDoc(db: Db, rawId: string, actor: Actor) {
  const { doc, access } = await getDocWithAccess(db, rawId, actor.id);
  assertCan(access, 'delete', 'Only the owner can delete this document.');
  await db.delete(documents).where(eq(documents.id, doc.id));
}

// Optimistic concurrency: the save only applies if nobody saved since the
// client's baseRevision. The row lock taken by the UPDATE also serializes the
// snapshot bookkeeping, so two saves can't pick the same version number.
export async function saveContent(db: Db, rawId: string, actor: Actor, content: object, baseRevision: number) {
  const { doc, access } = await getDocWithAccess(db, rawId, actor.id);
  assertCan(access, 'edit', 'You have view access only. Ask the owner for edit access.');

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(documents)
      .set({ content, revision: sql`${documents.revision} + 1`, updatedAt: sql`now()`, updatedBy: actor.id })
      .where(and(eq(documents.id, doc.id), eq(documents.revision, baseRevision)))
      .returning({ revision: documents.revision, updatedAt: documents.updatedAt });

    if (!updated) {
      const [current] = await tx
        .select({ revision: documents.revision, updatedAt: documents.updatedAt, byId: users.id, byName: users.name })
        .from(documents)
        .leftJoin(users, eq(users.id, documents.updatedBy))
        .where(eq(documents.id, doc.id));
      if (!current) throw new AppError('NOT_FOUND', 'This document was deleted.');
      throw new AppError('CONFLICT', 'Someone else saved a newer version.', {
        current: {
          revision: current.revision,
          updatedAt: current.updatedAt.toISOString(),
          updatedBy: current.byId ? { id: current.byId, name: current.byName } : null,
        },
      });
    }

    const [latest] = await tx
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, doc.id))
      .orderBy(desc(documentVersions.versionNo))
      .limit(1);

    if (latest && decideSnapshot(latest, actor.id, updated.updatedAt) === 'update') {
      await tx
        .update(documentVersions)
        .set({
          content,
          revision: updated.revision,
          saveCount: sql`${documentVersions.saveCount} + 1`,
          updatedAt: updated.updatedAt,
        })
        .where(eq(documentVersions.id, latest.id));
    } else {
      await tx.insert(documentVersions).values({
        documentId: doc.id,
        versionNo: (latest?.versionNo ?? 0) + 1,
        kind: 'edit',
        content,
        authorId: actor.id,
        revision: updated.revision,
        createdAt: updated.updatedAt,
        updatedAt: updated.updatedAt,
      });
    }
    return { revision: updated.revision, updatedAt: updated.updatedAt.toISOString() };
  });
}

// ---------- sharing ----------

export async function shareDoc(db: Db, rawId: string, actor: Actor, email: string, role: 'editor' | 'viewer') {
  const { doc, access } = await getDocWithAccess(db, rawId, actor.id);
  assertCan(access, 'share', 'Only the owner can share this document.');
  const [target] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.email, email)).limit(1);
  if (!target) {
    throw new AppError('UNPROCESSABLE', 'No Ajaia Docs account uses that email.', {
      fields: { email: 'No account uses that email. Demo accounts: alice@, bob@, carol@ajaia.dev.' },
    });
  }
  if (target.id === doc.ownerId) {
    throw new AppError('BAD_REQUEST', 'You already own this document.', { fields: { email: 'That’s you: you own this document.' } });
  }
  const [existing] = await db
    .select({ role: documentMembers.role })
    .from(documentMembers)
    .where(and(eq(documentMembers.documentId, doc.id), eq(documentMembers.userId, target.id)));
  await db
    .insert(documentMembers)
    .values({ documentId: doc.id, userId: target.id, role, grantedBy: actor.id })
    .onConflictDoUpdate({ target: [documentMembers.documentId, documentMembers.userId], set: { role, grantedBy: actor.id } });
  return { member: { userId: target.id, name: target.name, email: target.email, role }, created: !existing };
}

export async function unshareDoc(db: Db, rawId: string, actor: Actor, userId: string) {
  const { doc, access } = await getDocWithAccess(db, rawId, actor.id);
  assertCan(access, 'share', 'Only the owner can change who has access.');
  const parsed = docIdSchema.safeParse(userId);
  if (!parsed.success) throw new AppError('NOT_FOUND', 'That person doesn’t have access.');
  await db
    .delete(documentMembers)
    .where(and(eq(documentMembers.documentId, doc.id), inArray(documentMembers.userId, [parsed.data])));
}
