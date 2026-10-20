import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

// Every table has RLS enabled with no policies. The app connects as the table
// owner (bypasses RLS); Supabase's public REST API therefore sees nothing.

export const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] } as const;

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(), // always stored lower-cased
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

// Fixed-window counters for login and share attempts. In-memory limits don't
// survive across serverless instances, so this lives in the database.
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  count: integer('count').notNull(),
}).enableRLS();

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('Untitled document'),
    content: jsonb('content').notNull().default(EMPTY_DOC),
    // Optimistic-concurrency counter. Bumped by content saves and restores, not renames.
    revision: integer('revision').notNull().default(1),
    linkAccess: text('link_access', { enum: ['restricted', 'link_view'] }).notNull().default('restricted'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('documents_owner_updated_idx').on(t.ownerId, t.updatedAt.desc()),
    check('documents_title_len', sql`char_length(${t.title}) between 1 and 200`),
    check('documents_link_access', sql`${t.linkAccess} in ('restricted', 'link_view')`),
    check('documents_revision_pos', sql`${t.revision} >= 1`),
  ],
).enableRLS();

export const documentMembers = pgTable(
  'document_members',
  {
    documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['editor', 'viewer'] }).notNull(),
    grantedBy: uuid('granted_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.documentId, t.userId] }),
    index('document_members_user_idx').on(t.userId),
    check('document_members_role', sql`${t.role} in ('editor', 'viewer')`),
  ],
).enableRLS();

// One row per author editing session. The newest row always equals
// documents.content, so the original (version 1) can never be overwritten.
export const documentVersions = pgTable(
  'document_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
    versionNo: integer('version_no').notNull(),
    kind: text('kind', { enum: ['created', 'imported', 'edit', 'restore'] }).notNull(),
    content: jsonb('content').notNull(),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    restoredFrom: integer('restored_from'),
    saveCount: integer('save_count').notNull().default(1),
    revision: integer('revision').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('document_versions_doc_no').on(t.documentId, t.versionNo),
    check('document_versions_kind', sql`${t.kind} in ('created', 'imported', 'edit', 'restore')`),
  ],
).enableRLS();

export type User = typeof users.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type DocumentMember = typeof documentMembers.$inferSelect;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type MemberRole = DocumentMember['role'];
