LUDEX — a gaming deals & news site. Tracks PC game price drops (via CheapShark API) and gaming news (via RSS), auto-published by an n8n automation into a Supabase database, and rendered by this static site.

Setup:
1. Run `schema.sql` in your Supabase project's SQL Editor.
2. The Supabase URL + anon key are already embedded in `index.html` (public, read-only — safe to expose; row-level security restricts writes to the service_role key, which only the n8n automation uses).
3. Deploy `index.html` as-is (static, no build step) — e.g. Vercel.

