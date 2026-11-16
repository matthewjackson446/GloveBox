# Other "Glovebox" apps — competitor notes

_Written 2026-11-16._

## au12/glovebox: the one that hit Community Apps the same day

- **CA listing:** "Glovebox" from *au12's Repository*, first seen 2026-11-16, right next to ours in the search results. https://ca.unraid.net/apps/glovebox-0zi3b2z1nubky7
- **Repo:** https://github.com/au12/glovebox (1 star, MIT). Image `ghcr.io/au12/glovebox`, built for **amd64 and arm64**.
- **Releases:** 0.1.0 and 0.2.0, both on **2026-11-15**, the same day as our v0.1.0.
- **What it is:** a **reskinned fork of LubeLogger** (hargata/lubelog, .NET, LiteDB/Postgres), not a new app. The repo has 2,123 commits because it carries LubeLogger's whole history. It reads and writes LubeLogger 1.7.4 data unchanged, so it's sold as a drop-in swap: change the Repository on an existing LubeLogger container and keep the paths.
- **Who it's for:** American defaults (`TZ=America/Chicago`, `en_US`, printing on Letter paper, miles). It has **nothing UK-specific**: no MOT, tax, DVLA or DVSA support, and no insurance or renewal tracking beyond LubeLogger's generic reminders.

### What it adds on top of LubeLogger
| Feature | Notes |
| --- | --- |
| Garage view built around what's due | Each vehicle card shows its odometer, its status and the next two items due. Overdue, urgent and due-soon items from every vehicle are pulled into a "Needs attention" list at the top. |
| Vehicle overview | Shows upcoming items with **a progress bar through each interval** and **an estimated due date based on your driving pace**, plus a one-tap **"Log it"** button. LubeLogger's charts are one tap away. |
| Phone-first UI | Bottom navigation, quick add for every record type, bottom-sheet forms, and tables that become cards on small screens. |
| Markdown notes | Notes open as rendered markdown and can be edited. |
| In-app attachment viewer | Opens images, PDFs (rendered with zoom), video, audio, text and CSV full-screen, with swipe and arrow-key navigation. |
| ntfy push | Stages are heads-up, due soon, urgent and overdue, and each is sent once per cycle. Adds **quiet hours** and **optional repeats while overdue**. Checks run every 15 minutes and whenever a record changes. |
| Heads-up before due | A default early warning (e.g. 500 miles or 14 days) that can be **overridden or turned off per reminder**. Each reminder can also be muted. |
| Maintenance report | A printable summary: upcoming items, spending by type and year, total cost of ownership, when routine items were last done, and the full history grouped by year. Prints cleanly in dark mode too. |
| Hide costs | One switch hides every cost field and total. Stored amounts are kept. |
| Settings | Grouped by area, and each change saves on its own. |
| Removed | All search is gone; tag filters remain. |

Features it inherits from LubeLogger (we don't have most of these): fuel and mileage logging, record types (service, repair, upgrade, tax, odometer, supplies), a planner, inspections, a REST API, OpenID sign-in, PostgreSQL, CSV import and export, and sign-up by invitation token.

Known gaps they mention themselves: the text they added is English only, and the kiosk and error pages still look like LubeLogger.

## Other Glovebox projects (not in CA)
- **dcrypd/glovebox** (Python/FastAPI, PolyForm Noncommercial, Oct 2026): a fuel and EV economy log with reminders by date or distance. Marking a reminder done pre-fills a service record. Has **QR codes for quick logging** to stick inside the fuel door, a PWA, and **no auth**.
- **domengorjup/glovebox** (Python, MIT, v0.4.0 on 11 Nov 2026): a Home Assistant add-on for running costs. **CSV import with column mapping and presets for Fuelly, Fuelio and Drivvo**, an .ics feed, and a read-only stats API for HA sensors.
- **D23M23/glovebox** (React/Express, MIT, Apr 2026): a fleet and rental condition logger with a damage map on a car silhouette. Not really comparable.

## Where we're ahead
- **UK focus:** MOT, tax, SORN, DVLA/DVSA lookups, a nightly refresh and MOT history. Nobody else has these.
- **Renewals:** insurance, breakdown, warranty and finance, with policy numbers and price history when you renew.
- **More reminder channels:** email, ntfy, Gotify, Discord and webhooks, chosen per user (theirs is ntfy only).
- **Calendar feed** per user.
- **Emergency card**.
- **Sharing per vehicle** with owner, can edit or can view roles.
- **2FA**, and a **backup ZIP**.
- **Our own codebase,** rather than a reskin that has to track upstream LubeLogger.

## Ideas worth borrowing (rough priority)
1. **arm64 image.** We only build `linux/amd64` (`.github/workflows` line 48). Theirs ships both. Cheap to add with QEMU/buildx.
2. **"Needs attention" strip** at the top of the dashboard, listing overdue and due-soon items across all vehicles.
3. **Progress bar through each service interval**, by date or mileage, with the estimated due date we already calculate.
4. **One-tap "Log it"** on a due service that opens a pre-filled service record and rolls the reminder on (dcrypd does this too).
5. **Notification polish:** quiet hours, optional repeats while overdue, and heads-up/mute per item as well as per user.
6. **Printable vehicle history / sale pack** (PDF): summary, costs, full service history and MOT history. This pairs well with archiving sold vehicles.
7. **In-app viewer** for documents (PDF and images) instead of downloading them.
8. **Import from LubeLogger** (and maybe Fuelly CSV). This is the obvious way to pick up users who are switching.
9. Smaller items: a "hide costs" toggle, markdown notes, and QR quick-log.
10. Maybe later: fuel and economy logging, which we don't do at all.

## Naming
There are now two apps called "Glovebox" side by side in CA. Theirs reads as a generic maintenance tracker. Ours leads with MOT, tax and insurance, which is fine, but it's worth making "UK" obvious in our CA description and on the forum thread so people pick the right one.
