interface CrashIconProps {
  className?: string;
}

export const CrashIcon = ({ className = "w-5 h-5" }: CrashIconProps) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="currentColor"
      className={className}
    >
      {/* Simple car silhouette */}
      <path d="M 18 13 L 15.5 13 L 14.5 10 L 9.5 10 L 8.5 13 L 6 13 C 5.4 13 5 13.4 5 14 L 5 17 C 5 17.6 5.4 18 6 18 L 7 18 C 7 19 7.9 20 9 20 C 10.1 20 11 19 11 18 L 13 18 C 13 19 13.9 20 15 20 C 16.1 20 17 19 17 18 L 18 18 C 18.6 18 19 17.6 19 17 L 19 14 C 19 13.4 18.6 13 18 13 Z M 9 19 C 8.4 19 8 18.6 8 18 C 8 17.4 8.4 17 9 17 C 9.6 17 10 17.4 10 18 C 10 18.6 9.6 19 9 19 Z M 15 19 C 14.4 19 14 18.6 14 18 C 14 17.4 14.4 17 15 17 C 15.6 17 16 17.4 16 18 C 16 18.6 15.6 19 15 19 Z M 17 16 L 7 16 L 7 14 L 17 14 Z" />
      
      {/* Impact/collision burst */}
      <path d="M 4.5 6 L 5.5 8 L 3.5 8 Z M 6 4.5 L 8 5.5 L 8 3.5 Z M 3 4.5 L 3 3.5 L 5 5.5 Z M 5 3 L 6 3 L 4.5 5 Z" />
    </svg>
  );
};
