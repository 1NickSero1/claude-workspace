create table public.casos (
  id           uuid primary key default gen_random_uuid(),
  tipo         text not null check (tipo in ('Legal','Psicológica','Documentos','Vivienda','Salud','Otro')),
  descripcion  text not null,
  nombre       text,
  idioma       text,
  estado       text,
  anonimo      boolean not null default false,
  status       text not null default 'pendiente' check (status in ('pendiente','en_progreso','resuelto')),
  created_at   timestamptz not null default now()
);

alter table public.casos enable row level security;

create policy "cualquiera puede enviar un caso" on public.casos
  for insert to anon
  with check (status = 'pendiente');
