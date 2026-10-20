import { describe, expect, it } from 'vitest';
import { can, resolveRole, type Access, type Action, type Role } from '@/lib/access/policy';

const actions: Action[] = ['read', 'edit', 'rename', 'delete', 'share', 'viewHistory', 'restore', 'requestEdit'];

// Expected permissions per role; anything not listed is denied.
const allowed: Record<Role, Action[]> = {
  owner: ['read', 'edit', 'rename', 'delete', 'share', 'viewHistory', 'restore'],
  editor: ['read', 'edit', 'rename', 'viewHistory'],
  viewer: ['read', 'requestEdit'],
  none: [],
};

const viaFor: Record<Role, Access['via']> = { owner: 'owner', editor: 'member', viewer: 'member', none: 'none' };

const cases = (Object.keys(allowed) as Role[]).flatMap((role) =>
  actions.map((action) => ({ role, action, expected: allowed[role].includes(action) })),
);

describe('can', () => {
  it('covers all 32 role x action pairs', () => {
    expect(cases).toHaveLength(32);
  });

  it.each(cases)('$role $action -> $expected', ({ role, action, expected }) => {
    expect(can({ role, via: viaFor[role] }, action)).toBe(expected);
  });

  it('lets a link viewer request edit and read, nothing else', () => {
    const link: Access = { role: 'viewer', via: 'link' };
    expect(actions.filter((a) => can(link, a))).toEqual(['read', 'requestEdit']);
  });
});

describe('resolveRole', () => {
  const restricted = { ownerId: 'u-owner', linkAccess: 'restricted' as const };
  const linked = { ownerId: 'u-owner', linkAccess: 'link_view' as const };

  it('owner beats a member row', () => {
    expect(resolveRole(restricted, 'u-owner', 'viewer')).toEqual({ role: 'owner', via: 'owner' });
    expect(resolveRole(linked, 'u-owner', 'editor')).toEqual({ role: 'owner', via: 'owner' });
  });

  it('owner with no member row is owner', () => {
    expect(resolveRole(restricted, 'u-owner', null)).toEqual({ role: 'owner', via: 'owner' });
  });

  it('member role applies on a restricted doc', () => {
    expect(resolveRole(restricted, 'u-ed', 'editor')).toEqual({ role: 'editor', via: 'member' });
    expect(resolveRole(restricted, 'u-vw', 'viewer')).toEqual({ role: 'viewer', via: 'member' });
  });

  it('editor membership beats link access', () => {
    expect(resolveRole(linked, 'u-ed', 'editor')).toEqual({ role: 'editor', via: 'member' });
  });

  it('viewer membership is reported as member, not link', () => {
    expect(resolveRole(linked, 'u-vw', 'viewer')).toEqual({ role: 'viewer', via: 'member' });
  });

  it('link access grants viewer to a signed-in stranger', () => {
    expect(resolveRole(linked, 'u-stranger', null)).toEqual({ role: 'viewer', via: 'link' });
  });

  it('link access does not apply to a signed-out user', () => {
    expect(resolveRole(linked, null, null)).toEqual({ role: 'none', via: 'none' });
  });

  it('restricted stranger is none', () => {
    expect(resolveRole(restricted, 'u-stranger', null)).toEqual({ role: 'none', via: 'none' });
  });

  it('null user is none even with a member role passed', () => {
    expect(resolveRole(restricted, null, 'editor')).toEqual({ role: 'none', via: 'none' });
    expect(resolveRole(linked, null, 'viewer')).toEqual({ role: 'none', via: 'none' });
  });
});
