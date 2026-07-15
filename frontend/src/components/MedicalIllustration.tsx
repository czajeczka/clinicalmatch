import type { SVGProps } from 'react'

/**
 * Decorative hero illustration: an abstract "trial protocol" card with a
 * heartbeat line, a plus badge and floating markers. Purely presentational and
 * theme-aware (uses design tokens), so it adapts to light/dark. Exposed as a
 * labelled `img` so assistive tech gets a concise description.
 */
export function MedicalIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 320 260"
      fill="none"
      role="img"
      aria-label="Illustration of a clinical trial record with a heartbeat line"
      {...props}
    >
      <defs>
        <linearGradient id="cm-hero-card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-surface)" />
          <stop offset="1" stopColor="var(--color-surface-muted)" />
        </linearGradient>
        <linearGradient id="cm-hero-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-primary)" />
          <stop offset="1" stopColor="var(--color-accent)" />
        </linearGradient>
      </defs>

      {/* soft ambient blobs */}
      <circle
        cx="52"
        cy="58"
        r="46"
        fill="var(--color-secondary)"
        opacity="0.12"
      />
      <circle
        cx="278"
        cy="212"
        r="54"
        fill="var(--color-primary)"
        opacity="0.1"
      />

      {/* protocol card */}
      <g>
        <rect
          x="66"
          y="44"
          width="188"
          height="172"
          rx="18"
          fill="url(#cm-hero-card)"
          stroke="var(--color-border)"
          strokeWidth="1.5"
        />
        {/* header rows */}
        <rect
          x="88"
          y="68"
          width="96"
          height="10"
          rx="5"
          fill="var(--color-text)"
          opacity="0.85"
        />
        <rect
          x="88"
          y="86"
          width="64"
          height="8"
          rx="4"
          fill="var(--color-text-muted)"
          opacity="0.6"
        />

        {/* heartbeat panel */}
        <rect
          x="88"
          y="108"
          width="144"
          height="52"
          rx="12"
          fill="var(--color-primary)"
          opacity="0.08"
        />
        <path
          d="M92 134h20l8-16 10 30 9-22 7 8h32"
          stroke="url(#cm-hero-accent)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* criteria rows with ticks */}
        <g>
          <circle
            cx="94"
            cy="180"
            r="6"
            fill="var(--color-accent)"
            opacity="0.18"
          />
          <path
            d="m91 180 2 2 4-4.5"
            stroke="var(--color-accent)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="108"
            y="176"
            width="112"
            height="8"
            rx="4"
            fill="var(--color-text-muted)"
            opacity="0.45"
          />
          <circle
            cx="94"
            cy="198"
            r="6"
            fill="var(--color-accent)"
            opacity="0.18"
          />
          <path
            d="m91 198 2 2 4-4.5"
            stroke="var(--color-accent)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="108"
            y="194"
            width="84"
            height="8"
            rx="4"
            fill="var(--color-text-muted)"
            opacity="0.45"
          />
        </g>
      </g>

      {/* floating plus badge */}
      <g>
        <circle cx="238" cy="66" r="26" fill="url(#cm-hero-accent)" />
        <path
          d="M238 54v24M226 66h24"
          stroke="var(--color-on-accent)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </g>

      {/* floating location pin */}
      <g>
        <circle
          cx="60"
          cy="176"
          r="22"
          fill="var(--color-surface)"
          stroke="var(--color-border)"
          strokeWidth="1.5"
        />
        <path
          d="M60 187s8-7 8-12a8 8 0 1 0-16 0c0 5 8 12 8 12Z"
          fill="var(--color-secondary)"
          opacity="0.9"
        />
        <circle cx="60" cy="175" r="3" fill="var(--color-surface)" />
      </g>
    </svg>
  )
}
