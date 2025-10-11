interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo2({ className = "", size = 40 }: LogoProps) {
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
        <linearGradient id="grad2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: '#059669', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#10B981', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      <rect width="200" height="200" rx="45" fill="url(#grad2)" />

      <path
        d="M40 140 L60 110 L80 125 L100 85 L120 105 L140 65 L160 85"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      <circle cx="40" cy="140" r="6" fill="white" />
      <circle cx="60" cy="110" r="6" fill="white" />
      <circle cx="80" cy="125" r="6" fill="white" />
      <circle cx="100" cy="85" r="6" fill="white" />
      <circle cx="120" cy="105" r="6" fill="white" />
      <circle cx="140" cy="65" r="6" fill="white" />
      <circle cx="160" cy="85" r="8" fill="white" />

      <path
        d="M145 65 L160 65 L160 80"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
