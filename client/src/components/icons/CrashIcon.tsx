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
      {/* Car silhouette */}
      <path d="M7 17h2m6 0h2M5 17H3v-3c0-1 1-2 2-2h3l2-3h4l2 3h3c1 0 2 1 2 2v3h-2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
      
      {/* Impact burst lines radiating from center */}
      <path d="M12 8L12 4" strokeWidth="2.5" />
      <path d="M12 8L16 5" strokeWidth="2" />
      <path d="M12 8L8 5" strokeWidth="2" />
      <path d="M12 8L15 9" strokeWidth="1.5" />
      <path d="M12 8L9 9" strokeWidth="1.5" />
    </svg>
  );
};
