import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Header } from '@/layout/Header'
import { Card, SectionTitle } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input, Textarea, Select } from '@/components/Field'
import { BottomSheet } from '@/components/BottomSheet'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { SegmentedControl } from '@/components/SegmentedControl'
import { SkeletonList } from '@/components/Skeleton'
import { ErrorRetry } from '@/components/ErrorRetry'
import { EmptyState } from '@/components/EmptyState'
import { DiseasePill } from '@/components/Badge'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/mock/mockApi'
import { useApp } from '@/store/store'
import { timeAgo } from '@/lib/format'
import { DISEASES, DISEASE_COLORS, type Disease } from '@/lib/diseases'
import type { AppNotification, SupportGroup, Trial, TrialStatus } from '@/types'

const STATUSES: TrialStatus[] = [
  'recruiting',
  'not yet recruiting',
  'closed',
  'completed',
]

const inlineBtn =
  'rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]'

type Tab = 'trials' | 'groups' | 'announcements' | 'sync'

/**
 * Admin Panel. Rendered only for the admin account (see the guard below and the
 * conditional nav tab). Every action here also hits a backend endpoint that
 * independently enforces role='admin' — this UI is convenience, not security.
 */
export function Admin() {
  const { isAdmin, user } = useApp()
  const [tab, setTab] = useState<Tab>('trials')

  // Client-side guard. The server is the real gate (403), but non-admins
  // shouldn't see the panel at all. `user` may still be resolving its role, so
  // only redirect once we have an identity and it is definitely not admin.
  if (user && !isAdmin) return <Navigate to="/" replace />

  return (
    <div>
      <Header title="Admin Panel" />
      <div className="px-4 pt-4">
        <SegmentedControl<Tab>
          ariaLabel="Admin sections"
          value={tab}
          onChange={setTab}
          segments={[
            { value: 'trials', label: 'Trials' },
            { value: 'groups', label: 'Groups' },
            { value: 'announcements', label: 'News' },
            { value: 'sync', label: 'Sync' },
          ]}
        />
      </div>
      <div className="px-4 py-4">
        {tab === 'trials' && <TrialsAdmin />}
        {tab === 'groups' && <GroupsAdmin />}
        {tab === 'announcements' && <AnnouncementsAdmin />}
        {tab === 'sync' && <SyncAdmin />}
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------
// Trials
// --------------------------------------------------------------------------

function TrialsAdmin() {
  const { toast } = useApp()
  const { data, loading, error, reload } = useAsync(() => api.getTrials(), [])
  const [editing, setEditing] = useState<Trial | 'new' | null>(null)
  const [confirm, setConfirm] = useState<Trial | null>(null)

  async function remove(t: Trial) {
    try {
      await api.deleteTrial(t.id)
      toast('Trial deleted', 'success')
      reload()
    } catch {
      toast('Couldn’t delete the trial.', 'error')
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle>Clinical trials</SectionTitle>
        <Button size="sm" onClick={() => setEditing('new')}>
          New trial
        </Button>
      </div>

      {loading && <SkeletonList count={3} />}
      {!loading && error && (
        <ErrorRetry message="Couldn’t load trials." onRetry={reload} />
      )}
      {!loading && !error && data && data.length === 0 && (
        <EmptyState title="No trials yet" body="Create the first one." />
      )}
      {!loading && !error && data && data.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.map((t) => (
            <Card key={t.id} className="flex items-center gap-3">
              <DiseasePill disease={t.disease} />
              <span className="text-text min-w-0 flex-1 truncate text-sm font-medium">
                {t.title}
              </span>
              <button
                className={`text-primary text-sm ${inlineBtn}`}
                onClick={() => setEditing(t)}
              >
                Edit
              </button>
              <button
                className={`text-danger text-sm ${inlineBtn}`}
                onClick={() => setConfirm(t)}
              >
                Delete
              </button>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <TrialForm
          trial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
      <ConfirmDialog
        open={confirm !== null}
        title="Delete this trial?"
        body="This removes it for everyone and can’t be undone."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) void remove(confirm)
          setConfirm(null)
        }}
      />
    </div>
  )
}

function linesToArray(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

function TrialForm({
  trial,
  onClose,
  onSaved,
}: {
  trial: Trial | null
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useApp()
  const [f, setF] = useState({
    title: trial?.title ?? '',
    disease: trial?.disease ?? DISEASES[0],
    phase: trial?.phase ?? 'Phase 2',
    city: trial?.city ?? '',
    country: trial?.country ?? '',
    status: trial?.status ?? ('recruiting' as TrialStatus),
    short_description: trial?.short_description ?? '',
    full_description: trial?.full_description ?? '',
    inclusion: (trial?.inclusion_criteria ?? []).join('\n'),
    exclusion: (trial?.exclusion_criteria ?? []).join('\n'),
    contact_name: trial?.contact_name ?? '',
    contact_email: trial?.contact_email ?? '',
    contact_phone: trial?.contact_phone ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))

  const valid =
    f.title.trim() &&
    f.city.trim() &&
    f.country.trim() &&
    f.short_description.trim() &&
    f.full_description.trim() &&
    f.contact_name.trim() &&
    f.contact_email.trim() &&
    f.contact_phone.trim()

  async function save() {
    if (!valid || saving) return
    setSaving(true)
    const body = {
      title: f.title.trim(),
      disease: f.disease as Disease,
      phase: f.phase.trim(),
      city: f.city.trim(),
      country: f.country.trim(),
      status: f.status,
      short_description: f.short_description.trim(),
      full_description: f.full_description.trim(),
      inclusion_criteria: linesToArray(f.inclusion),
      exclusion_criteria: linesToArray(f.exclusion),
      contact_name: f.contact_name.trim(),
      contact_email: f.contact_email.trim(),
      contact_phone: f.contact_phone.trim(),
    }
    try {
      if (trial) {
        await api.updateTrial(trial.id, body)
        toast('Trial updated', 'success')
      } else {
        // centers are managed elsewhere; new trials start with none.
        await api.createTrial({ ...body, centers: [] })
        toast('Trial created', 'success')
      }
      onSaved()
    } catch {
      toast('Couldn’t save the trial.', 'error')
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={trial ? 'Edit trial' : 'New trial'}
    >
      <div className="space-y-3">
        <Input
          label="Title"
          required
          value={f.title}
          onChange={(e) => set('title', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Disease"
            value={f.disease}
            onChange={(e) => set('disease', e.target.value)}
          >
            {DISEASES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
          <Select
            label="Status"
            value={f.status}
            onChange={(e) => set('status', e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Phase"
            value={f.phase}
            onChange={(e) => set('phase', e.target.value)}
          />
          <Input
            label="City"
            required
            value={f.city}
            onChange={(e) => set('city', e.target.value)}
          />
          <Input
            label="Country"
            required
            value={f.country}
            onChange={(e) => set('country', e.target.value)}
          />
        </div>
        <Textarea
          label="Short description"
          required
          value={f.short_description}
          onChange={(e) => set('short_description', e.target.value)}
        />
        <Textarea
          label="Full description"
          required
          value={f.full_description}
          onChange={(e) => set('full_description', e.target.value)}
        />
        <Textarea
          label="Inclusion criteria (one per line)"
          value={f.inclusion}
          onChange={(e) => set('inclusion', e.target.value)}
        />
        <Textarea
          label="Exclusion criteria (one per line)"
          value={f.exclusion}
          onChange={(e) => set('exclusion', e.target.value)}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label="Contact name"
            required
            value={f.contact_name}
            onChange={(e) => set('contact_name', e.target.value)}
          />
          <Input
            label="Contact email"
            required
            value={f.contact_email}
            onChange={(e) => set('contact_email', e.target.value)}
          />
          <Input
            label="Contact phone"
            required
            value={f.contact_phone}
            onChange={(e) => set('contact_phone', e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} loading={saving} onClick={save}>
            {trial ? 'Save changes' : 'Create trial'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}

// --------------------------------------------------------------------------
// Support groups
// --------------------------------------------------------------------------

function GroupsAdmin() {
  const { toast } = useApp()
  const { data, loading, error, reload } = useAsync(() => api.getGroups(), [])
  const [editing, setEditing] = useState<SupportGroup | 'new' | null>(null)
  const [confirm, setConfirm] = useState<SupportGroup | null>(null)

  async function remove(g: SupportGroup) {
    try {
      await api.deleteGroup(g.id)
      toast('Group deleted', 'success')
      reload()
    } catch {
      toast('Couldn’t delete the group.', 'error')
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle>Support groups</SectionTitle>
        <Button size="sm" onClick={() => setEditing('new')}>
          New group
        </Button>
      </div>

      {loading && <SkeletonList count={3} />}
      {!loading && error && (
        <ErrorRetry message="Couldn’t load groups." onRetry={reload} />
      )}
      {!loading && !error && data && (
        <div className="flex flex-col gap-2">
          {data.map((g) => (
            <Card key={g.id} className="flex items-center gap-3">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: g.color }}
                aria-hidden
              />
              <span className="text-text min-w-0 flex-1 truncate text-sm font-medium">
                {g.name}
              </span>
              <button
                className={`text-primary text-sm ${inlineBtn}`}
                onClick={() => setEditing(g)}
              >
                Edit
              </button>
              <button
                className={`text-danger text-sm ${inlineBtn}`}
                onClick={() => setConfirm(g)}
              >
                Delete
              </button>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <GroupForm
          group={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
      <ConfirmDialog
        open={confirm !== null}
        title="Delete this group?"
        body="Its discussions and replies are removed too. This can’t be undone."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) void remove(confirm)
          setConfirm(null)
        }}
      />
    </div>
  )
}

function GroupForm({
  group,
  onClose,
  onSaved,
}: {
  group: SupportGroup | null
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useApp()
  const [name, setName] = useState(group?.name ?? '')
  const [disease, setDisease] = useState<Disease>(group?.disease ?? DISEASES[0])
  const [description, setDescription] = useState(group?.description ?? '')
  const [color, setColor] = useState(
    group?.color ?? DISEASE_COLORS[DISEASES[0]]
  )
  const [saving, setSaving] = useState(false)
  const valid = name.trim() && description.trim() && color.trim()

  async function save() {
    if (!valid || saving) return
    setSaving(true)
    const body = {
      name: name.trim(),
      disease,
      description: description.trim(),
      color: color.trim(),
    }
    try {
      if (group) {
        await api.updateGroup(group.id, body)
        toast('Group updated', 'success')
      } else {
        await api.createGroup(body)
        toast('Group created', 'success')
      }
      onSaved()
    } catch {
      toast('Couldn’t save the group.', 'error')
      setSaving(false)
    }
  }

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={group ? 'Edit group' : 'New group'}
    >
      <div className="space-y-3">
        <Input
          label="Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Select
          label="Disease"
          value={disease}
          onChange={(e) => {
            const d = e.target.value as Disease
            setDisease(d)
            if (!group) setColor(DISEASE_COLORS[d])
          }}
        >
          {DISEASES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Textarea
          label="Description"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          label="Accent colour (hex)"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} loading={saving} onClick={save}>
            {group ? 'Save changes' : 'Create group'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}

// --------------------------------------------------------------------------
// Announcements (notifications)
// --------------------------------------------------------------------------

function AnnouncementsAdmin() {
  const { toast } = useApp()
  const { data, loading, error, reload } = useAsync(
    () => api.getNotifications(),
    []
  )
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [trialId, setTrialId] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState<AppNotification | null>(null)

  async function create() {
    if (!title.trim() || !body.trim() || saving) return
    setSaving(true)
    try {
      await api.createNotification({
        title: title.trim(),
        body: body.trim(),
        trial_id: trialId.trim() || undefined,
      })
      setTitle('')
      setBody('')
      setTrialId('')
      toast('Announcement posted', 'success')
      reload()
    } catch {
      toast('Couldn’t post the announcement.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function remove(n: AppNotification) {
    try {
      await api.deleteNotification(n.id)
      toast('Announcement deleted', 'success')
      reload()
    } catch {
      toast('Couldn’t delete the announcement.', 'error')
    }
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <SectionTitle>New announcement</SectionTitle>
        <Input
          label="Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          label="Message"
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Input
          label="Linked trial id (optional)"
          placeholder="e.g. t-001"
          value={trialId}
          onChange={(e) => setTrialId(e.target.value)}
        />
        <div className="flex justify-end">
          <Button
            disabled={!title.trim() || !body.trim()}
            loading={saving}
            onClick={create}
          >
            Post announcement
          </Button>
        </div>
      </Card>

      <section>
        <SectionTitle>Existing</SectionTitle>
        {loading && <SkeletonList count={2} />}
        {!loading && error && (
          <ErrorRetry message="Couldn’t load announcements." onRetry={reload} />
        )}
        {!loading && !error && data && data.length === 0 && (
          <p className="text-text-muted text-sm">No announcements yet.</p>
        )}
        {!loading && !error && data && data.length > 0 && (
          <div className="flex flex-col gap-2">
            {data.map((n) => (
              <Card key={n.id} className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-text text-sm font-medium">{n.title}</p>
                  <p className="text-text-muted text-sm">{n.body}</p>
                </div>
                <button
                  className={`text-danger shrink-0 text-sm ${inlineBtn}`}
                  onClick={() => setConfirm(n)}
                >
                  Delete
                </button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirm !== null}
        title="Delete this announcement?"
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) void remove(confirm)
          setConfirm(null)
        }}
      />
    </div>
  )
}

// --------------------------------------------------------------------------
// Synchronisation status (read-only observability)
// --------------------------------------------------------------------------

function SyncAdmin() {
  const { data, loading, error, reload } = useAsync(
    () => api.getSyncStatus(),
    []
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>CTIS synchronisation</SectionTitle>
        <Button size="sm" variant="secondary" onClick={reload}>
          Refresh
        </Button>
      </div>

      {loading && <SkeletonList count={1} />}
      {!loading && error && (
        <ErrorRetry message="Couldn’t load sync status." onRetry={reload} />
      )}
      {!loading && !error && data && !data.last && (
        <EmptyState
          title="No synchronisation yet"
          body="Run the importer to load real CTIS trials (npm run sync, or the deploy step)."
        />
      )}
      {!loading && !error && data?.last && (
        <>
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <SyncStatusPill status={data.last.status} />
              <span className="text-text-muted font-mono text-xs">
                {data.last.mode} · {timeAgo(data.last.finished_at)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Imported" value={data.last.trials_imported} />
              <Metric label="Updated" value={data.last.trials_updated} />
              <Metric label="Skipped" value={data.last.trials_skipped} />
              <Metric label="Failed" value={data.last.trials_failed} />
              <Metric label="Seen" value={data.last.trials_seen} />
              <Metric
                label="Duration"
                value={`${(data.last.duration_ms / 1000).toFixed(1)}s`}
              />
            </div>
            {data.last.message && (
              <p className="text-text-muted text-xs">{data.last.message}</p>
            )}
          </Card>
          {data.lastError && (
            <Card className="border-danger/50">
              <p className="text-danger text-sm font-medium">Last error</p>
              <p className="text-text-muted mt-1 text-xs">
                {timeAgo(data.lastError.finished_at)} — {data.lastError.message}
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="font-display text-text text-lg font-semibold">{value}</p>
      <p className="text-text-muted font-mono text-xs uppercase">{label}</p>
    </div>
  )
}

function SyncStatusPill({ status }: { status: string }) {
  const tone =
    status === 'success'
      ? 'bg-success/12 text-success'
      : status === 'error'
        ? 'bg-danger/12 text-danger'
        : 'bg-warning/12 text-warning'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-xs font-medium ${tone}`}
    >
      {status}
    </span>
  )
}
