import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'UNPROCESSABLE'
  | 'RATE_LIMITED';

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE: 422,
  RATE_LIMITED: 429,
};

// Thrown anywhere in the server layer; route handlers turn it into JSON.
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }

  get status() {
    return STATUS[this.code];
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, ...error.details } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    const fields = Object.fromEntries(error.issues.map((i) => [i.path.join('.') || 'body', i.message]));
    return NextResponse.json(
      { error: { code: 'UNPROCESSABLE', message: 'Please check the highlighted fields.', fields } },
      { status: 422 },
    );
  }
  console.error(error);
  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'Something went wrong on our side. Please try again.' } },
    { status: 500 },
  );
}
