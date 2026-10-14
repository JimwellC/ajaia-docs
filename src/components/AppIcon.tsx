// Original app mark: a page with a folded corner and two lines of text.
export default function AppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="shrink-0">
      <rect x="1" y="1" width="18" height="18" rx="4.5" fill="#37352f" />
      <path d="M6 5.5h5.5L14 8v6.5H6z" fill="#fff" />
      <path d="M11.5 5.5V8H14" fill="none" stroke="#37352f" strokeWidth="1" />
      <path d="M8 10.5h4M8 12.5h3" stroke="#37352f" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
