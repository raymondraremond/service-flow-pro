import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/app/services/")({
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <Toaster theme="dark" position="top-center" />
      <Services />
    </AppShell>
  );
}

function Services() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const services = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("id,name,service_date,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!name.trim()) throw new Error("Name required");
      const { error } = await supabase
        .from("service_orders")
        .insert({ name: name.trim(), created_by: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-3xl p-5">
      <h1 className="mb-1 text-2xl font-semibold">Services</h1>
      <p className="mb-5 text-sm text-white/50">
        Create a run-sheet for the service. (Item ordering coming in next iteration.)
      </p>
      <div className="mb-5 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sunday Morning · May 24"
          className="flex-1 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
        />
        <button
          onClick={() => create.mutate()}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
        >
          + Create
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10">
        {services.data?.length === 0 && (
          <div className="p-8 text-center text-sm text-white/40">No services yet.</div>
        )}
        <ul className="divide-y divide-white/5">
          {services.data?.map((s) => (
            <li key={s.id} className="px-4 py-3">
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-white/40">
                {new Date(s.created_at).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
