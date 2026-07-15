import type { SVGProps } from 'react'

// Minimal inline icon set (stroke-based, currentColor). Decorative by default;
// pass aria-label + role="img" when an icon is the only label.
type IconProps = SVGProps<SVGSVGElement>

function Base({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      {...props}
    >
      {children}
    </svg>
  )
}

export const HomeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9.5 21v-6h5v6" />
  </Base>
)
export const SearchIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </Base>
)
export const UsersIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.2a3.2 3.2 0 0 1 0 6" />
    <path d="M17.5 20a5.5 5.5 0 0 0-2.7-4.7" />
  </Base>
)
export const SparkIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="M12 8.5 13.4 11 16 12l-2.6 1L12 15.5 10.6 13 8 12l2.6-1z" />
  </Base>
)
export const UserIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Base>
)
export const BellIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Base>
)
export const BackIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Base>
)
export const HeartIcon = ({
  filled,
  ...p
}: IconProps & { filled?: boolean }) => (
  <Base {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7-4.5-7-9.5A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.5C19 15.5 12 20 12 20Z" />
  </Base>
)
export const PlusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
)
export const ShieldIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </Base>
)
export const ShareIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="6" cy="12" r="2.2" />
    <circle cx="17.5" cy="6" r="2.2" />
    <circle cx="17.5" cy="18" r="2.2" />
    <path d="m8 11 7.5-4M8 13l7.5 4" />
  </Base>
)
export const BuildingIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16" />
    <path d="M13 9h5a1 1 0 0 1 1 1v11" />
    <path d="M3 21h18M7 8h2M7 12h2M7 16h2M16 13h1M16 17h1" />
  </Base>
)
export const ExternalLinkIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M14 5h5v5" />
    <path d="M19 5 10 14" />
    <path d="M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4" />
  </Base>
)
export const CheckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m5 12 5 5 9-10" />
  </Base>
)
export const CloseIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
)
export const MoreIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </Base>
)
export const WifiOffIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 5l18 18" />
    <path d="M5 12.5a11 11 0 0 1 4-2.3" />
    <path d="M8.5 16a6 6 0 0 1 4-1.6" />
    <path d="M12 20h.01" />
  </Base>
)
export const MapPinIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21s7-6.3 7-11a7 7 0 0 0-14 0c0 4.7 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </Base>
)
export const MailIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 6.5 8.5 6 8.5-6" />
  </Base>
)
export const PhoneIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 3h3l1.5 5-2 1.5a12 12 0 0 0 6 6l1.5-2 5 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3Z" />
  </Base>
)
export const InfoIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Base>
)
export const ArrowRightIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Base>
)
export const ChevronDownIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m6 9 6 6 6-6" />
  </Base>
)
export const GlobeIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" />
  </Base>
)
export const FlaskIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 3h6" />
    <path d="M10 3v6l-4.5 8A2 2 0 0 0 7.3 20h9.4a2 2 0 0 0 1.8-3L14 9V3" />
    <path d="M7.5 15h9" />
  </Base>
)
export const ActivityIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 12h4l2.5 7 5-16L17 12h4" />
  </Base>
)
export const SunIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Base>
)
export const MoonIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" />
  </Base>
)
export const MonitorIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </Base>
)
export const CalendarIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="16" rx="2" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </Base>
)
export const PinIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 4h6l-1 5 3 3H7l3-3-1-5Z" />
    <path d="M12 15v5" />
  </Base>
)
export const FlagIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 21V4" />
    <path d="M5 4h11l-2 3.5L16 11H5" />
  </Base>
)
export const ChatIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 15a2 2 0 0 1-2 2H9l-4 3v-3H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" />
  </Base>
)
export const TrendingIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M17 7h4v4" />
  </Base>
)
export const LogoMark = (p: IconProps) => (
  <svg viewBox="0 0 64 64" width="28" height="28" fill="none" {...p}>
    <path
      fill="var(--color-primary)"
      d="M32 4C20.4 4 11 13.4 11 25c0 14.7 17.6 32.4 19.3 34.1a2.4 2.4 0 0 0 3.4 0C35.4 57.4 53 39.7 53 25 53 13.4 43.6 4 32 4Z"
    />
    <path fill="var(--color-accent)" d="M29 13h6v7h7v6h-7v7h-6v-7h-7v-6h7z" />
  </svg>
)
