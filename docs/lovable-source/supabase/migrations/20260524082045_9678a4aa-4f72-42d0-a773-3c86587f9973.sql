
-- Roles enum
create type public.app_role as enum ('super_admin', 'org_admin', 'branch_admin', 'librarian');
create type public.shift_t as enum ('Morning', 'Afternoon', 'Evening', 'Night');
create type public.person_type_t as enum ('member', 'student', 'teacher');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  role app_role not null,
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Institutions / Branches / Libraries
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  name text not null,
  type text not null default 'College',
  email text, phone text,
  city text, state text, country text default 'India',
  created_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions on delete cascade,
  name text not null,
  city text, address text,
  capacity int default 100,
  operating_start time, operating_end time,
  created_at timestamptz not null default now()
);

create table public.libraries (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches on delete cascade,
  name text not null,
  floor int default 1,
  capacity int default 60,
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions on delete cascade,
  name text not null,
  billing_cycle text not null default 'Monthly',
  price numeric(10,2) not null default 0,
  max_members int, max_seats int,
  features jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.seats (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references public.libraries on delete cascade,
  number text not null,
  section text, row int, col int,
  type text default 'Standard',
  status text default 'Available',
  created_at timestamptz not null default now(),
  unique (library_id, number)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions on delete cascade,
  branch_id uuid not null references public.branches on delete cascade,
  library_id uuid not null references public.libraries on delete cascade,
  name text not null, email text, phone text,
  status text default 'Active',
  shift shift_t default 'Morning',
  seat_id uuid references public.seats on delete set null,
  plan_id uuid references public.plans on delete set null,
  join_date date default current_date,
  fees_owed numeric(10,2) default 0,
  created_at timestamptz not null default now()
);
create unique index members_seat_unique on public.members(seat_id) where seat_id is not null;

create table public.students (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions on delete cascade,
  branch_id uuid not null references public.branches on delete cascade,
  library_id uuid not null references public.libraries on delete cascade,
  name text not null, email text, phone text,
  roll_no text, class_grade text,
  guardian_name text, guardian_phone text,
  status text default 'Active',
  shift shift_t default 'Morning',
  seat_id uuid references public.seats on delete set null,
  plan_id uuid references public.plans on delete set null,
  join_date date default current_date,
  created_at timestamptz not null default now()
);
create unique index students_seat_unique on public.students(seat_id) where seat_id is not null;

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions on delete cascade,
  branch_id uuid not null references public.branches on delete cascade,
  name text not null, email text, phone text,
  subject text,
  status text default 'Active',
  created_at timestamptz not null default now()
);

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions on delete cascade,
  person_type person_type_t not null,
  person_id uuid not null,
  from_branch_id uuid, to_branch_id uuid,
  from_library_id uuid, to_library_id uuid,
  from_seat_id uuid, to_seat_id uuid,
  reason text,
  created_by uuid references auth.users,
  created_at timestamptz not null default now()
);

create table public.shift_changes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions on delete cascade,
  person_type person_type_t not null,
  person_id uuid not null,
  from_shift shift_t, to_shift shift_t not null,
  effective_date date default current_date,
  created_by uuid references auth.users,
  created_at timestamptz not null default now()
);

create table public.plan_changes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions on delete cascade,
  person_type person_type_t not null,
  person_id uuid not null,
  from_plan_id uuid, to_plan_id uuid,
  effective_date date default current_date,
  created_by uuid references auth.users,
  created_at timestamptz not null default now()
);

-- helper: is user an owner of an institution
create or replace function public.owns_institution(_user_id uuid, _institution_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.institutions where id = _institution_id and owner_id = _user_id)
$$;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.institutions enable row level security;
alter table public.branches enable row level security;
alter table public.libraries enable row level security;
alter table public.plans enable row level security;
alter table public.seats enable row level security;
alter table public.members enable row level security;
alter table public.students enable row level security;
alter table public.teachers enable row level security;
alter table public.transfers enable row level security;
alter table public.shift_changes enable row level security;
alter table public.plan_changes enable row level security;

-- Profiles
create policy "users view own profile" on public.profiles for select using (auth.uid() = id);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- user_roles
create policy "users view own roles" on public.user_roles for select using (auth.uid() = user_id);

-- Institutions: owner only
create policy "owner all institutions" on public.institutions for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Branches/Libraries/Plans/Seats: scoped via institutions ownership
create policy "owner branches" on public.branches for all
  using (public.owns_institution(auth.uid(), institution_id))
  with check (public.owns_institution(auth.uid(), institution_id));

create policy "owner libraries" on public.libraries for all
  using (exists (select 1 from public.branches b where b.id = branch_id and public.owns_institution(auth.uid(), b.institution_id)))
  with check (exists (select 1 from public.branches b where b.id = branch_id and public.owns_institution(auth.uid(), b.institution_id)));

create policy "owner plans" on public.plans for all
  using (public.owns_institution(auth.uid(), institution_id))
  with check (public.owns_institution(auth.uid(), institution_id));

create policy "owner seats" on public.seats for all
  using (exists (select 1 from public.libraries l join public.branches b on b.id=l.branch_id where l.id = library_id and public.owns_institution(auth.uid(), b.institution_id)))
  with check (exists (select 1 from public.libraries l join public.branches b on b.id=l.branch_id where l.id = library_id and public.owns_institution(auth.uid(), b.institution_id)));

create policy "owner members" on public.members for all
  using (public.owns_institution(auth.uid(), institution_id))
  with check (public.owns_institution(auth.uid(), institution_id));

create policy "owner students" on public.students for all
  using (public.owns_institution(auth.uid(), institution_id))
  with check (public.owns_institution(auth.uid(), institution_id));

create policy "owner teachers" on public.teachers for all
  using (public.owns_institution(auth.uid(), institution_id))
  with check (public.owns_institution(auth.uid(), institution_id));

create policy "owner transfers" on public.transfers for all
  using (public.owns_institution(auth.uid(), institution_id))
  with check (public.owns_institution(auth.uid(), institution_id));

create policy "owner shift_changes" on public.shift_changes for all
  using (public.owns_institution(auth.uid(), institution_id))
  with check (public.owns_institution(auth.uid(), institution_id));

create policy "owner plan_changes" on public.plan_changes for all
  using (public.owns_institution(auth.uid(), institution_id))
  with check (public.owns_institution(auth.uid(), institution_id));

-- New user trigger: create profile + default org_admin role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'avatar_url');
  insert into public.user_roles (user_id, role) values (new.id, 'org_admin') on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
