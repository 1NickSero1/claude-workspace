create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  nickname      text not null,
  avatar_color  text not null default '#6C5CE7',
  avatar_emoji  text,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "select own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id);
