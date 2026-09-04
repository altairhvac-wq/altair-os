-- The Altair website's own pages: the first-party publishing surface.
--
-- ==================== WHY A NEW TABLE AND NOT A REUSE ====================
-- Nothing in this schema stores a web page. `marketing_posts` is one
-- publishable unit per provider and carries `post_text` — social copy with no
-- slug, no meta description, no canonical, no body structure. Widening it
-- would put an article and a Facebook caption in one row shape, and 143's
-- `unique (company_id, marketing_post_id, provider)` would then be guarding a
-- thing whose identity is a URL rather than a post.
--
-- `marketing_content_packages` (182) is the CREATIVE BRIEF that fans out to
-- many providers. A package is not a page: one package may produce a YouTube
-- video, a Facebook post AND a site article, and the article needs a durable
-- address of its own that survives the package being archived.
--
-- So: a page table. It is the ONLY CMS in this repo — there was no other to
-- extend, and this deliberately does not become one for anything but the
-- Altair marketing site.
--
-- ==================== WHAT IT DOES NOT DO ====================
-- It stores no HTML. `body_markdown` is text the renderer escapes, so a
-- compromised generator cannot inject script into a public page. There is no
-- `body_html` column and one must not be added without an explicit
-- sanitisation decision written down beside it.
--
-- ==================== THE SLUG IS THE IDENTITY ====================
-- `unique (company_id, slug)` is the duplicate guard for the whole first-party
-- publish path, exactly as 143's key is for external providers. A retry that
-- publishes the same package again finds the same slug and UPDATES it; it
-- cannot mint a second page at a second URL. That is what makes a published
-- address stable enough to be linked to and indexed.

create table if not exists public.marketing_site_pages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,

  -- The public address. Lowercase, hyphenated, no leading or trailing hyphen.
  -- Enforced here as well as in `shared/types/site-page.ts` because a slug is
  -- a URL: a bad one is a broken page for as long as it is indexed.
  slug text not null,

  title text not null,
  -- SEO metadata. Nullable because a draft may not have been written yet;
  -- `assertPublishableSitePage` refuses to PUBLISH without them.
  meta_title text,
  meta_description text,
  -- Absolute, and https. A canonical that points somewhere else is how a page
  -- tells search engines to rank a competitor instead.
  canonical_url text,

  -- Markdown. Never HTML. See the header.
  body_markdown text not null default '',
  -- JSON-LD, rendered into a script tag of type application/ld+json by the
  -- page. An object, not an array: one page describes one primary entity.
  structured_data jsonb not null default '{}'::jsonb,
  -- Slugs of other pages this one links to, so a link graph exists without
  -- parsing markdown on read. Validated against real pages before publish.
  internal_links text[] not null default '{}',
  keywords text[] not null default '{}',

  -- The creative brief this page came from, where there was one. Nullable: a
  -- hand-authored page has no package. Composite FK for the same-company rule.
  content_package_id uuid,

  page_state text not null default 'draft',
  published_at timestamptz,
  -- Bumped on every published revision. The public page shows the current
  -- one; `marketing_site_page_revisions` holds what each one said.
  revision integer not null default 1,

  created_by uuid references public.profiles (id) on delete set null,
  published_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint marketing_site_pages_slug_unique unique (company_id, slug),
  constraint marketing_site_pages_state_check
    check (page_state in ('draft', 'published', 'archived')),
  -- A slug is a URL segment and nothing else. No slashes, no dots, no spaces,
  -- no traversal, no scheme — the same shape rule migration 144 applies to a
  -- storage key, for the same reason.
  constraint marketing_site_pages_slug_shape
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 96),
  constraint marketing_site_pages_title_len
    check (char_length(title) between 1 and 200),
  constraint marketing_site_pages_meta_title_len
    check (meta_title is null or char_length(meta_title) between 1 and 70),
  constraint marketing_site_pages_meta_description_len
    check (meta_description is null or char_length(meta_description) between 1 and 200),
  -- https only, and no javascript: or data: URL can satisfy this.
  constraint marketing_site_pages_canonical_shape
    check (canonical_url is null or canonical_url ~ '^https://[a-z0-9.-]+(/[^\s]*)?$'),
  constraint marketing_site_pages_structured_data_object
    check (jsonb_typeof(structured_data) = 'object'),
  constraint marketing_site_pages_structured_data_size
    check (pg_column_size(structured_data) <= 8192),
  constraint marketing_site_pages_internal_links_bounded
    check (array_length(internal_links, 1) is null or array_length(internal_links, 1) <= 50),
  constraint marketing_site_pages_revision_positive
    check (revision >= 1),
  -- A published page must have been published by someone, at some time, and
  -- must carry the metadata that makes it a real page rather than a stub.
  -- This is the anti-thin-content floor in SQL: 600 characters is not a long
  -- article, but it is far more than a generated placeholder.
  constraint marketing_site_pages_published_is_complete
    check (
      page_state <> 'published'
      or (
        published_at is not null
        and meta_title is not null
        and meta_description is not null
        and canonical_url is not null
        and char_length(body_markdown) >= 600
      )
    )
);

-- Composite-FK target, the rule migration 145 established.
create unique index if not exists marketing_site_pages_id_company_key
  on public.marketing_site_pages (id, company_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'marketing_site_pages_package_fkey'
      and conrelid = 'public.marketing_site_pages'::regclass
  ) then
    alter table public.marketing_site_pages
      add constraint marketing_site_pages_package_fkey
      foreign key (content_package_id, company_id)
      references public.marketing_content_packages (id, company_id)
      on delete no action on update no action;
  end if;
end $$;

-- One page per package, so a retried publish converges instead of forking.
create unique index if not exists marketing_site_pages_package_key
  on public.marketing_site_pages (company_id, content_package_id)
  where content_package_id is not null;

-- The public read: published pages for one company, newest first.
create index if not exists marketing_site_pages_published_idx
  on public.marketing_site_pages (company_id, published_at desc)
  where page_state = 'published';

drop trigger if exists marketing_site_pages_set_updated_at
  on public.marketing_site_pages;
create trigger marketing_site_pages_set_updated_at
before update on public.marketing_site_pages
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- revisions
-- The audit trail. Append-only by grant: nothing revokes an operator's
-- ability to see what a page used to say, and nothing lets them rewrite it.
create table if not exists public.marketing_site_page_revisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  page_id uuid not null,
  revision integer not null,
  -- The full snapshot as published, so a revision can be read without
  -- reconstructing it from diffs.
  title text not null,
  slug text not null,
  meta_title text,
  meta_description text,
  canonical_url text,
  body_markdown text not null,
  structured_data jsonb not null default '{}'::jsonb,
  -- What changed and why, in a person's words. Bounded like every other
  -- operator-facing string in this schema.
  change_note text,
  published_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),

  constraint marketing_site_page_revisions_unique unique (page_id, revision),
  constraint marketing_site_page_revisions_revision_positive check (revision >= 1),
  constraint marketing_site_page_revisions_note_len
    check (change_note is null or char_length(change_note) <= 500)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'marketing_site_page_revisions_page_fkey'
      and conrelid = 'public.marketing_site_page_revisions'::regclass
  ) then
    alter table public.marketing_site_page_revisions
      add constraint marketing_site_page_revisions_page_fkey
      foreign key (page_id, company_id)
      references public.marketing_site_pages (id, company_id)
      on delete cascade on update no action;
  end if;
end $$;

create index if not exists marketing_site_page_revisions_page_idx
  on public.marketing_site_page_revisions (page_id, revision desc);

-- ---------------------------------------------------------------- security
--
-- ============ THE PUBLIC READ IS THE POINT, AND IS NARROW ============
-- Every other marketing table in this schema is dispatcher-read only. This
-- one has to be readable by ANONYMOUS visitors, because that is what a public
-- website is — but only the PUBLISHED rows. A draft is unreleased marketing
-- copy and stays invisible until a human publishes it.
--
-- The policy is on `page_state = 'published'` alone and is deliberately not
-- scoped by company: a visitor has no company context, and the site route
-- resolves the company itself. Drafts, archived rows, and every revision stay
-- unreadable to anon.
alter table public.marketing_site_pages enable row level security;

drop policy if exists "anyone can read published site pages"
  on public.marketing_site_pages;
create policy "anyone can read published site pages"
  on public.marketing_site_pages
  for select
  to anon, authenticated
  using (page_state = 'published');

drop policy if exists "dispatchers can read all site pages for their company"
  on public.marketing_site_pages;
create policy "dispatchers can read all site pages for their company"
  on public.marketing_site_pages
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
  );

grant select on table public.marketing_site_pages to authenticated;
-- The deliberate exception, and the only one in this schema. Every other
-- marketing table revokes everything from `anon`; a website cannot, because a
-- page nobody can read anonymously is not published. The narrowing is the
-- POLICY above, which exposes `page_state = 'published'` and nothing else, so
-- anon reads exactly the rows that are meant to be on the internet.
--
-- Writes are revoked from anon on the next line, so this grant is read-only.
-- `verify-integration-migrations.mjs` carries this table as a named exception
-- with that stricter assertion in place of the blanket revoke.
grant select on table public.marketing_site_pages to anon;
revoke insert, update, delete on table public.marketing_site_pages from authenticated;
revoke insert, update, delete on table public.marketing_site_pages from anon;
grant all on table public.marketing_site_pages to service_role;

-- Revisions are internal history. No anon policy exists, so no anon read is
-- possible regardless of the grant below being narrowed to authenticated.
alter table public.marketing_site_page_revisions enable row level security;

drop policy if exists "dispatchers can read site page revisions"
  on public.marketing_site_page_revisions;
create policy "dispatchers can read site page revisions"
  on public.marketing_site_page_revisions
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
  );

grant select on table public.marketing_site_page_revisions to authenticated;
revoke insert, update, delete on table public.marketing_site_page_revisions from authenticated;
revoke all on table public.marketing_site_page_revisions from anon;
grant all on table public.marketing_site_page_revisions to service_role;

comment on table public.marketing_site_pages is
  'The Altair marketing site''s pages. The only CMS in this repo. Body is markdown and never HTML; published rows are readable by anonymous visitors and drafts are not. unique (company_id, slug) is the first-party duplicate guard.';
comment on table public.marketing_site_page_revisions is
  'Append-only snapshot of every published revision of a site page, so a change to a live URL has an audit trail.';
