# apps/worker (reserved for Stage B)

The analysis worker arrives in Stage B. It will pick up queued analysis runs,
drive screen capture, code analysis, backend and logic review, software risk
checks and correlation, call the Claude API with the rule pack rubrics, and
write findings and evidence to Supabase.

Nothing here is part of the pnpm workspace build yet.
