import type { Response } from 'express'
import { LlmError } from '../ai/llm.js'

// Shared failure handling for the AI feature routes. A final LLM failure
// (`LlmError`) is a calm, expected outcome — the client renders an inline
// fallback and the rest of the app keeps working — so it maps to 502 with a
// non-alarming message. Anything else is a genuine bug and is rethrown so the
// app's generic error handler turns it into a 500.

export const AI_UNAVAILABLE_MESSAGE =
  "The assistant couldn't complete this right now. Please try again in a moment."

/** Respond to an AI-route failure: 502 for an LlmError, otherwise rethrow. */
export function sendAiError(res: Response, err: unknown): void {
  if (err instanceof LlmError) {
    res.status(502).json({ error: AI_UNAVAILABLE_MESSAGE })
    return
  }
  throw err
}
