import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePresentation } from "@/hooks/usePresentation";
import { SlideRenderer } from "@/components/projector/SlideRenderer";

export const Route = createFileRoute("/live/$slug")({
  component: Projector,
});

function Projector() {
  const { slug } = Route.useParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase
      .from("presentation_sessions")
      .select("id,is_active")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!data || !data.is_active) setNotFound(true);
        else setSessionId(data.id);
      });
  }, [slug]);

  // Hide system cursor when idle would be nicer; keep it simple.
  const { state } = usePresentation(sessionId);

  if (notFound) {
    return (
      <div className="grid h-screen w-screen place-items-center bg-black text-white/40">
        Session not found
      </div>
    );
  }
  return <SlideRenderer state={state} />;
}
