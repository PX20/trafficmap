interface AmbulanceIconProps {
  className?: string;
}

export const AmbulanceIcon = ({ className = "w-5 h-5" }: AmbulanceIconProps) => {
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
      {/* Ambulance body */}
      <path d="M3 17h2v-5l2-3h6v8" />
      <path d="M13 9h5l3 3v5h-2" />
      
      {/* Wheels */}
      <circle cx="6.5" cy="17" r="2" />
      <circle cx="16.5" cy="17" r="2" />
      
      {/* Medical cross */}
      <path d="M15 5v4" strokeWidth="2.5" />
      <path d="M13 7h4" strokeWidth="2.5" />
      
      {/* Window/details */}
      <path d="M7 9h3" />
    </svg>
  );
};
