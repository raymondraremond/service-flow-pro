import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PresentationMode =
  | "slide"
  | "black"
  | "logo"
  | "verse"
  | "media"
  | "countdown"
  | "blank";

export type SessionTheme = {
  bg?: string;          // hex e.g. "#000000"
  accent?: string;      // hex
  welcome?: string;     // welcome text shown on logo screen
  font?: "sans" | "serif" | "display";
  bg_video_url?: string; // looping motion background URL (mp4/webm)
  bg_video_dim?: number; // 0..1 dark overlay opacity (default 0.45)
};

export type Overlay = {
  alert?: string;       // lower-third banner text
  alert_kind?: "info" | "urgent";
};

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
    countdown_to?: string;     // ISO timestamp
    countdown_message?: string;
  };
  overlay: Overlay;
  updated_at: string;
};

export type Session = {
  id: string;
  slug: string;
  name: string;
  owner_id: string | null;
  is_active: boolean;
  theme: SessionTheme;
};

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

export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    if (!sessionId) return;
    let cancel = false;
    const load = async () => {
      const { data } = await supabase
        .from("presentation_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();
      if (!cancel && data) setSession(data as unknown as Session);
    };
    load();
    const ch = supabase
      .channel(`sess:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "presentation_sessions", filter: `id=eq.${sessionId}` },
        (p) => p.new && setSession(p.new as unknown as Session)
      )
      .subscribe();
    const t = window.setInterval(load, 4000);
    return () => {
      cancel = true;
      supabase.removeChannel(ch);
      window.clearInterval(t);
    };
  }, [sessionId]);
  return session;
}

export async function updatePresentation(
  sessionId: string,
  patch: Partial<Omit<PresentationState, "id" | "session_id" | "updated_at">>
) {
  const body = { ...(patch as Record<string, unknown>), updated_at: new Date().toISOString() };
  const { error } = await supabase
    .from("presentation_state")
    .update(body as never)
    .eq("session_id", sessionId);
  if (error) throw error;
}

export async function updateOverlay(sessionId: string, overlay: Overlay) {
  const { error } = await supabase
    .from("presentation_state")
    .update({ overlay, updated_at: new Date().toISOString() } as never)
    .eq("session_id", sessionId);
  if (error) throw error;
}

export async function updateTheme(sessionId: string, theme: SessionTheme) {
  const { error } = await supabase
    .from("presentation_sessions")
    .update({ theme } as never)
    .eq("id", sessionId);
  if (error) throw error;
}

export async function ensureDefaultSession(userId: string) {
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
