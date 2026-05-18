import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PresentationMode =
  | "slide"
  | "black"
  | "logo"
  | "verse"
  | "media"
  | "blank";

export type PresentationState = {
  id: string;
  session_id: string;
  mode: PresentationMode;
  current_song_id: string | null;
  current_slide_index: number;
  payload: {
    song_title?: string;
    slides?: string[];
    verse_ref?: string;
    verse_text?: string;
    announcement?: string;
    image_url?: string;
  };
  updated_at: string;
};

// Single-session realtime hook. Sets up subscribe + polling fallback.
export function usePresentation(sessionId: string | null) {
  const [state, setState] = useState<PresentationState | null>(null);
  const [connected, setConnected] = useState(false);
  const pollRef = useRef<number | null>(null);

  const fetchOnce = useCallback(async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from("presentation_state")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (data) setState(data as unknown as PresentationState);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    fetchOnce();
    const channel = supabase
      .channel(`pres:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "presentation_state",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new) setState(payload.new as PresentationState);
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    // polling fallback every 2s if disconnected
    pollRef.current = window.setInterval(() => {
      fetchOnce();
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [sessionId, fetchOnce]);

  return { state, connected, refresh: fetchOnce };
}

export async function updatePresentation(
  sessionId: string,
  patch: Partial<Omit<PresentationState, "id" | "session_id" | "updated_at">>
) {
  const { error } = await supabase
    .from("presentation_state")
    .update(patch as never)
    .eq("session_id", sessionId);
  if (error) throw error;
}

export async function ensureDefaultSession(userId: string) {
  // Find an existing active session owned by user, else create one.
  const { data: existing } = await supabase
    .from("presentation_sessions")
    .select("*")
    .eq("owner_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    await ensureStateRow(existing.id);
    return existing;
  }
  const slug = `live-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await supabase
    .from("presentation_sessions")
    .insert({ name: "Main Service", slug, owner_id: userId, is_active: true })
    .select("*")
    .single();
  if (error) throw error;
  await ensureStateRow(data.id);
  return data;
}

async function ensureStateRow(sessionId: string) {
  const { data } = await supabase
    .from("presentation_state")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!data) {
    await supabase
      .from("presentation_state")
      .insert({ session_id: sessionId, mode: "blank" });
  }
}
