interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo3({ className = "", size = 40 }: LogoProps) {
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
        <linearGradient id="grad3a" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#6366F1', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#4F46E5', stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="grad3b" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#8B5CF6', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#7C3AED', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      <path
        d="M100 20 L170 80 L170 180 L30 180 L30 80 Z"
        fill="url(#grad3a)"
      />

      <path
        d="M100 20 L140 55 L140 140 L60 140 L60 55 Z"
        fill="url(#grad3b)"
        opacity="0.7"
      />

      <path
        d="M100 50 L80 70 L80 95 L100 75 L120 95 L120 70 Z"
        fill="white"
        opacity="0.95"
      />

      <rect x="70" y="110" width="60" height="6" rx="3" fill="white" opacity="0.9" />
      <rect x="75" y="122" width="50" height="6" rx="3" fill="white" opacity="0.75" />
      <rect x="80" y="134" width="40" height="6" rx="3" fill="white" opacity="0.6" />
    </svg>
  );
}
