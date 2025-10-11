interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo4({ className = "", size = 40 }: LogoProps) {
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
        <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#0891B2', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#0E7490', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      <circle cx="100" cy="100" r="90" fill="url(#grad4)" />

      <path
        d="M70 140 L85 95 L100 140 L115 70 L130 140 L145 95"
        stroke="white"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.3"
      />

      <text
        x="100"
        y="120"
        fontFamily="Arial, sans-serif"
        fontSize="80"
        fontWeight="700"
        fill="white"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        A
      </text>

      <path
        d="M65 145 L85 110 L105 130"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.6"
      />

      <circle cx="85" cy="110" r="3" fill="white" opacity="0.8" />
      <circle cx="105" cy="130" r="3" fill="white" opacity="0.8" />
    </svg>
  );
}
