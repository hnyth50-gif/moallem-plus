import type { ReactNode, SVGProps } from 'react'
import { cn } from '../lib/cn'

// ============ أيقونات SVG داخلية (بدون مكتبات إضافية) ============
// مستوحاة من مجموعة خطّية خفيفة (stroke). سمات: fill=none / stroke=currentColor.

interface IconProps extends SVGProps<SVGSVGElement> {
  label?: string
}

function Base({ children, label, className, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      // الحجم الافتراضي يُدمج مع ما يُمرر (لا يُستبدل) وإلا انفجرت الأيقونات بحجم الحاوية
      className={cn('h-5 w-5 shrink-0', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconHome = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 11.5 12 3l9 8.5" />
    <path d="M5.5 10v9.5h13V10" />
  </Base>
)

export const IconPlan = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 3.5h10.5v17H5.5v-15A1.5 1.5 0 0 1 7 4z" />
    <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" />
  </Base>
)

export const IconActivity = (p: IconProps) => (
  <Base {...p}>
    <path d="M13.5 2.5 6 13h5l-1.5 8.5L17 11h-5l1.5-8.5z" />
  </Base>
)

export const IconQuiz = (p: IconProps) => (
  <Base {...p}>
    <path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1.4.9-1.4 1.9v.5" />
    <circle cx="11.7" cy="17.2" r="0.4" fill="currentColor" />
    <circle cx="12" cy="12" r="9.2" />
  </Base>
)

export const IconCards = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="7" width="13" height="14" rx="2" />
    <path d="M7.5 4.5h10a2 2 0 0 1 2 2v12" />
    <path d="M6.5 11h7M6.5 14h7" />
  </Base>
)

export const IconSettings = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7" />
  </Base>
)

export const IconPlus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
)

export const IconSearch = (p: IconProps) => (
  <Base {...p}>
    <circle cx="10.8" cy="10.8" r="6.3" />
    <path d="m20 20-4.5-4.5" />
  </Base>
)

export const IconPrint = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 8V3.5h10V8" />
    <rect x="4" y="8" width="16" height="7.5" rx="1.5" />
    <path d="M7 12.5h10V20.5H7z" />
  </Base>
)

export const IconCopy = (p: IconProps) => (
  <Base {...p}>
    <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
    <path d="M15.5 5.5h-11v11" />
  </Base>
)

export const IconTrash = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.5 6.5h15M9.5 6V3.8h5V6M6.5 6.5l1 14h9l1-14" />
    <path d="M10.2 10.2v6.6M13.8 10.2v6.6" />
  </Base>
)

export const IconEdit = (p: IconProps) => (
  <Base {...p}>
    <path d="m14.5 5.5 4 4L8 20H4v-4z" />
    <path d="m12.5 7.5 4 4" />
  </Base>
)

export const IconChevronUp = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 14.5l6-6 6 6" />
  </Base>
)

export const IconChevronDown = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 9.5l6 6 6-6" />
  </Base>
)

export const IconClose = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
)

export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Base>
)

export const IconSun = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5V4.8M12 19.2v2.3M2.5 12h2.3M19.2 12h2.3M5 5l1.6 1.6M17.4 17.4 19 19M19 5l-1.6 1.6M6.6 17.4 5 19" />
  </Base>
)

export const IconMoon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />
  </Base>
)

export const IconDownload = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 4v11M7.5 11 12 15.5l4.5-4.5" />
    <path d="M5 19.5h14" />
  </Base>
)

export const IconUpload = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 15.5v-11M7.5 8.5 12 4l4.5 4.5" />
    <path d="M5 19.5h14" />
  </Base>
)

export const IconMenu = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Base>
)

export const IconSparkles = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 4l1.6 4.2L18 10l-4.4 1.8L12 16l-1.6-4.2L6 10l4.4-1.8z" />
    <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
  </Base>
)

export const IconAlert = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 4.5 21 19.5H3z" />
    <path d="M12 10v4.2" />
    <circle cx="12" cy="17" r="0.4" fill="currentColor" />
  </Base>
)

export const IconRefresh = (p: IconProps) => (
  <Base {...p}>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
    <path d="M19.7 3.5v3.8h-3.8" />
  </Base>
)
