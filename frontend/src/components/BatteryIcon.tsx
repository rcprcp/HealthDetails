interface BatteryIconProps {
  percent: number;
}

export function BatteryIcon({ percent }: BatteryIconProps) {
  const level = Math.max(0, Math.min(100, percent));
  const fillWidth = Math.max(0, (level / 100) * 18);

  return (
    <svg
      width="22"
      height="12"
      viewBox="0 0 26 14"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <rect
        x="1"
        y="1"
        width="22"
        height="12"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect x="3" y="3" width={fillWidth} height="8" rx="1" fill="currentColor" />
      <rect x="24" y="4" width="2" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}
