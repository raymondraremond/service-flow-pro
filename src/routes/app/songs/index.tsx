import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/app/songs/")({
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <Toaster theme="dark" position="top-center" />
      <SongList />
    </AppShell>
  );
}

function SongList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["songs-list", search],
    queryFn: async () => {
      const q = supabase.from("songs").select("id,title,artist,number,created_at").order("title").limit(200);
      const { data, error } = search
        ? await q.or(`title.ilike.%${search}%,artist.ilike.%${search}%`)
        : await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("songs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["songs-list"] });
      qc.invalidateQueries({ queryKey: ["songs"] });
      toast.success("Song deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Song Library</h1>
          <p className="text-sm text-white/50">Add, edit, and search songs for the service.</p>
        </div>
        <Link
          to="/app/songs/new"
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
        >
          + New Song
        </Link>
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search…"
        className="mb-4 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
      />
      <div className="overflow-hidden rounded-xl border border-white/10">
        {isLoading && <div className="p-6 text-sm text-white/40">Loading…</div>}
        {data?.length === 0 && (
          <div className="p-8 text-center text-sm text-white/40">No songs yet — add your first one.</div>
        )}
        <ul className="divide-y divide-white/5">
          {data?.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5">
              <button
                onClick={() => navigate({ to: "/app/songs/$songId", params: { songId: s.id } })}
                className="flex-1 text-left"
              >
                <div className="font-medium">{s.title}</div>
                {s.artist && <div className="text-xs text-white/50">{s.artist}</div>}
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete "${s.title}"? This cannot be undone.`)) del.mutate(s.id);
                }}
                className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
