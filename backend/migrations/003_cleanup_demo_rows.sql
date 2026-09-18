-- Run this in Supabase → SQL Editor to delete old test/demo rows
-- (the ones with "[DEMO]" in the condition, saved before the real AI
-- model and login were wired in).

delete from analyses
where condition like '[DEMO]%'
   or condition = 'Unable to determine reliably';

-- Optional: if you'd rather wipe EVERYTHING and start completely fresh
-- (including any real test analyses), use this instead:
-- delete from analyses;
