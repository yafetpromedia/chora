/** Small flag icons for currency toggle (converter-style) */

export function UsFlagIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 16"
      width={24}
      height={16}
      aria-hidden
    >
      <rect width="24" height="16" fill="#b22234" />
      <path
        fill="#fff"
        d="M0 1.23h24M0 3.08h24M0 4.92h24M0 6.77h24M0 8.62h24M0 10.46h24M0 12.31h24M0 14.15h24"
      />
      <rect width="9.6" height="8.62" fill="#3c3b6e" />
    </svg>
  );
}

export function EthiopiaFlagIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 16"
      width={24}
      height={16}
      aria-hidden
    >
      <rect width="24" height="16" fill="#078930" />
      <rect y="5.33" width="24" height="5.34" fill="#fcd116" />
      <rect y="10.67" width="24" height="5.33" fill="#da121a" />
      <circle cx="12" cy="8" r="3.2" fill="#0f47af" />
      <circle cx="12" cy="8" r="2.4" fill="#fcd116" />
      <circle cx="12" cy="8" r="1.1" fill="#078930" />
    </svg>
  );
}
