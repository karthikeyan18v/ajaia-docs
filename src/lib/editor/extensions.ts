import StarterKit from '@tiptap/starter-kit';

// The single document schema. The browser editor, server-side validation of
// saves, file import, and the seed script all use this list, so a document can
// never contain a node type the editor doesn't understand.
// Links are off on purpose: no javascript: URLs to sanitize.
export const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: false,
  }),
];
