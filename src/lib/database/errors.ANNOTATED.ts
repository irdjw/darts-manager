/**
 * ============================================================================
 * ERRORS.TS — Database Error Normalisation
 * ============================================================================
 *
 * PURPOSE:
 * Takes a raw error from Supabase (which might be a PostgREST error object,
 * a native JS Error, or something else entirely) and normalises it into a
 * consistent shape that the rest of the app can reason about.
 *
 * ⚠️ RELATIONSHIP TO supabase.ts handleDatabaseError():
 * This is a SECOND error handler. supabase.ts exports handleDatabaseError()
 * which maps error codes to human-readable STRINGS. This file's
 * DatabaseErrorHandler.handle() maps them to a structured OBJECT
 * (DatabaseError interface). Both serve similar purposes; this one preserves
 * more detail (hint, status) while the supabase.ts version returns a plain
 * string for display. Most of the codebase uses handleDatabaseError() from
 * supabase.ts; this class is used less frequently.
 *
 * INTERFACE:
 *   DatabaseError {
 *     code?    — PostgREST or PostgreSQL error code (e.g. 'PGRST116', '23505')
 *     message  — Human-readable error message
 *     details? — Additional context from Supabase (e.g. which column failed)
 *     hint?    — Supabase's suggested fix (e.g. "check column name")
 *     status?  — HTTP status code (401, 403, 500, etc.)
 *   }
 *
 * LOGIC:
 *   - If the error has a .code property, it's a structured Supabase error.
 *     All fields are copied over as-is.
 *   - Otherwise it's an unstructured error (native Error, string, etc.).
 *     Only message and details are populated; the raw error becomes details
 *     for debugging.
 */

// The normalised error shape used throughout the app.
export interface DatabaseError {
  code?: string;
  message: string;
  details?: any;
  hint?: string;
  status?: number;
}

export class DatabaseErrorHandler {
  /**
   * HANDLE — Normalise any error into a DatabaseError.
   *
   * INPUT: Anything — a Supabase error object, a native Error, null, etc.
   * OUTPUT: A DatabaseError with as much detail as the input provides.
   *
   * WHY error: any?
   * Catch blocks in TypeScript don't have a typed parameter. The input
   * could be literally anything the throwing code produced.
   */
  static handle(error: any): DatabaseError {
    // Path A: Structured Supabase/PostgREST error (has a .code)
    if (error?.code) {
      return {
        code: error.code,
        message: error.message || 'Database error occurred',
        details: error.details,   // e.g. "Key (id)=(abc) already exists"
        hint: error.hint,         // e.g. "Check your query syntax"
        status: error.status      // e.g. 400, 404, 500
      };
    }

    // Path B: Unstructured error (native Error, string, undefined, etc.)
    // Wrap the whole thing in details so it's inspectable in the console.
    return {
      message: error?.message || 'Unknown database error',
      details: error            // Keep the raw error for debugging
    };
  }
}
