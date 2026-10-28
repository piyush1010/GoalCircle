/** The GoalYaar mark: an open ring (showing up daily) with a tick breaking out of it. */
export default function LogoMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-grid shrink-0 place-items-center bg-[#121212] ${className}`} style={{ width: size, height: size, borderRadius: size * 0.23 }}>
      <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#FAFAF7" strokeWidth="9" strokeLinecap="round" strokeDasharray="190.8 48" transform="rotate(-8.8 50 50)" />
        <path d="M31 45 L46 60" fill="none" stroke="#E8890C" strokeWidth="10.5" strokeLinecap="round" />
        <path d="M46 60 L46 76 M46 60 L83 18" fill="none" stroke="#FAFAF7" strokeWidth="10.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}
