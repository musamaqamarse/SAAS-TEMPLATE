-- Minimal subscriptions table — extend with whatever billing provider you use.
create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status subscription_status not null default 'trialing',
  plan text not null default 'free',
  current_period_start timestamptz,
  current_period_end timestamptz,
  external_id text,                     -- e.g. Stripe subscription id
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create unique index if not exists subscriptions_external_id_idx on public.subscriptions(external_id) where external_id is not null;

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.tg_set_updated_at();

alter table public.subscriptions enable row level security;

create policy "subscriptions: read own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Writes happen from server-only code with service-role key — no public write policy.
