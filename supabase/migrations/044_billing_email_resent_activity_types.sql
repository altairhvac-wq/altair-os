-- Audit trail for estimate/invoice email resends (no status change).

alter type public.estimate_activity_type add value if not exists 'estimate_email_resent';
alter type public.invoice_activity_type add value if not exists 'invoice_email_resent';
