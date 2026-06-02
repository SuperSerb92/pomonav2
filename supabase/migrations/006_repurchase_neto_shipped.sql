alter table public.repurchase
  add column if not exists neto_shipped numeric(10,3),
  add column if not exists difference   numeric(10,3);
