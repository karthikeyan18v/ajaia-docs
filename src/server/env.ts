import 'server-only';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.url(),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  CRON_SECRET: z.string().min(16).optional(),
});

let cached: z.infer<typeof schema> | undefined;

// Validated lazily so `next build` doesn't need secrets, but the first request
// with a missing variable fails loudly instead of half-working.
export function env() {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
      throw new Error(`Invalid environment configuration: ${fields}`);
    }
    cached = parsed.data;
  }
  return cached;
}
