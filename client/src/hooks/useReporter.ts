import { useQuery } from "@tanstack/react-query";
import { SafeUser } from "@shared/schema";

interface UseReporterResult {
  user: SafeUser | null;
  loading: boolean;
  error: boolean;
}

/**
 * Custom hook to reliably fetch user details for community reports
 * Uses React Query with proper cache management and graceful failure handling
 * 
 * @param userId - The user ID to fetch details for
 * @returns Object containing user data, loading state, and error state
 */
export function useReporter(userId: string | null | undefined): UseReporterResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/batch-users", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const response = await fetch(`/api/batch-users?ids=${encodeURIComponent(userId)}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.status}`);
      }
      
      const users: SafeUser[] = await response.json();
      return users.find(user => user.id === userId) || null;
    },
    enabled: !!userId, // Only run query if userId exists
    staleTime: 10 * 60 * 1000, // 10 minutes - consider data fresh for this long
    retry: 0, // Don't retry on failure for graceful degradation
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    gcTime: 15 * 60 * 1000, // 15 minutes - keep in cache for this long
  });

  return {
    user: data || null,
    loading: isLoading,
    error: isError || Boolean(userId && !isLoading && !data), // Error if userId exists but no user found
  };
}