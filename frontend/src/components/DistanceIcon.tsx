export interface DistanceIconProps {
  size?: number;
}

export function DistanceIcon({ size = 14 }: DistanceIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <path d="M4 19c4 0 4-14 8-14s4 14 8 14" />
      <circle cx="4" cy="19" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="20" cy="19" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
