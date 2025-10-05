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
      {/* Car body - simplified silhouette */}
      <path d="M18,11.5 h-2.5 l-1,-2 h-5 l-1,2 h-2.5 c-1,0 -1.5,0.5 -1.5,1.5 v3 c0,1 0.5,1.5 1.5,1.5 h1 c0,0.8 0.7,1.5 1.5,1.5 s1.5,-0.7 1.5,-1.5 h4 c0,0.8 0.7,1.5 1.5,1.5 s1.5,-0.7 1.5,-1.5 h1 c1,0 1.5,-0.5 1.5,-1.5 v-3 c0,-1 -0.5,-1.5 -1.5,-1.5 z M8,16.5 c-0.6,0 -1,-0.4 -1,-1 s0.4,-1 1,-1 s1,0.4 1,1 s-0.4,1 -1,1 z M16,16.5 c-0.6,0 -1,-0.4 -1,-1 s0.4,-1 1,-1 s1,0.4 1,1 s-0.4,1 -1,1 z M18,14 h-12 v-1.5 h12 v1.5 z" />
      
      {/* Collision impact star burst - upper left */}
      <path d="M5,5 l0.7,1.5 l1.5,0.2 l-1.1,1 l0.3,1.5 l-1.4,-0.7 l-1.4,0.7 l0.3,-1.5 l-1.1,-1 l1.5,-0.2 z" />
    </svg>
  );
};
