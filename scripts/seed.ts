// Idempotent demo seed: `pnpm db:seed` resets the demo accounts and their
// documents to a known state (run again after a review session to clean up).
// Uses the session pooler (DIRECT_URL). Real sign-ups are left untouched.
import { generateJSON } from '@tiptap/html/server';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { extensions } from '../src/lib/editor/extensions';
import { DEMO_PASSWORD, DEMO_USERS } from '../src/lib/demo-users';
import { hashPassword } from '../src/server/auth/password';
import * as schema from '../src/server/db/schema';

const { users, documents, documentMembers, documentVersions } = schema;

const WELCOME_V1 = `
<h1>Welcome to Ajaia Docs</h1>
<p>This document is owned by <strong>Alice</strong>. Bob can <em>edit</em> it and Carol can only <u>view</u> it.</p>
<h2>Try this</h2>
<ol>
  <li><p>Sign in as Bob and add a sentence. It saves on its own.</p></li>
  <li><p>Sign in as Carol: the toolbar is gone because she is a viewer.</p></li>
  <li><p>As Alice, open <strong>Share</strong> to change who can access this.</p></li>
</ol>
<h3>Formatting</h3>
<ul>
  <li><p><strong>Bold</strong>, <em>italic</em> and <u>underline</u></p></li>
  <li><p>Headings, bulleted and numbered lists</p></li>
</ul>`;

const WELCOME_V2 = WELCOME_V1 + `<p>Bob here: I added this paragraph as an editor. Alice’s original is still version 1.</p>`;

const ROADMAP = `
<h1>Q4 roadmap notes</h1>
<p>Owned by <strong>Bob</strong> and shared with Alice as a viewer.</p>
<ul>
  <li><p>Ship import for .docx files</p></li>
  <li><p>Version history for owners</p></li>
</ul>`;

const toDoc = (html: string) => generateJSON(html, extensions);

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('Set DIRECT_URL (or DATABASE_URL) in .env.local');
  const sql = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(sql, { schema });

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const ids: Record<string, string> = {};
  for (const u of DEMO_USERS) {
    const [row] = await db
      .insert(users)
      .values({ name: u.name, email: u.email, passwordHash })
      .onConflictDoUpdate({ target: users.email, set: { name: u.name, passwordHash } })
      .returning({ id: users.id });
    ids[u.email] = row.id;
  }
  const alice = ids['alice@ajaia.dev'];
  const bob = ids['bob@ajaia.dev'];
  const carol = ids['carol@ajaia.dev'];

  await db.transaction(async (tx) => {
    // Reset only documents owned by demo users.
    await tx.delete(documents).where(inArray(documents.ownerId, [alice, bob, carol]));

    const v1 = toDoc(WELCOME_V1);
    const v2 = toDoc(WELCOME_V2);
    const [welcome] = await tx
      .insert(documents)
      .values({ ownerId: alice, title: 'Welcome to Ajaia Docs', content: v2, revision: 2, updatedBy: bob })
      .returning({ id: documents.id });
    await tx.insert(documentVersions).values([
      { documentId: welcome.id, versionNo: 1, kind: 'created', content: v1, authorId: alice, revision: 1 },
      { documentId: welcome.id, versionNo: 2, kind: 'edit', content: v2, authorId: bob, revision: 2 },
    ]);
    await tx.insert(documentMembers).values([
      { documentId: welcome.id, userId: bob, role: 'editor', grantedBy: alice },
      { documentId: welcome.id, userId: carol, role: 'viewer', grantedBy: alice },
    ]);

    const roadmapDoc = toDoc(ROADMAP);
    const [roadmap] = await tx
      .insert(documents)
      .values({ ownerId: bob, title: 'Q4 roadmap notes', content: roadmapDoc, updatedBy: bob })
      .returning({ id: documents.id });
    await tx.insert(documentVersions).values({
      documentId: roadmap.id, versionNo: 1, kind: 'created', content: roadmapDoc, authorId: bob, revision: 1,
    });
    await tx.insert(documentMembers).values({ documentId: roadmap.id, userId: alice, role: 'viewer', grantedBy: bob });
  });

  const count = await db.select({ id: documents.id }).from(documents).where(eq(documents.ownerId, alice));
  console.log(`Seeded ${DEMO_USERS.length} demo users; alice owns ${count.length} doc(s). Password: ${DEMO_PASSWORD}`);
  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
