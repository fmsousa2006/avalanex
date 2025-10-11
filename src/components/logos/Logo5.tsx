interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo5({ className = "", size = 40 }: LogoProps) {
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
        <linearGradient id="grad5a" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#DC2626', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#B91C1C', stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="grad5b" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#F59E0B', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#D97706', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      <rect width="200" height="200" rx="50" fill="url(#grad5a)" />

      <path
        d="M100 40 L160 100 L130 100 L100 70 L70 100 L40 100 Z"
        fill="url(#grad5b)"
      />

      <circle cx="55" cy="135" r="8" fill="white" opacity="0.95" />
      <circle cx="85" cy="135" r="8" fill="white" opacity="0.95" />
      <circle cx="115" cy="135" r="8" fill="white" opacity="0.95" />
      <circle cx="145" cy="135" r="8" fill="white" opacity="0.95" />

      <path
        d="M55 145 L55 160"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M85 145 L85 165"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M115 145 L115 155"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M145 145 L145 170"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}
