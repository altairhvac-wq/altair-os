-- Technician workflow Phase 1: arrived status, workflow timestamps, completion notes.

alter type public.job_status add value if not exists 'arrived';

alter table public.jobs
  add column if not exists arrived_at timestamptz,
  add column if not exists work_started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists completion_notes text,
  add column if not exists follow_up_notes text;

alter type public.job_activity_type add value if not exists 'technician_arrived';
alter type public.job_activity_type add value if not exists 'work_started';
alter type public.job_activity_type add value if not exists 'work_completed';
