# Project notes

## Version control

This repo uses **Jujutsu (`jj`)**, not plain git. It is colocated, so a `.git` directory exists too, but use `jj` commands (`jj status`, `jj log`, `jj describe`, `jj new`, `jj git push`, ...) for all version control work. Don't run `git commit`, `git checkout`, `git rebase` and similar; they can leave jj's view of the repo out of sync. Read-only git commands (`git show`, `git log`) are fine for looking at history.

jj snapshots the working copy automatically, so anything not in `.gitignore` is picked up into the current change.

## Stack

Astro + React islands, Tailwind/daisyUI. Content lives in a self-hosted PocketBase (not Supabase). See [POCKETBASE_SCHEMA.md](POCKETBASE_SCHEMA.md) for the collections and API rules the code expects. Set `PUBLIC_POCKETBASE_URL` in `.env`.

## Backups

`backup/` holds the old markdown posts and images from before the CMS refactor. It is gitignored and local only.
