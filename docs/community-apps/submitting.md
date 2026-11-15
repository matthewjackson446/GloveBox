# Submitting Glovebox to Community Apps

The checklist and steps for getting Glovebox listed in Unraid's Apps tab. Steps 2 and 4 need your own accounts.

## Requirements (from ca.unraid.net)

| Requirement | Glovebox |
| --- | --- |
| Public, active GitHub repository | ✅ `matthewjackson446/GloveBox` |
| OSI-approved licence file in the repo root | ✅ `LICENSE` (MIT) |
| Valid Docker template XML | ✅ `unraid/glovebox.xml` |
| `ca_profile.xml` in the repo root with a non-empty `<Profile>` | ✅ `ca_profile.xml` |
| Support link (forum thread recommended) | ⏳ after step 2 |

## Steps

1. **Merge** the PR that adds `ca_profile.xml` and these docs, so they're on `main`.
2. **Post the support thread** on forums.unraid.net under **Community Apps → Docker Containers**, using [`forum-post.md`](forum-post.md). Copy the thread's address.
3. **Point the template at the thread.** Send Claude the address. It goes into `<Support>` in `unraid/glovebox.xml` and `<Forum>` in `ca_profile.xml`. Merge that change.
4. **Submit:** go to https://ca.unraid.net/submit/new and sign in as prompted.
   - Repository: `https://github.com/matthewjackson446/GloveBox`
   - Support thread: the address from step 2
   - Press **Validate**, then **Scan**. Fix anything it reports (send it to Claude), push, and run Validate/Scan again until it's clean.
   - Submit.
5. **Wait for review.** A moderator checks the template; they may ask for changes in your support thread. Once approved, Glovebox appears in the Apps tab, usually within a few hours of approval.

## After it's listed

- Answer questions in the support thread (or bring them to Claude).
- Releases: merge to `main`, then tag `vX.Y.Z` and push the tag. That publishes `:X.Y.Z`, `:X.Y` and `:latest`, which is what Community Apps users get. Add a GitHub Release with notes from `CHANGELOG.md`.
- Template changes (new variables, descriptions) reach existing users the next time Community Apps refreshes. Never rename or remove variables that existing installs rely on.

## Notes

- The template lives in `unraid/`. The official starter layout uses `templates/`. If **Scan** doesn't find the template, move it to `templates/glovebox.xml` and update `<TemplateURL>` to match.
- The template's `<Category>` uses the long-standing `Productivity: Tools:` form, which Community Apps normalises itself.
