import type { NextFunction, Request, Response } from 'express'

// Device-based anonymous identity (no login). The client generates a userId on
// first run and sends it as `x-user-id` on every request. This middleware reads
// it onto `req.userId`; `requireUser` guards endpoints that need an identity.

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

/** Attach `req.userId` from the `x-user-id` header when present. */
export function identity(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('x-user-id')
  if (header && header.trim()) {
    req.userId = header.trim()
  }
  next()
}

/** Guard: 401 when no identity is present. Public reads don't use this. */
export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: 'x-user-id header required' })
    return
  }
  next()
}
