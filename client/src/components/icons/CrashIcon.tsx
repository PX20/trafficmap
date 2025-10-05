interface CrashIconProps {
  className?: string;
}

export const CrashIcon = ({ className = "w-5 h-5" }: CrashIconProps) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      {/* Left car */}
      <path d="M3 12 L6 12 L7 10 L9 10 L10 12 L12 12" />
      <circle cx="5" cy="14" r="1.5" />
      <circle cx="10" cy="14" r="1.5" />
      <path d="M7 10 L7 8 L9 8 L9 10" />
      
      {/* Right car */}
      <path d="M21 12 L18 12 L17 10 L15 10 L14 12 L12 12" />
      <circle cx="19" cy="14" r="1.5" />
      <circle cx="14" cy="14" r="1.5" />
      <path d="M17 10 L17 8 L15 8 L15 10" />
      
      {/* Impact/explosion marks */}
      <path d="M12 8 L11 6" strokeWidth="2.5" />
      <path d="M12 8 L13 6" strokeWidth="2.5" />
      <path d="M12 8 L10.5 7" strokeWidth="2" />
      <path d="M12 8 L13.5 7" strokeWidth="2" />
    </svg>
  );
};
