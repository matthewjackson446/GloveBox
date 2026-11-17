# Changelog

## v0.5.0

- **Emergency cards work with no signal:** while you're signed in and online, every vehicle's emergency card is saved on your phone. If there's no signal (or it's too weak to load within a few seconds), the saved copy opens instead, and the card says when it was saved. Saved cards are deleted when you sign out. Needs HTTPS.
- **New Emergency cards page** (`/emergency`) listing every vehicle's card. It's a shortcut on the home-screen icon, and it's what opens if you start Glovebox with no signal.
- **Clean air zones and road tax band:** each vehicle page shows whether London's ULEZ and the UK's Clean Air and Low Emission Zones are likely to charge it (Euro 4 petrol, Euro 6 diesel), and its road tax (VED) band: by engine size before March 2001, CO₂ band A–M until March 2017, then the standard rate, including when the expensive car supplement ends. Historic vehicles are recognised. DVLA usually leaves out the Euro status, so the clean air check is an estimate from the fuel and first registration date when it's missing, and says so. There are links to TfL, GOV.UK's zone checker and the current tax rates.
- **New vehicle details:** first registration month, CO₂, Euro status and type (car, van or motorcycle). They're filled in from DVLA where it can be, and editable from your V5C.
- **Sale pack (PDF):** a **Sale pack** button on each vehicle page makes a PDF of its history for a buyer. It covers the vehicle's details and summary, mileage history (with any reading lower than the one before flagged), service and repair history (job notes and costs are optional), MOT history from the DVSA with what happened to the latest advisories, and an optional note from you. Pick which documents to attach: PDFs and JPG/PNG photos go in at the end with an index. Receipts linked to jobs are ticked by default; your V5C and insurance documents aren't. Policy numbers, key codes, finance and contacts are never included.
- **Security:** updated the email library (nodemailer 7 → 10) to fix a number of high-severity issues in address parsing and SMTP handling. Your email settings work the same as before.

## v0.4.0

- **Needs attention:** the dashboard now opens with everything that’s overdue or due within 30 days (or 1,000 miles) across all your vehicles, each with a one-tap **Renew** or **Update** button.
- **Progress bars** on each renewal show how far through its year, policy or service interval you are (by date or mileage, whichever is further along). Service intervals start from your last logged service.
- **Phone layout fixes:** the dashboard and header no longer run off the side of narrow screens; **Sign out** becomes an icon on phones.
- **MOT advisories to-do list:** advisories and minor defects from the latest MOT become a checklist on the vehicle page. Tick each one off as **Fixed** or **Ignore** it, and anything flagged at earlier MOTs too is highlighted. Without DVSA keys you can add advisories by hand. Ticked-off items stay ticked off when the MOT history refreshes, and a new MOT replaces the list.
- **MOT reminders list your open advisories**, so the 30-day reminder is a nudge to get them sorted before the test. The MOT card and the dashboard show how many are still open.

## v0.3.0

- **ARM64 images:** Glovebox now runs on Raspberry Pi 4/5, Apple Silicon and other ARM64 machines as well as x86-64. The same tags (`latest`, `edge`, version numbers) work on both.
- **Two-factor sign-in (TOTP):** turn it on under **Settings → Two-factor sign-in** and scan the QR code with any authenticator app. Includes 10 single-use recovery codes, protection against code reuse, a 5-attempt limit, and an admin reset in **Settings → Users** for lost phones.
- **Backup download:** admins can download a ZIP of the database and all uploaded documents from **Settings → Server → Backup**, with restore instructions inside.
- **Light / dark mode toggle** in the header: match device, light or dark (remembered per browser).

## v0.2.0

- **Now in Unraid Community Apps:** search “Glovebox” in the Apps tab. Support thread: https://forums.unraid.net/topic/201296-support-glovebox-self-hosted-vehicle-tracker-mot-tax-insurance-servicing-reminders/
- **Running costs:** a new Costs page shows each year’s spend by vehicle and category, built from service history, renewal costs (including past renewals) and finance payments.
- **Archive vehicles** you no longer have, from the vehicle’s Edit page. They leave the dashboard, reminders, calendar and nightly DVLA/DVSA checks but keep their history and documents, and can be restored.

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
