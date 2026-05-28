-- Extend job activity enum for dispatch unassign and labor auto-close audit events.

alter type public.job_activity_type add value if not exists 'technician_unassigned';
alter type public.job_activity_type add value if not exists 'job_labor_auto_closed';
