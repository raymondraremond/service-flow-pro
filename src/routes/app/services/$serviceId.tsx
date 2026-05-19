import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ensureDefaultSession, updatePresentation } from "@/hooks/usePresentation";
import { fetchVerse } from "@/lib/bible";

export const Route = createFileRoute("/app/services/$serviceId")({
  component: Page,
});

type ItemKind = "song" | "scripture" | "announcement";

type ServiceItem = {
  id: string;
  service_order_id: string;
  position: number;
  kind: ItemKind;
  title: string | null;
  ref_id: string | null;
  payload: Record<string, unknown>;
};

function Page() {
  return (
    <AppShell>
      <Toaster theme="dark" position="top-center" />
      <Editor />
    </AppShell>
  );
}

function Editor() {
  const { serviceId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (user) ensureDefaultSession(user.id).then((s) => setSessionId(s.id));
  }, [user]);

  const svc = useQuery({
    queryKey: ["service", serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("id,name,service_date")
        .eq("id", serviceId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const itemsQ = useQuery({
    queryKey: ["service-items", serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_items")
        .select("*")
        .eq("service_order_id", serviceId)
        .order("position");
      if (error) throw error;
      return (data ?? []) as ServiceItem[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["service-items", serviceId] });

  const addItem = async (kind: ItemKind, title: string, payload: Record<string, unknown> = {}, refId: string | null = null) => {
    const pos = (itemsQ.data?.length ?? 0);
    const { error } = await supabase.from("service_items").insert({
      service_order_id: serviceId,
      position: pos,
      kind,
      title,
      ref_id: refId,
      payload,
    });
    if (error) return toast.error(error.message);
    refresh();
  };

  const move = async (id: string, dir: -1 | 1) => {
    const items = itemsQ.data ?? [];
    const i = items.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= items.length) return;
    const a = items[i], b = items[j];
    // swap positions
    await supabase.from("service_items").update({ position: -1 }).eq("id", a.id);
    await supabase.from("service_items").update({ position: a.position }).eq("id", b.id);
    await supabase.from("service_items").update({ position: b.position }).eq("id", a.id);
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this item?")) return;
    await supabase.from("service_items").delete().eq("id", id);
    refresh();
  };

  const goLive = async (item: ServiceItem) => {
    if (!sessionId) return toast.error("No live session yet");
    try {
      if (item.kind === "song" && item.ref_id) {
        const { data, error } = await supabase
          .from("song_slides")
          .select("content")
          .eq("song_id", item.ref_id)
          .order("position");
        if (error) throw error;
        await updatePresentation(sessionId, {
          mode: "slide",
          current_song_id: item.ref_id,
          current_slide_index: 0,
          payload: { song_title: item.title ?? "", slides: (data ?? []).map((s) => s.content) },
        });
        toast.success(`Live: ${item.title}`);
      } else if (item.kind === "scripture") {
        const ref = (item.payload as { reference?: string })?.reference ?? item.title ?? "";
        const tr = (item.payload as { translation?: string })?.translation ?? "web";
        const v = await fetchVerse(ref, tr);
        await updatePresentation(sessionId, {
          mode: "verse",
          current_song_id: null,
          current_slide_index: 0,
          payload: { verse_ref: `${v.reference} · ${v.translation_name}`, verse_text: v.text },
        });
        toast.success(`Live: ${v.reference}`);
      } else if (item.kind === "announcement") {
        const text = (item.payload as { text?: string })?.text ?? item.title ?? "";
        await updatePresentation(sessionId, {
          mode: "verse",
          current_song_id: null,
          current_slide_index: 0,
          payload: { verse_text: text, verse_ref: item.title ?? undefined },
        });
        toast.success("Announcement live");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <Link to="/app/services" className="text-xs text-white/40 hover:text-white">← Services</Link>
          <h1 className="text-2xl font-semibold">{svc.data?.name ?? "…"}</h1>
        </div>
        <Link
          to="/app"
          className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
        >
          Open Live Control →
        </Link>
      </div>

      <AddBar onAdd={addItem} />

      <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
        {itemsQ.data?.length === 0 && (
          <div className="p-8 text-center text-sm text-white/40">
            Run-sheet is empty. Add a song, scripture, or announcement above.
          </div>
        )}
        <ul className="divide-y divide-white/5">
          {itemsQ.data?.map((it, i) => (
            <li key={it.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
              <div className="grid size-8 place-items-center rounded-md bg-white/5 text-xs font-bold text-white/50">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <KindBadge kind={it.kind} />
                  <div className="truncate font-medium">{it.title}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => move(it.id, -1)} className="rounded px-2 py-1 text-sm text-white/50 hover:bg-white/10">↑</button>
                <button onClick={() => move(it.id, 1)} className="rounded px-2 py-1 text-sm text-white/50 hover:bg-white/10">↓</button>
                <button
                  onClick={() => goLive(it)}
                  className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-emerald-400"
                >
                  Go Live
                </button>
                <button onClick={() => remove(it.id)} className="rounded px-2 py-1 text-sm text-red-300 hover:bg-red-500/10">✕</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function KindBadge({ kind }: { kind: ItemKind }) {
  const map: Record<ItemKind, string> = {
    song: "bg-emerald-500/15 text-emerald-300",
    scripture: "bg-sky-500/15 text-sky-300",
    announcement: "bg-amber-500/15 text-amber-300",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[kind]}`}>
      {kind}
    </span>
  );
}

function AddBar({
  onAdd,
}: {
  onAdd: (kind: ItemKind, title: string, payload?: Record<string, unknown>, refId?: string | null) => void;
}) {
  const [tab, setTab] = useState<ItemKind>("song");
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-3">
      <div className="mb-3 flex gap-1 text-xs">
        {(["song", "scripture", "announcement"] as ItemKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-md px-3 py-1.5 font-semibold uppercase tracking-wider ${
              tab === k ? "bg-emerald-500/15 text-emerald-200" : "text-white/50 hover:bg-white/5"
            }`}
          >
            + {k}
          </button>
        ))}
      </div>
      {tab === "song" && <AddSong onAdd={onAdd} />}
      {tab === "scripture" && <AddScripture onAdd={onAdd} />}
      {tab === "announcement" && <AddAnnouncement onAdd={onAdd} />}
    </div>
  );
}

function AddSong({ onAdd }: { onAdd: (k: ItemKind, t: string, p?: Record<string, unknown>, r?: string | null) => void }) {
  const [q, setQ] = useState("");
  const songs = useQuery({
    queryKey: ["songs-pick", q],
    queryFn: async () => {
      const base = supabase.from("songs").select("id,title,artist").order("title").limit(20);
      const { data, error } = q ? await base.or(`title.ilike.%${q}%,artist.ilike.%${q}%`) : await base;
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search songs…"
        className="mb-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
      />
      <div className="max-h-48 overflow-auto">
        {songs.data?.length === 0 && <div className="p-2 text-xs text-white/40">No songs.</div>}
        {songs.data?.map((s) => (
          <button
            key={s.id}
            onClick={() => onAdd("song", s.title, {}, s.id)}
            className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-white/5"
          >
            {s.title}
            {s.artist && <span className="text-xs text-white/40"> — {s.artist}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function AddScripture({ onAdd }: { onAdd: (k: ItemKind, t: string, p?: Record<string, unknown>, r?: string | null) => void }) {
  const [ref, setRef] = useState("");
  return (
    <div className="flex gap-2">
      <input
        value={ref}
        onChange={(e) => setRef(e.target.value)}
        placeholder="e.g. Psalm 23:1-6"
        className="flex-1 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
      />
      <button
        onClick={() => {
          if (!ref.trim()) return;
          onAdd("scripture", ref.trim(), { reference: ref.trim(), translation: "web" });
          setRef("");
        }}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
      >
        Add
      </button>
    </div>
  );
}

function AddAnnouncement({ onAdd }: { onAdd: (k: ItemKind, t: string, p?: Record<string, unknown>, r?: string | null) => void }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  return (
    <div className="space-y-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (e.g. Welcome)"
        className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Body text…"
        className="w-full resize-none rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
      />
      <button
        onClick={() => {
          if (!title.trim() || !text.trim()) return;
          onAdd("announcement", title.trim(), { text: text.trim() });
          setTitle("");
          setText("");
        }}
        className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
      >
        Add Announcement
      </button>
    </div>
  );
}
