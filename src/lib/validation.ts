import { z } from 'zod';

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: 'Enter a valid email address.' }));

export const loginInput = z.object({
  email,
  password: z.string().min(1, 'Enter your password.').max(200),
});

export const signupInput = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(80, 'Keep your name under 80 characters.'),
  email,
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .max(200, 'Keep your password under 200 characters.'),
});

export const title = z
  .string()
  .trim()
  .min(1, 'Title can’t be empty.')
  .max(200, 'Keep the title under 200 characters.');

export const docId = z.uuid();
