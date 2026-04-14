import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Express middleware factory that validates req.body against a Zod schema.
 * On failure returns 400 with structured error details.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation Error',
        details: result.error.flatten(),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
