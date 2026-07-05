/**
 * Decorative animated transit-line map used behind hero/section backgrounds.
 * Purely presentational — aria-hidden and pointer-events disabled.
 */
export function RailBackdrop({ className }: { className?: string }) {
  const lines = [
    { d: 'M -50 380 C 200 380, 260 120, 520 120 S 900 320, 1250 260', color: '#FFCB05', width: 900 },
    { d: 'M -50 80 C 220 80, 320 340, 620 340 S 980 60, 1300 140', color: '#E31B23', width: 760 },
    { d: 'M -50 220 C 260 220, 340 40, 700 40 S 1050 420, 1350 380', color: '#7DD3FC', width: 1040 },
  ]

  return (
    <svg
      viewBox="0 0 1300 460"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      role="presentation"
    >
      {lines.map((line, index) => (
        <g key={index}>
          <path d={line.d} fill="none" stroke={line.color} strokeWidth="2" strokeOpacity="0.35" />
          <path
            d={line.d}
            fill="none"
            stroke={line.color}
            strokeWidth="3"
            strokeOpacity="0.9"
            strokeLinecap="round"
            strokeDasharray="14 226"
            className="animate-rail-flow"
            style={{ animationDuration: `${line.width / 40}s`, animationDelay: `${index * -1.4}s` }}
          />
        </g>
      ))}
    </svg>
  )
}
