
-- Enums
create type public.app_role as enum ('admin', 'operator');
create type public.presentation_mode as enum ('slide','black','logo','verse','media','blank');
create type public.service_item_kind as enum ('song','scripture','announcement','media');

-- profiles
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles select own" on public.profiles for select to authenticated using (auth.uid() = user_id);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = user_id);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = user_id);

-- user_roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "user_roles select own" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "user_roles admin manage" on public.user_roles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- auto-create profile and operator role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  insert into public.user_roles (user_id, role) values (new.id, 'operator');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- songs
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  category text,
  number int,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index songs_title_idx on public.songs using gin (to_tsvector('simple', title));
create index songs_artist_idx on public.songs (artist);
create index songs_number_idx on public.songs (number);
alter table public.songs enable row level security;
create policy "songs auth read" on public.songs for select to authenticated using (true);
create policy "songs auth insert" on public.songs for insert to authenticated with check (auth.uid() = created_by);
create policy "songs auth update" on public.songs for update to authenticated using (auth.uid() = created_by or public.has_role(auth.uid(),'admin'));
create policy "songs auth delete" on public.songs for delete to authenticated using (auth.uid() = created_by or public.has_role(auth.uid(),'admin'));
create trigger songs_touch before update on public.songs for each row execute function public.touch_updated_at();

-- song_slides
create table public.song_slides (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  position int not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique (song_id, position)
);
create index song_slides_song_idx on public.song_slides (song_id, position);
alter table public.song_slides enable row level security;
create policy "slides auth read" on public.song_slides for select to authenticated using (true);
create policy "slides auth write" on public.song_slides for all to authenticated using (
  exists (select 1 from public.songs s where s.id = song_id and (s.created_by = auth.uid() or public.has_role(auth.uid(),'admin')))
) with check (
  exists (select 1 from public.songs s where s.id = song_id and (s.created_by = auth.uid() or public.has_role(auth.uid(),'admin')))
);
-- public projector needs to read slides for active presentation; allow anon read (slides are not sensitive)
create policy "slides anon read" on public.song_slides for select to anon using (true);
create policy "songs anon read" on public.songs for select to anon using (true);

-- service_orders
create table public.service_orders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.service_orders enable row level security;
create policy "svc read auth" on public.service_orders for select to authenticated using (true);
create policy "svc insert auth" on public.service_orders for insert to authenticated with check (auth.uid() = created_by);
create policy "svc update own" on public.service_orders for update to authenticated using (auth.uid() = created_by or public.has_role(auth.uid(),'admin'));
create policy "svc delete own" on public.service_orders for delete to authenticated using (auth.uid() = created_by or public.has_role(auth.uid(),'admin'));
create trigger svc_touch before update on public.service_orders for each row execute function public.touch_updated_at();

-- service_items
create table public.service_items (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  position int not null,
  kind public.service_item_kind not null,
  ref_id uuid,
  title text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (service_order_id, position)
);
alter table public.service_items enable row level security;
create policy "items read auth" on public.service_items for select to authenticated using (true);
create policy "items write auth" on public.service_items for all to authenticated using (
  exists (select 1 from public.service_orders o where o.id = service_order_id and (o.created_by = auth.uid() or public.has_role(auth.uid(),'admin')))
) with check (
  exists (select 1 from public.service_orders o where o.id = service_order_id and (o.created_by = auth.uid() or public.has_role(auth.uid(),'admin')))
);

-- media_assets (skeleton)
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  storage_path text not null,
  width int, height int,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.media_assets enable row level security;
create policy "media read auth" on public.media_assets for select to authenticated using (true);
create policy "media write own" on public.media_assets for all to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by);

-- presentation_sessions
create table public.presentation_sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid references auth.users(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.presentation_sessions enable row level security;
create policy "sessions auth read" on public.presentation_sessions for select to authenticated using (true);
create policy "sessions anon read active" on public.presentation_sessions for select to anon using (is_active = true);
create policy "sessions insert own" on public.presentation_sessions for insert to authenticated with check (auth.uid() = owner_id);
create policy "sessions update own" on public.presentation_sessions for update to authenticated using (auth.uid() = owner_id or public.has_role(auth.uid(),'admin'));
create policy "sessions delete own" on public.presentation_sessions for delete to authenticated using (auth.uid() = owner_id or public.has_role(auth.uid(),'admin'));

-- presentation_state (one row per session)
create table public.presentation_state (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.presentation_sessions(id) on delete cascade,
  mode public.presentation_mode not null default 'blank',
  current_song_id uuid references public.songs(id) on delete set null,
  current_slide_index int not null default 0,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.presentation_state enable row level security;
create policy "state auth read" on public.presentation_state for select to authenticated using (true);
create policy "state anon read active" on public.presentation_state for select to anon using (
  exists (select 1 from public.presentation_sessions s where s.id = session_id and s.is_active = true)
);
create policy "state owner write" on public.presentation_state for all to authenticated using (
  exists (select 1 from public.presentation_sessions s where s.id = session_id and (s.owner_id = auth.uid() or public.has_role(auth.uid(),'admin')))
) with check (
  exists (select 1 from public.presentation_sessions s where s.id = session_id and (s.owner_id = auth.uid() or public.has_role(auth.uid(),'admin')))
);
create trigger state_touch before update on public.presentation_state for each row execute function public.touch_updated_at();

-- Realtime
alter publication supabase_realtime add table public.presentation_state;
alter table public.presentation_state replica identity full;
