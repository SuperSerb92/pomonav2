alter table public.repurchase
  add column if not exists paid      boolean not null default false,
  add column if not exists paid_date date;
