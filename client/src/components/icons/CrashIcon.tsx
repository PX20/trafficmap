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
      {/* Car body */}
      <path d="M18,11 h-2.5 l-1.5,-2.5 h-4 l-1.5,2.5 h-2.5 c-1.1,0 -2,0.9 -2,2 v4 c0,1.1 0.9,2 2,2 h0.5 c0.28,1.12 1.32,2 2.5,2 s2.22,-0.88 2.5,-2 h3 c0.28,1.12 1.32,2 2.5,2 s2.22,-0.88 2.5,-2 h0.5 c1.1,0 2,-0.9 2,-2 v-4 c0,-1.1 -0.9,-2 -2,-2 z M9,18 c-0.55,0 -1,-0.45 -1,-1 s0.45,-1 1,-1 s1,0.45 1,1 s-0.45,1 -1,1 z M15,18 c-0.55,0 -1,-0.45 -1,-1 s0.45,-1 1,-1 s1,0.45 1,1 s-0.45,1 -1,1 z M18,14 h-12 v-2 h12 v2 z" />
      
      {/* Impact/explosion star */}
      <path d="M5,3 l1,3 h3 l-2.5,2 l1,3 l-2.5,-2 l-2.5,2 l1,-3 l-2.5,-2 h3 z" />
    </svg>
  );
};
