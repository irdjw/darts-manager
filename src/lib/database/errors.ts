export interface DatabaseError {
  code?: string;
  message: string;
  details?: any;
  hint?: string;
  status?: number;
}

export class DatabaseErrorHandler {
  static handle(error: any): DatabaseError {
    if (error?.code) {
      return {
        code: error.code,
        message: error.message || 'Database error occurred',
        details: error.details,
        hint: error.hint,
        status: error.status
      };
    }
    
    return {
      message: error?.message || 'Unknown database error',
      details: error
    };
  }
}