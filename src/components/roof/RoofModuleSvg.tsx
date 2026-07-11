interface RoofModuleSvgProps {
  color?: string;
  label?: string;
  className?: string;
}

export function RoofModuleSvg({ color = '#2563EB', label, className = '' }: RoofModuleSvgProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 42 74"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="1.5" y="1.5" width="39" height="71" rx="3" fill="#F8FAFC" stroke={color} strokeWidth="3" />
      <rect x="5" y="8" width="32" height="50" rx="1.5" fill={color} opacity="0.16" />
      <path d="M21 1.5L35 15.5H27V29.5H15V15.5H7L21 1.5Z" fill="#111827" />
      <path d="M9 18H33" stroke={color} strokeWidth="1.2" opacity="0.55" />
      <path d="M9 30H33" stroke={color} strokeWidth="1.2" opacity="0.55" />
      <path d="M9 42H33" stroke={color} strokeWidth="1.2" opacity="0.55" />
      <path d="M15 8V58" stroke={color} strokeWidth="1" opacity="0.35" />
      <path d="M27 8V58" stroke={color} strokeWidth="1" opacity="0.35" />
      <rect x="9" y="62" width="24" height="8" rx="1" fill="#FFFFFF" stroke="#111827" strokeWidth="0.8" />
      <text
        x="21"
        y="68"
        textAnchor="middle"
        fontSize="5"
        fontFamily="Arial, sans-serif"
        fill="#111827"
      >
        {label || 'SPM'}
      </text>
    </svg>
  );
}
