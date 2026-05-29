create type public.subscription_tier as enum ('free', 'pro', 'business');
create type public.subscription_status as enum (
  'active', 'trialing', 'past_due', 'canceled', 'incomplete', 'paused'
);

create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  stripe_price_id        text,
  tier                   public.subscription_tier not null default 'free',
  status                 public.subscription_status not null default 'active',
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  trial_end              timestamptz,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);
create index on public.subscriptions(user_id);
create index on public.subscriptions(stripe_customer_id);
create index on public.subscriptions(stripe_subscription_id);

alter table public.subscriptions enable row level security;

-- Users can only read their own subscription; webhook writes via service role (bypasses RLS)
create policy "subscriptions: owner read"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Auto-create free subscription when profile is created
create or replace function public.handle_new_subscription()
returns trigger language plpgsql security definer as $$
begin
  insert into public.subscriptions (user_id, tier, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_subscription();
