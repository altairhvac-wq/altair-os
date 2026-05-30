-- Allow payroll clock and job labor (and break) as separate open segments per technician.

drop index if exists public.time_entries_one_active_per_technician_idx;

create unique index if not exists time_entries_one_open_clock_per_technician_idx
  on public.time_entries (company_id, technician_id)
  where ended_at is null and entry_type = 'clock';

create unique index if not exists time_entries_one_open_break_per_technician_idx
  on public.time_entries (company_id, technician_id)
  where ended_at is null and entry_type = 'break';

create unique index if not exists time_entries_one_open_job_labor_per_technician_idx
  on public.time_entries (company_id, technician_id)
  where ended_at is null and entry_type = 'job_labor';
