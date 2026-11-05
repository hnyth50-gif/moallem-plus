// ============ زخرفة الأوراق الذهبية ============
// عنصر تزييني خالص (aria-hidden) يستحضر هوية «زمرد وذهب» من التصميم الجديد —
// يُرسم فوق زوايا بطاقات الترحيب بشفافية هادئة ولا يظهر لقارئات الشاشة إطلاقًا.

export function GoldFlourish({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 140" fill="none" aria-hidden="true" focusable="false" className={className}>
      <g stroke="rgb(var(--gold-500))" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.55">
        <path d="M8 132 C 58 118, 128 84, 196 16" />
        <path d="M8 132 C 44 128, 92 118, 150 92" opacity="0.6" />
      </g>
      <g fill="rgb(var(--gold-400))" opacity="0.45">
        <ellipse cx="42" cy="126" rx="8" ry="3.4" transform="rotate(-14 42 126)" />
        <ellipse cx="60" cy="112" rx="10" ry="4" transform="rotate(-24 60 112)" />
        <ellipse cx="96" cy="96" rx="11" ry="4.4" transform="rotate(-32 96 96)" />
        <ellipse cx="132" cy="74" rx="11" ry="4.4" transform="rotate(-40 132 74)" />
        <ellipse cx="164" cy="48" rx="10" ry="4" transform="rotate(-48 164 48)" />
        <ellipse cx="188" cy="24" rx="8" ry="3.4" transform="rotate(-56 188 24)" />
      </g>
      <circle cx="196" cy="16" r="2.5" fill="rgb(var(--gold-300))" opacity="0.8" />
    </svg>
  )
}
