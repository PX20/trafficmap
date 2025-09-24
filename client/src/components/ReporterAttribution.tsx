import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useReporter } from "@/hooks/useReporter";
import { User, Building2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReporterAttributionProps {
  userId: string | null | undefined;
  className?: string;
  variant?: "default" | "compact" | "minimal";
  showAccountType?: boolean;
}

/**
 * ReporterAttribution component for reliably displaying user details
 * Replaces unreliable getSourceInfo patterns with React Query-powered data fetching
 * 
 * @param userId - The user ID to display attribution for
 * @param className - Additional CSS classes
 * @param variant - Display variant (default, compact, minimal)
 * @param showAccountType - Whether to show account type badge
 */
export function ReporterAttribution({ 
  userId, 
  className, 
  variant = "default", 
  showAccountType = false 
}: ReporterAttributionProps) {
  const { user, loading, error } = useReporter(userId);

  // Handle loading state
  if (loading) {
    return (
      <div 
        className={cn("flex items-center gap-2", className)} 
        data-testid={`reporter-attribution-loading-${userId || 'unknown'}`}
      >
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        {variant !== "minimal" && (
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-20" />
            {variant === "default" && showAccountType && (
              <Skeleton className="h-3 w-16" />
            )}
          </div>
        )}
      </div>
    );
  }

  // Handle missing userId
  if (!userId) {
    return (
      <div 
        className={cn("flex items-center gap-2", className)}
        data-testid="reporter-attribution-no-userid"
      >
        <Avatar className={cn(
          "flex-shrink-0",
          variant === "compact" || variant === "minimal" ? "h-6 w-6" : "h-8 w-8"
        )}>
          <AvatarFallback className="bg-muted text-muted-foreground">
            <User className="h-3 w-3" />
          </AvatarFallback>
        </Avatar>
        {variant !== "minimal" && (
          <div className="flex flex-col">
            <span className={cn(
              "text-muted-foreground",
              variant === "compact" ? "text-xs" : "text-sm"
            )}>
              Anonymous
            </span>
          </div>
        )}
      </div>
    );
  }

  // Handle error or missing user data
  if (error || !user) {
    return (
      <div 
        className={cn("flex items-center gap-2", className)}
        data-testid={`reporter-attribution-error-${userId}`}
      >
        <Avatar className={cn(
          "flex-shrink-0",
          variant === "compact" || variant === "minimal" ? "h-6 w-6" : "h-8 w-8"
        )}>
          <AvatarFallback className="bg-muted text-muted-foreground">
            <User className="h-3 w-3" />
          </AvatarFallback>
        </Avatar>
        {variant !== "minimal" && (
          <div className="flex flex-col">
            <span className={cn(
              "text-muted-foreground",
              variant === "compact" ? "text-xs" : "text-sm"
            )}>
              User unavailable
            </span>
          </div>
        )}
      </div>
    );
  }

  // Success state - display user information
  const displayName = user.displayName || "Anonymous User";
  const fallbackInitial = user.displayName ? 
    user.displayName.charAt(0).toUpperCase() : 
    "A";
  
  // Check if this is an official agency account
  const isOfficialAgency = user.isOfficialAgency || userId.startsWith('agency:');

  return (
    <div 
      className={cn("flex items-center gap-2", className)}
      data-testid={`reporter-attribution-${userId}`}
    >
      <Avatar className={cn(
        "flex-shrink-0",
        variant === "compact" || variant === "minimal" ? "h-6 w-6" : "h-8 w-8"
      )}>
        {user.avatarUrl ? (
          <AvatarImage 
            src={user.avatarUrl} 
            alt={displayName}
            data-testid={`reporter-avatar-${userId}`}
          />
        ) : null}
        <AvatarFallback 
          className={cn(
            isOfficialAgency 
              ? "bg-blue-600 text-white border-2 border-blue-700" 
              : "bg-primary text-primary-foreground"
          )}
          data-testid={`reporter-avatar-fallback-${userId}`}
        >
          {fallbackInitial}
        </AvatarFallback>
      </Avatar>
      
      {variant !== "minimal" && (
        <div className="flex flex-col min-w-0">
          <span 
            className={cn(
              "font-medium truncate",
              variant === "compact" ? "text-xs" : "text-sm"
            )}
            data-testid={`reporter-name-${userId}`}
          >
            {displayName}
          </span>
          
          {variant === "default" && showAccountType && (
            <>
              {isOfficialAgency && (
                <Badge 
                  variant="default" 
                  className="text-xs w-fit bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid={`reporter-official-badge-${userId}`}
                >
                  <Shield className="h-3 w-3 mr-1" />
                  Official
                </Badge>
              )}
              {!isOfficialAgency && user.accountType === "business" && (
                <Badge 
                  variant="secondary" 
                  className="text-xs w-fit"
                  data-testid={`reporter-account-type-${userId}`}
                >
                  <Building2 className="h-3 w-3 mr-1" />
                  Business
                </Badge>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}