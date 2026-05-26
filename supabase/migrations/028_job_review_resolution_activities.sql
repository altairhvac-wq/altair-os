-- Office review blocker resolution activity events (informational only).
-- Reuses job_activities; no new tables.

alter type public.job_activity_type add value if not exists 'invoice_created_for_completed_job';
alter type public.job_activity_type add value if not exists 'labor_entries_closed';
alter type public.job_activity_type add value if not exists 'pending_expenses_resolved';
alter type public.job_activity_type add value if not exists 'material_costs_completed';
