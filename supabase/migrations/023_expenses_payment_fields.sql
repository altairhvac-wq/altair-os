-- Expense payment method and reimbursable flag for company card vs personal spend.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'expense_payment_method') then
    create type public.expense_payment_method as enum (
      'company_card',
      'personal_card',
      'cash',
      'other'
    );
  end if;
end $$;

alter table public.expenses
  add column if not exists payment_method public.expense_payment_method not null default 'personal_card';

alter table public.expenses
  add column if not exists is_reimbursable boolean not null default true;

create index if not exists expenses_company_id_is_reimbursable_idx
  on public.expenses (company_id, is_reimbursable)
  where is_reimbursable = true;
