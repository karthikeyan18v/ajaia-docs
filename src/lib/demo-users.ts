// Seeded accounts for reviewers. The password is public on purpose and is
// listed in the README; real sign-ups use their own hashed passwords.
export const DEMO_PASSWORD = 'ajaia-demo-2026';

export const DEMO_USERS = [
  { name: 'Alice Chen', email: 'alice@ajaia.dev', blurb: 'Owns the Welcome doc' },
  { name: 'Bob Okafor', email: 'bob@ajaia.dev', blurb: 'Editor on Welcome' },
  { name: 'Carol Diaz', email: 'carol@ajaia.dev', blurb: 'Viewer on Welcome' },
] as const;
