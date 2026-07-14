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

/**
 * Builds the Express application (no `listen` — so tests can import it).
 * Feature routers are mounted here as later chunks add them.
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
