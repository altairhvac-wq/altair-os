-- Auto-create draft invoice on work completion (V1): job activity + billing notification types.

alter type public.job_activity_type add value if not exists 'invoice_auto_created_from_completion';

alter type public.notification_type add value if not exists 'draft_invoice_ready';
