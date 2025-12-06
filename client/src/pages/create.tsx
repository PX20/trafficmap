import { useState, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { IncidentReportForm } from "@/components/incident-report-form";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";

export default function Create() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [isOpen, setIsOpen] = useState(true);

  const returnPath = useMemo(() => {
    const params = new URLSearchParams(searchString);
    const from = params.get("from");
    if (from && from !== "/create") {
      return decodeURIComponent(from);
    }
    return "/feed";
  }, [searchString]);

  const handleClose = () => {
    setIsOpen(false);
    queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    setLocation(returnPath);
  };

  return (
    <IncidentReportForm
      isOpen={isOpen}
      onClose={handleClose}
      entryPoint="post"
      initialLocation={user?.preferredLocation || undefined}
    />
  );
}
