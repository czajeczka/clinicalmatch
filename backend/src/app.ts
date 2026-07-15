import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from 'express'
import cors from 'cors'
import { config } from './config.js'
import { identity } from './middleware/identity.js'
import { usersRouter } from './routes/users.js'
import { trialsRouter } from './routes/trials.js'
import { savedRouter } from './routes/saved.js'
import { groupsRouter } from './routes/groups.js'
import { membershipsRouter } from './routes/memberships.js'
import { discussionsRouter } from './routes/discussions.js'
import { repliesRouter } from './routes/replies.js'
import { notificationsRouter } from './routes/notifications.js'
import { syncRouter } from './routes/sync.js'
import { aiRouter } from './routes/ai.js'

/**
 * Builds the Express application (no `listen` — so tests can import it).
 * Feature routers are mounted here as later chunks add them.
 *
 * Deferred building blocks reuse this same REST API rather than duplicating it,
 * and are intentionally NOT implemented in these chunks:
 *   TODO: MCP (later seminar) — an MCP server exposing search/get/save as tools.
 *   TODO: autonomous agent (later seminar) — a Telegram agent reusing the tools.
 *   TODO: RAG (later seminar) — grounded "ask about this trial".
 *   TODO: n8n workflow (later seminar) — see the POST /notifications log target.
 *   TODO: LLM API (seminar 6) — the remaining three AI features (plain-language
 *     criteria, trial summary, post enhancement) are still mocked on the client;
 *     eligibility self-check is live via /ai (see routes/ai.ts + ai/llm.ts).
 */
export function createApp() {
  const app = express()

  app.use(express.json())
  app.use(cors({ origin: config.CORS_ORIGIN }))
  app.use(identity) // attach req.userId from the x-user-id header

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' })
  })

  // Feature routers.
  app.use('/users', usersRouter)
  app.use('/trials', trialsRouter)
  app.use('/saved-trials', savedRouter)
  app.use('/groups', groupsRouter)
  app.use('/memberships', membershipsRouter)
  // Mounted at root: owns /discussions/* and /groups/:groupId/discussions.
  app.use(discussionsRouter)
  // Mounted at root: owns /discussions/:id/replies and /replies/:id.
  app.use(repliesRouter)
  app.use('/notifications', notificationsRouter)
  app.use('/admin/sync', syncRouter)
  // AI smart features (seminar 6) — go through the shared LLM abstraction layer.
  app.use('/ai', aiRouter)

  // 404 for anything unmatched.
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' })
  })

  // Final error handler — always responds with { error: string }.
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const message = err instanceof Error ? err.message : 'Internal server error'
    res.status(500).json({ error: message })
  }
  app.use(errorHandler)

  return app
}

export const app = createApp()
