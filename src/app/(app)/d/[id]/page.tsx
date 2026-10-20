import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { DocEditor } from '@/components/editor/DocEditor';
import { getCurrentUser } from '@/server/auth/session';
import { db } from '@/server/db/client';
import { listPendingRequests, myLatestRequest } from '@/server/docs/requests';
import { getDocWithAccess, getOwnerName, listMembers } from '@/server/docs/service';
import { AppError } from '@/server/http/errors';

export const metadata: Metadata = { title: 'Document' };

export default async function DocPage({ params, searchParams }: PageProps<'/d/[id]'>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { id } = await params;
  const sp = await searchParams;

  let loaded;
  try {
    loaded = await getDocWithAccess(db(), id, user.id);
  } catch (error) {
    if (error instanceof AppError && error.code === 'NOT_FOUND') notFound();
    throw error;
  }
  const { doc, access } = loaded;
  const isOwner = access.role === 'owner';
  const [ownerName, members, requests, myRequest] = await Promise.all([
    isOwner ? user.name : getOwnerName(db(), doc.ownerId),
    isOwner ? listMembers(db(), doc.id) : Promise.resolve([]),
    isOwner ? listPendingRequests(db(), doc.id) : Promise.resolve([]),
    access.role === 'viewer' ? myLatestRequest(db(), doc.id, user.id) : Promise.resolve(null),
  ]);

  const imported = typeof sp.imported === 'string' ? sp.imported : null;
  const warnings = typeof sp.warnings === 'string' ? sp.warnings.split('|').filter(Boolean) : [];

  return (
    <DocEditor
      key={doc.id}
      doc={{ id: doc.id, title: doc.title, content: doc.content as object, revision: doc.revision }}
      role={access.role as 'owner' | 'editor' | 'viewer'}
      viaLink={access.via === 'link'}
      owner={{ id: doc.ownerId, name: ownerName }}
      me={user}
      sharing={{
        members,
        linkAccess: doc.linkAccess,
        requests: requests.map((r) => ({ id: r.id, userId: r.userId, name: r.name, email: r.email })),
      }}
      myRequest={myRequest?.status ?? null}
      notice={imported ? { imported, warnings } : sp.new ? { created: true } : null}
    />
  );
}
