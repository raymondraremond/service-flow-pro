import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
  const [cursor, setCursor] = useState(true);
  const tRef = useRef<number | null>(null);

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

  useEffect(() => {
    const arm = () => {
      setCursor(true);
      if (tRef.current) window.clearTimeout(tRef.current);
      tRef.current = window.setTimeout(() => setCursor(false), 2500);
    };
    arm();
    window.addEventListener("mousemove", arm);
    return () => {
      window.removeEventListener("mousemove", arm);
      if (tRef.current) window.clearTimeout(tRef.current);
    };
  }, []);

  const { state } = usePresentation(sessionId);

  if (notFound) {
    return (
      <div className="grid h-screen w-screen place-items-center bg-black text-white/40">
        Session not found
      </div>
    );
  }
  return (
    <div style={{ cursor: cursor ? "default" : "none" }}>
      <SlideRenderer state={state} />
    </div>
  );
}
