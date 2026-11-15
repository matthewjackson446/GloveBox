# Submitting Glovebox to Community Apps

The checklist and steps for getting Glovebox listed in Unraid's Apps tab. Steps 2 and 4 need your own accounts.

## Requirements (from ca.unraid.net)

| Requirement | Glovebox |
| --- | --- |
| Public, active GitHub repository | ✅ `matthewjackson446/GloveBox` |
| OSI-approved licence file in the repo root | ✅ `LICENSE` (MIT) |
| Valid Docker template XML | ✅ `unraid/glovebox.xml` |
| `ca_profile.xml` in the repo root with a non-empty `<Profile>` | ✅ `ca_profile.xml` |
| Support link (forum thread recommended) | ✅ [support thread](https://forums.unraid.net/topic/201296-support-glovebox-self-hosted-vehicle-tracker-mot-tax-insurance-servicing-reminders/) in `<Support>` and `<Forum>` |

## Steps

1. **Merge** the PR that adds `ca_profile.xml` and these docs, so they're on `main`.
2. ✅ **Post the support thread** using [`forum-post.md`](forum-post.md). Only Community Developers can start topics in **Application Support → Docker Containers**, so post in **Unraid OS Support → General Support** and message a moderator asking them to move it (and asking about Community Developer status). Posted: https://forums.unraid.net/topic/201296-support-glovebox-self-hosted-vehicle-tracker-mot-tax-insurance-servicing-reminders/
3. ✅ **Point the template at the thread**: `<Support>` in `unraid/glovebox.xml` and `<Forum>` in `ca_profile.xml`.
4. **Submit:** go to https://ca.unraid.net/submit/new and sign in as prompted.
   - Repository: `https://github.com/matthewjackson446/GloveBox`
   - Support thread: https://forums.unraid.net/topic/201296-support-glovebox-self-hosted-vehicle-tracker-mot-tax-insurance-servicing-reminders/
   - If the form rejects the thread because it's still awaiting moderator approval (it returns 404 to signed-out visitors until then), wait for approval, or temporarily use `https://github.com/matthewjackson446/GloveBox/issues`.
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
