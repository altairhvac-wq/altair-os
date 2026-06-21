-- Add founder/product marketing source types for platform-admin draft starters.

alter type public.marketing_post_source add value if not exists 'founder_milestone';
alter type public.marketing_post_source add value if not exists 'product_update';
