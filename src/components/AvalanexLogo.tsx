interface AvalanexLogoProps {
  className?: string;
}

const AvalanexLogo: React.FC<AvalanexLogoProps> = ({ className = "w-10 h-10" }) => {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M100 45 L145 120 L125 120 L100 80 L75 120 L55 120 L100 45Z" fill="white" opacity="0.95" />
      <rect x="70" y="130" width="60" height="8" rx="4" fill="white" opacity="0.95" />
      <rect x="80" y="145" width="40" height="8" rx="4" fill="white" opacity="0.75" />
    </svg>
  );
};

export default AvalanexLogo;
