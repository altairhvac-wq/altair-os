-- Invoice edit activity: record invoice detail updates before payment.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'invoice_activity_type'
      and e.enumlabel = 'invoice_updated'
  ) then
    alter type public.invoice_activity_type add value if not exists 'invoice_updated';
  end if;
end $$;
