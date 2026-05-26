-- Expense workflow activity events for submit, approve, reject, and reimburse.

alter type public.expense_activity_type add value if not exists 'expense_created';
alter type public.expense_activity_type add value if not exists 'expense_submitted';
alter type public.expense_activity_type add value if not exists 'expense_approved';
alter type public.expense_activity_type add value if not exists 'expense_rejected';
alter type public.expense_activity_type add value if not exists 'expense_reimbursed';
