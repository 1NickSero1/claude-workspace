alter table public.profiles add column if not exists email text;

create unique index if not exists profiles_nickname_unique_idx on public.profiles (lower(nickname));
create unique index if not exists profiles_email_unique_idx on public.profiles (lower(email));

-- Permite resolver nickname -> email SOLO para el intento de login (no expone
-- el resto de la fila de profiles; RLS de profiles sigue exigiendo auth.uid() = id).
create or replace function public.get_email_by_nickname(p_nickname text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from public.profiles where lower(nickname) = lower(p_nickname) limit 1;
$$;

grant execute on function public.get_email_by_nickname(text) to anon, authenticated;
