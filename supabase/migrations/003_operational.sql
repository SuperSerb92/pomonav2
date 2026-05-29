-- BARCODES
create table public.barcodes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  employee_id     uuid references public.employees(id) on delete set null,
  culture_id      uuid references public.cultures(id) on delete set null,
  culture_type_id uuid references public.culture_types(id) on delete set null,
  packaging_id    uuid references public.packaging(id) on delete set null,
  plot_id         uuid references public.plots(id) on delete set null,
  barcode_value   text not null unique,
  tara            numeric(10,3),
  neto            numeric(10,3),
  bruto           numeric(10,3),
  print_count     integer not null default 0,
  is_storno       boolean not null default false,
  storno_at       timestamptz,
  storno_reason   text,
  created_at      timestamptz default now()
);
create index on public.barcodes(user_id);
create index on public.barcodes(created_at);

-- WORK EVALUATIONS
create table public.work_evaluations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  eval_date   date not null,
  neto        numeric(10,3),
  no_of_boxes integer,
  evaluation  smallint check (evaluation between 1 and 3),
  pay_per_day numeric(10,2),
  expense_kg  numeric(10,4),
  total       numeric(12,2),
  fuel        numeric(10,2),
  bonus       numeric(10,2),
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index on public.work_evaluations(user_id);
create index on public.work_evaluations(employee_id);
create index on public.work_evaluations(eval_date);

-- REPURCHASE
create table public.repurchase (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  buyer_id        uuid not null references public.buyers(id) on delete restrict,
  culture_id      uuid not null references public.cultures(id) on delete restrict,
  repurchase_date date not null,
  neto            numeric(10,3) not null,
  no_of_boxes     integer,
  price_rsd       numeric(10,4),
  price_eur       numeric(10,4),
  income_rsd      numeric(12,2),
  income_eur      numeric(12,2),
  eur_rate        numeric(10,4),
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index on public.repurchase(user_id);
create index on public.repurchase(repurchase_date);

-- SCHEDULER EVENTS
create table public.scheduler_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  start_at    timestamptz not null,
  end_at      timestamptz,
  color       text not null default '#2EB88E',
  employee_id uuid references public.employees(id) on delete set null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index on public.scheduler_events(user_id);
create index on public.scheduler_events(start_at);

-- RLS
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'barcodes','work_evaluations','repurchase','scheduler_events'
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
