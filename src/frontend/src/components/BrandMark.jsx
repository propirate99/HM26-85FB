export function BrandMark({ className = "logo" }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" opacity=".45" />
      <path d="M16 4a12 12 0 0 1 10.39 6" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      <path d="M26.39 10 16 16 5.6 10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 16v12" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="3" fill="var(--accent)" />
    </svg>
  );
}
