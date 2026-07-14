import { db as singleton, type DB } from './index.js'
import { migrate } from './migrate.js'
import {
  SEED_DISCUSSIONS,
  SEED_GROUPS,
  SEED_NOTIFICATIONS,
  SEED_REPLIES,
  SEED_TRIALS,
} from './seed-data.js'

/**
 * Load the fictional catalogue. Idempotent: clears the seeded content tables
 * and reinserts, so re-running always yields the same state. User-generated
 * tables (users, saved_trials, group_memberships) are left untouched.
 */
export function seed(database: DB = singleton): void {
  migrate(database)

  const insertTrial = database.prepare(`
    INSERT INTO trials (id, title, disease, phase, city, country, status,
      short_description, full_description, inclusion_criteria,
      exclusion_criteria, centers, contact_name, contact_email, contact_phone)
    VALUES (@id, @title, @disease, @phase, @city, @country, @status,
      @short_description, @full_description, @inclusion_criteria,
      @exclusion_criteria, @centers, @contact_name, @contact_email,
      @contact_phone)
  `)
  const insertGroup = database.prepare(`
    INSERT INTO support_groups (id, name, disease, description, color, member_count)
    VALUES (@id, @name, @disease, @description, @color, @member_count)
  `)
  const insertDiscussion = database.prepare(`
    INSERT INTO discussions (id, group_id, author_id, author_name, title,
      content, tags, summary, created_at)
    VALUES (@id, @group_id, @author_id, @author_name, @title, @content, @tags,
      @summary, @created_at)
  `)
  const insertReply = database.prepare(`
    INSERT INTO replies (id, discussion_id, author_id, author_name, content, created_at)
    VALUES (@id, @discussion_id, @author_id, @author_name, @content, @created_at)
  `)
  const insertNotification = database.prepare(`
    INSERT INTO notifications (id, title, body, trial_id, created_at, read)
    VALUES (@id, @title, @body, @trial_id, @created_at, @read)
  `)

  const run = database.transaction(() => {
    for (const table of [
      'notifications',
      'replies',
      'discussions',
      'support_groups',
      'trials',
    ]) {
      database.prepare(`DELETE FROM ${table}`).run()
    }

    for (const t of SEED_TRIALS) {
      insertTrial.run({
        ...t,
        inclusion_criteria: JSON.stringify(t.inclusion_criteria),
        exclusion_criteria: JSON.stringify(t.exclusion_criteria),
        centers: JSON.stringify(t.centers),
      })
    }
    for (const g of SEED_GROUPS) {
      insertGroup.run(g)
    }
    for (const d of SEED_DISCUSSIONS) {
      insertDiscussion.run({
        ...d,
        title: d.title ?? null,
        summary: d.summary ?? null,
        tags: JSON.stringify(d.tags),
      })
    }
    for (const r of SEED_REPLIES) {
      insertReply.run(r)
    }
    for (const n of SEED_NOTIFICATIONS) {
      insertNotification.run({
        ...n,
        trial_id: n.trial_id ?? null,
        read: n.read ? 1 : 0,
      })
    }
  })

  run()
}

// `npm run seed` runs this module directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
  console.log(
    `Seeded ${SEED_TRIALS.length} trials, ${SEED_GROUPS.length} groups, ` +
      `${SEED_DISCUSSIONS.length} discussions, ${SEED_REPLIES.length} replies.`
  )
}
