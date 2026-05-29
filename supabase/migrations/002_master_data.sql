-- EMPLOYEES
create table public.employees (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  surname        text not null,
  middle_name    text,
  phone_number   text,
  recommendation text,
  is_active      boolean not null default true,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index on public.employees(user_id);

-- BUYERS
create table public.buyers (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  name     text not null,
  pib      text,
  jmbg     text,
  phone    text,
  address  text,
  city     text,
  email    text,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on public.buyers(user_id);

-- CULTURES
create table public.cultures (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  culture_name text not null,
  is_active    boolean not null default true,
  created_at   timestamptz default now()
);
create index on public.cultures(user_id);

-- CULTURE TYPES
create table public.culture_types (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  culture_id        uuid not null references public.cultures(id) on delete cascade,
  culture_type_name text not null,
  is_active         boolean not null default true,
  created_at        timestamptz default now()
);
create index on public.culture_types(user_id);
create index on public.culture_types(culture_id);

-- PACKAGING
create table public.packaging (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  packaging_type text not null,
  tara           numeric(10,3) not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz default now()
);
create index on public.packaging(user_id);

-- PLOT LISTS
create table public.plot_lists (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  plot_list_name text not null,
  created_at     timestamptz default now()
);
create index on public.plot_lists(user_id);

-- PLOTS
create table public.plots (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  plot_list_id uuid references public.plot_lists(id) on delete set null,
  plot_name    text not null,
  plot_label   text,
  is_active    boolean not null default true,
  created_at   timestamptz default now()
);
create index on public.plots(user_id);
create index on public.plots(plot_list_id);

-- RLS for all master data tables
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'employees','buyers','cultures','culture_types','packaging','plot_lists','plots'
  ] loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format(
      'create policy "%s: owner full access" on public.%I for all
       using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      tbl, tbl
    );
  end loop;
end;
$$;
