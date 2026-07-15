import { app } from './app.js'
import { config } from './config.js'
import { startScheduler } from './sync/scheduler.js'

app.listen(config.PORT, () => {
  console.log(`ClinicalMatch API listening on http://localhost:${config.PORT}`)
})

// Background incremental-sync scheduler (no-op until a run sets next_run_at).
if (config.NODE_ENV !== 'test') {
  startScheduler()
}
