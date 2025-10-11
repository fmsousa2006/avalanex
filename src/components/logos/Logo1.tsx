interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo1({ className = "", size = 40 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#1D4ED8', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      <circle cx="100" cy="100" r="95" fill="url(#grad1)" />

      <path
        d="M100 45 L145 120 L125 120 L100 80 L75 120 L55 120 L100 45Z"
        fill="white"
        opacity="0.95"
      />

      <rect x="70" y="130" width="60" height="8" rx="4" fill="white" opacity="0.95" />
      <rect x="80" y="145" width="40" height="8" rx="4" fill="white" opacity="0.75" />
    </svg>
  );
}
