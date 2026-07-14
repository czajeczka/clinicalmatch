import type { NextFunction, Request, Response } from 'express'
import { z, type ZodType } from 'zod'
import { DISEASES, type Disease } from '../types.js'

// Zod schema for the five canonical diseases (keeps the Disease union type).
export const diseaseSchema = z.enum(
  DISEASES as unknown as [Disease, ...Disease[]]
)

/**
 * Middleware factory: validate `req.body` against a Zod schema. On failure,
 * responds 400 `{ error, details }`; on success, replaces `req.body` with the
 * parsed (typed) value and continues.
 */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: z.flattenError(result.error),
      })
      return
    }
    req.body = result.data
    next()
  }
}
