# Changelog

## v0.1.0 (first release)

Glovebox keeps track of your vehicles' renewals and paperwork, and reminds you before anything runs out.

### Vehicles and renewals
- Track MOT, road tax, insurance, servicing (by date or mileage), breakdown cover, warranty, finance and anything else, colour-coded by when it's due.
- Store providers, policy and membership numbers, claims lines, premiums and excesses.
- **Renew** an insurance, breakdown, warranty or tax item to roll it on a year, keeping a price history so you can compare premiums.
- **Emergency card** for the roadside: one-tap 999, breakdown and claims lines, policy numbers, VIN, locking wheel nut code and your emergency contacts.

### History and documents
- Service history with costs, garage and mileage, and spending over the last 12 months and all time.
- Mileage log combining your updates, services and MOT readings, with an annual average and an estimated date for mileage-based services.
- Upload PDFs and photos (V5C, certificates, receipts) and attach them to a renewal or a job.

### Reminders
- A daily digest by **email, ntfy, Gotify, Discord or webhook**. Each user picks their own lead times (60/30/14/7/3/1 days, and overdue) and channels.
- No repeat reminders; renewing an item starts its reminders again.
- A private **calendar link** for Google, Apple or Outlook Calendar.

### DVLA and DVSA (optional, bring your own free keys)
- Look up a registration to fill in the vehicle's details.
- Nightly refresh of tax and MOT dates, tax/SORN status and MOT history with advisories.
- Step-by-step instructions in the app for getting your own keys.

### Self-hosting
- One container with a single SQLite database and uploads in `/config`.
- Multi-user, with per-vehicle sharing (owner, can edit, can view).
- Unraid template with `PUID`/`PGID`/`UMASK`/`TZ`, and optional `SMTP_*` variables.
- Works on plain `http://<lan-ip>` and behind a reverse proxy over HTTPS.
