import { useQuery } from "@tanstack/react-query";

interface CommentsCountProps {
  incidentId: string;
}

export function CommentsCount({ incidentId }: CommentsCountProps) {
  const { data: commentsData } = useQuery({
    queryKey: [`/api/incidents/${incidentId}/social/comments`],
    queryFn: async () => {
      const response = await fetch(`/api/incidents/${incidentId}/social/comments`);
      if (!response.ok) throw new Error('Failed to fetch comment count');
      const data = await response.json();
      return data as { comments: any[], count: number };
    },
    enabled: !!incidentId,
    staleTime: 30000, // 30 seconds
  });

  const count = commentsData?.count || 0;
  
  return (
    <span className="text-muted-foreground ml-1">{count}</span>
  );
}