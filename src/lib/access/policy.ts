export type MemberRole = 'editor' | 'viewer';
export type Role = 'owner' | 'editor' | 'viewer' | 'none';
export type Access = { role: Role; via: 'owner' | 'member' | 'link' | 'none' };
export type Action = 'read' | 'edit' | 'rename' | 'delete' | 'share' | 'viewHistory' | 'restore' | 'requestEdit';

const NONE: Access = { role: 'none', via: 'none' };

// Precedence: owner, then explicit membership, then link sharing (signed-in only).
export function resolveRole(
  doc: { ownerId: string; linkAccess: 'restricted' | 'link_view' },
  userId: string | null,
  memberRole: MemberRole | null,
): Access {
  if (userId === null) return { ...NONE };
  if (userId === doc.ownerId) return { role: 'owner', via: 'owner' };
  if (memberRole) return { role: memberRole, via: 'member' };
  if (doc.linkAccess === 'link_view') return { role: 'viewer', via: 'link' };
  return { ...NONE };
}

const MATRIX: Record<Action, readonly Role[]> = {
  read: ['owner', 'editor', 'viewer'],
  edit: ['owner', 'editor'],
  rename: ['owner', 'editor'],
  delete: ['owner'],
  share: ['owner'],
  restore: ['owner'],
  viewHistory: ['owner', 'editor'],
  requestEdit: ['viewer'],
};

export function can(access: Access, action: Action): boolean {
  return MATRIX[action].includes(access.role);
}
