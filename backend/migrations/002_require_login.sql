-- Run this in Supabase → SQL Editor.
-- Makes every new analysis automatically "stamped" with who created it,
-- and makes sure a farmer can only ever see their OWN analyses.

-- 1) Auto-fill user_id from whoever is logged in when the row is created.
alter table analyses alter column user_id set default auth.uid();

-- 2) Replace the old "anyone can see/insert" rules with strict per-user ones.
drop policy if exists "Anyone can create an analysis" on analyses;
drop policy if exists "Users can view their own analyses" on analyses;

create policy "Logged in farmers can create their own analysis"
on analyses for insert
with check (auth.uid() = user_id);

create policy "Farmers can view only their own analyses"
on analyses for select
using (auth.uid() = user_id);

-- Note: any analyses saved before login was added (user_id = null) will
-- become invisible to everyone under this stricter rule. They are NOT
-- deleted — just hidden, since they don't belong to any logged-in farmer.
