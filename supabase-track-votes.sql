create table if not exists public.track_votes (
  track_id text not null,
  voter_ip_hash text not null,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (track_id, voter_ip_hash)
);

create or replace function public.set_track_votes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_track_votes_updated_at on public.track_votes;
create trigger trg_track_votes_updated_at
before update on public.track_votes
for each row execute function public.set_track_votes_updated_at();

alter table public.track_votes enable row level security;

drop policy if exists "public_read_track_votes" on public.track_votes;
create policy "public_read_track_votes"
on public.track_votes
for select
to anon, authenticated
using (true);

drop policy if exists "service_role_manage_track_votes" on public.track_votes;
create policy "service_role_manage_track_votes"
on public.track_votes
for all
to service_role
using (true)
with check (true);
