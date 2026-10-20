import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Db } from '@/server/db/client';
import { accessRequests, documentMembers, documents, users } from '@/server/db/schema';
import { AppError } from '@/server/http/errors';
import { assertCan, getDocWithAccess, type Actor } from './service';

export type LinkAccess = 'restricted' | 'link_view';

export async function setLinkAccess(db: Db, rawId: string, actor: Actor, linkAccess: LinkAccess) {
  const { doc, access } = await getDocWithAccess(db, rawId, actor.id);
  assertCan(access, 'share', 'Only the owner can change link access.');
  await db.update(documents).set({ linkAccess }).where(eq(documents.id, doc.id));
  return { linkAccess };
}

// Idempotent: asking twice returns the same pending request.
export async function requestEdit(db: Db, rawId: string, actor: Actor) {
  const { doc, access } = await getDocWithAccess(db, rawId, actor.id);
  if (access.role === 'owner' || access.role === 'editor') {
    throw new AppError('BAD_REQUEST', 'You can already edit this document.');
  }
  assertCan(access, 'requestEdit');
  await db
    .insert(accessRequests)
    .values({ documentId: doc.id, requesterId: actor.id })
    .onConflictDoNothing({ target: [accessRequests.documentId, accessRequests.requesterId], where: sql`status = 'pending'` });
  return myLatestRequest(db, doc.id, actor.id);
}

export async function myLatestRequest(db: Db, documentId: string, userId: string) {
  const [row] = await db
    .select({ id: accessRequests.id, status: accessRequests.status })
    .from(accessRequests)
    .where(and(eq(accessRequests.documentId, documentId), eq(accessRequests.requesterId, userId)))
    .orderBy(desc(accessRequests.createdAt))
    .limit(1);
  return row ?? null;
}

export async function listPendingRequests(db: Db, documentId: string) {
  return db
    .select({ id: accessRequests.id, userId: users.id, name: users.name, email: users.email, createdAt: accessRequests.createdAt })
    .from(accessRequests)
    .innerJoin(users, eq(users.id, accessRequests.requesterId))
    .where(and(eq(accessRequests.documentId, documentId), eq(accessRequests.status, 'pending')))
    .orderBy(accessRequests.createdAt);
}

// Approve = the requester becomes an editor, in one transaction with the decision.
export async function decideRequest(db: Db, rawId: string, actor: Actor, requestId: string, decision: 'approve' | 'deny') {
  const { doc, access } = await getDocWithAccess(db, rawId, actor.id);
  assertCan(access, 'share', 'Only the owner can answer access requests.');
  return db.transaction(async (tx) => {
    const [req] = await tx
      .update(accessRequests)
      .set({ status: decision === 'approve' ? 'approved' : 'denied', decidedAt: sql`now()`, decidedBy: actor.id })
      .where(and(eq(accessRequests.id, requestId), eq(accessRequests.documentId, doc.id), eq(accessRequests.status, 'pending')))
      .returning({ requesterId: accessRequests.requesterId });
    if (!req) throw new AppError('CONFLICT', 'That request was already answered.');
    if (decision === 'approve') {
      await tx
        .insert(documentMembers)
        .values({ documentId: doc.id, userId: req.requesterId, role: 'editor', grantedBy: actor.id })
        .onConflictDoUpdate({ target: [documentMembers.documentId, documentMembers.userId], set: { role: 'editor', grantedBy: actor.id } });
    }
    const [user] = await tx.select({ userId: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, req.requesterId));
    return { member: decision === 'approve' ? { ...user, role: 'editor' as const } : null };
  });
}
