import type { NextFunction, Request, Response } from 'express'
import { db } from '../db/index.js'

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

/** Does this identity map to an account with role 'admin'? The role lives
 *  server-side in the users table, so it can't be forged in the request body. */
export function isAdmin(userId: string | undefined): boolean {
  if (!userId) return false
  const row = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as
    { role: string } | undefined
  return row?.role === 'admin'
}

/**
 * Guard for admin-only endpoints: 401 without identity, 403 when the identity
 * is not the admin account. Every privileged endpoint uses this — the frontend
 * hiding controls is never the enforcement point.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: 'x-user-id header required' })
    return
  }
  if (!isAdmin(req.userId)) {
    res.status(403).json({ error: 'Admin access required' })
    return
  }
  next()
}
