import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import {
  LogoMark,
  SearchIcon,
  SparkIcon,
  UsersIcon,
  ShieldIcon,
} from '@/components/icons'
import { useApp } from '@/store/store'
import type { CSSProperties, ReactNode } from 'react'

/**
 * Public landing page — the marketing entry point before the device-based
 * onboarding. No login; the CTA leads into onboarding (or straight into the app
 * for a returning device). Purely presentational: no backend/API changes.
 */
export function Landing() {
  const navigate = useNavigate()
  const { user } = useApp()
  const primaryHref = user ? '/' : '/onboarding'
  const primaryLabel = user ? 'Open ClinicalMatch' : 'Get started — it’s free'

  return (
    <div className="text-text min-h-full">
      {/* Hero */}
      <header
        className="relative overflow-hidden"
        style={{
          background:
            'radial-gradient(60rem 40rem at 50% -10%, color-mix(in oklab, var(--color-primary) 14%, transparent), transparent 70%),' +
            'radial-gradient(40rem 30rem at 85% 10%, color-mix(in oklab, var(--color-secondary) 12%, transparent), transparent 70%)',
        }}
      >
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <LogoMark className="text-primary h-7 w-7" />
            <span className="font-display text-text text-lg font-semibold">
              ClinicalMatch
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(primaryHref)}
          >
            {user ? 'Open app' : 'Get started'}
          </Button>
        </nav>

        <div className="mx-auto max-w-3xl px-5 pt-10 pb-20 text-center sm:pt-16 sm:pb-28">
          <span
            className="animate-fade-up border-border bg-surface/70 text-text-muted inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur"
            style={{ '--cm-delay': '0ms' } as CSSProperties}
          >
            <span className="bg-accent h-1.5 w-1.5 rounded-full" aria-hidden />
            Real European clinical trials · powered by CTIS
          </span>

          <h1
            className="animate-fade-up cm-delay font-display text-text mt-6 text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl"
            style={{ '--cm-delay': '60ms' } as CSSProperties}
          >
            Find the right clinical trial,
            <span className="text-primary"> in plain language.</span>
          </h1>

          <p
            className="animate-fade-up cm-delay text-text-muted mx-auto mt-5 max-w-xl text-lg leading-relaxed text-pretty"
            style={{ '--cm-delay': '120ms' } as CSSProperties}
          >
            Discover active European studies for serious and chronic conditions,
            understand who can take part, and connect with people on the same
            journey — all in one calm, private place.
          </p>

          <div
            className="animate-fade-up cm-delay mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ '--cm-delay': '180ms' } as CSSProperties}
          >
            <Button
              size="md"
              className="px-6"
              onClick={() => navigate(primaryHref)}
            >
              {primaryLabel}
            </Button>
            <a
              href="#how-it-works"
              className="text-primary rounded-sm px-2 py-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              See how it works →
            </a>
          </div>

          <p
            className="animate-fade-up cm-delay text-text-muted mx-auto mt-8 flex max-w-md items-center justify-center gap-1.5 text-xs leading-relaxed"
            style={{ '--cm-delay': '240ms' } as CSSProperties}
          >
            <ShieldIcon className="h-3.5 w-3.5 shrink-0" />
            Informational only — never medical advice. No account or password;
            your data stays on your device.
          </p>
        </div>
      </header>

      {/* Pillars */}
      <section
        id="how-it-works"
        className="mx-auto max-w-5xl scroll-mt-8 px-5 py-14"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Pillar
            icon={<SearchIcon className="h-5 w-5" />}
            title="Discover"
            body="Search and filter real recruiting trials by disease, country, phase, age and more — with results in seconds."
          />
          <Pillar
            icon={<SparkIcon className="h-5 w-5" />}
            title="Understand"
            body="Eligibility criteria rewritten in plain language, so you know who a study is for before you reach out."
          />
          <Pillar
            icon={<UsersIcon className="h-5 w-5" />}
            title="Belong"
            body="Join disease-specific communities to ask questions and support others walking the same path."
          />
        </div>

        <div className="mt-12 text-center">
          <Button className="px-6" onClick={() => navigate(primaryHref)}>
            {primaryLabel}
          </Button>
        </div>
      </section>

      <footer className="border-border text-text-muted border-t px-5 py-8 text-center text-xs">
        <p>
          ClinicalMatch · Informational only, not medical advice. Final
          eligibility is always decided by the trial investigators.
        </p>
      </footer>
    </div>
  )
}

function Pillar({
  icon,
  title,
  body,
}: {
  icon: ReactNode
  title: string
  body: string
}) {
  return (
    <div className="border-border bg-surface rounded-[var(--radius-card)] border p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-pop)]">
      <div className="bg-primary/10 text-primary grid h-10 w-10 place-items-center rounded-[12px]">
        {icon}
      </div>
      <h3 className="font-display text-text mt-4 text-lg font-semibold">
        {title}
      </h3>
      <p className="text-text-muted mt-1.5 text-sm leading-relaxed">{body}</p>
    </div>
  )
}
