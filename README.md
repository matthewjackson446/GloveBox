# Glovebox

A self-hosted tracker for your vehicles: MOT, road tax, insurance, servicing, breakdown cover, warranty and finance, all in one place and colour-coded by when they're due.

- **Dashboard.** Every vehicle at a glance, with overdue items in red and anything due within 30 days in amber.
- **Renewals and due dates.** Store providers, policy and membership numbers, phone numbers, premiums and excesses alongside the dates.
- **Service by date or mileage.** Update the mileage and service reminders work out the rest.
- **Reminders.** A daily digest by email, [ntfy](https://ntfy.sh), Gotify, Discord or webhook (e.g. Home Assistant). Each user picks when (60/30/14/7/3/1 days before, and when overdue) and where. You never get the same reminder twice, and renewing an item starts its reminders afresh.
- **Service history and documents.** Log services, repairs and tyres with cost, garage and mileage. Upload PDFs and photos (V5C, certificates, receipts) and attach them to a renewal or a job. Mileage readings give an annual average and an estimated date for mileage-based services.
- **Renew with price history.** Roll an insurance, breakdown, warranty or tax period on a year and see how the price compares with previous years.
- **Emergency card.** A one-tap page with your breakdown line, insurer's claims line, policy numbers, locking wheel nut code and emergency contacts.
- **Multi-user.** The admin creates accounts. Each vehicle can be shared with other users as *owner*, *can edit* or *can view*.
- **One container, one SQLite file.** All data lives in `/config`.

## Running on Unraid

Until the app is listed in Community Apps, add it manually:

1. **Docker → Add Container → Template**: paste the URL of [`unraid/glovebox.xml`](unraid/glovebox.xml) in raw form.
2. Choose a port and an appdata path, then click **Apply**.
3. Open the WebUI and create the admin account.

### Docker / Compose

```yaml
services:
  glovebox:
    image: ghcr.io/matthewjackson446/glovebox:latest
    ports: ["8080:8080"]
    environment:
      - PUID=99
      - PGID=100
      - TZ=Europe/London
    volumes:
      - /mnt/user/appdata/glovebox:/config
    restart: unless-stopped
```

| Variable | Default | |
| --- | --- | --- |
| `PORT` | `8080` | Port inside the container |
| `PUID` / `PGID` | `99` / `100` | User and group that own files in `/config` |
| `UMASK` | `022` | |
| `TZ` | `Europe/London` | Decides what "today" is for due dates, and when the daily reminder run happens |
| `GLOVEBOX_DISABLE_SCHEDULER` | unset | Set to `true` to stop automatic daily reminders |

**Reverse proxy:** Glovebox works on plain `http://<lan-ip>:8080` and behind a reverse proxy over HTTPS. Pass `X-Forwarded-Proto` and `X-Forwarded-Host` through; Nginx Proxy Manager and SWAG do this by default. Cookies are only marked `Secure` when the request came in over HTTPS.

**Reminders:** in **Settings → Server**, an admin sets the daily send time, an optional public URL (for links in notifications) and SMTP details if anyone wants email. Each user then adds their own channels under **Settings → Reminders**.

### Vehicle lookups (optional): DVLA and DVSA

With your own free keys, typing a registration fills in the vehicle's details, and Glovebox refreshes **tax and MOT dates, MOT history and mileage every night** (just before reminders go out). Without keys, everything still works with dates entered by hand.

**Glovebox doesn't ship with any keys.** Each install uses keys issued to whoever runs it; they're stored only in that install's `/config` database. Never commit or share them.

**DVLA Vehicle Enquiry Service**: make, colour, fuel, engine, year, live tax status and due date, MOT expiry.
1. Apply at [register-for-ves.driver-vehicle-licensing.api.gov.uk](https://register-for-ves.driver-vehicle-licensing.api.gov.uk/) ([about the API](https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/vehicle-enquiry-service/vehicle-enquiry-service-description.html)).
2. Describe personal use, e.g. *"Self-hosted app to keep track of tax and MOT dates for my own household's vehicles"*, and choose the lowest monthly volume. Glovebox makes about one lookup per vehicle per day.
3. DVLA emails you an API key, usually within a few working days.
4. In Glovebox, open **Settings → Server → Vehicle lookups**, paste the key, save and press **Test DVLA**.

**DVSA MOT History**: every MOT test with result, mileage, advisories and failures, plus model and first MOT due date.
1. Apply at [documentation.history.mot.api.gov.uk/mot-history-api/register](https://documentation.history.mot.api.gov.uk/mot-history-api/register).
2. DVSA emails you a **client ID, client secret, API key, scope URL and token URL**.
3. Paste each into **Settings → Server → Vehicle lookups** (the scope is normally `https://tapi.dvsa.gov.uk/.default`, already filled in), save and press **Test DVSA**.
4. Client secrets expire after **2 years**; keys unused for **90 days** are revoked. The nightly refresh keeps them in use.

Glovebox never overwrites details you've typed. It only fills blanks, keeps tax/MOT due dates current (turn this off per vehicle with *Keep tax and MOT dates up to date automatically*), and only ever moves mileage forwards.

**Backups:** everything is in `/config`: the database (`glovebox.db`) and uploaded files (`documents/`). Stop the container and copy the folder, or include it in your appdata backup.

## Development

Requires Node 22. No Docker needed locally.

```bash
npm install
npm run dev        # http://localhost:5173, data in ./data
npm run check      # type-check
```

### Testing the container on Unraid without building locally

```bash
docker context create unraid --docker "host=ssh://root@<unraid-ip>"
docker --context unraid compose up -d --build   # builds on Unraid, serves on :8090
```

### Releasing

Pushing to `main` publishes `ghcr.io/<owner>/glovebox:edge`. Pushing a tag such as `v0.1.0` publishes `:0.1.0`, `:0.1` and `:latest`.

## Roadmap

- [x] Vehicles, renewals and due dates, dashboard, emergency card, multi-user sharing
- [x] Reminders by email (SMTP), ntfy, Gotify and Discord/webhooks
- [x] Look up by registration via DVLA (tax and MOT dates) and DVSA (MOT history), with nightly refresh
- [x] Service history, mileage log, document uploads (V5C, certificates, receipts), renewals with price history
- [ ] Calendar (`.ics`) feed
- [ ] Community Apps listing

## Licence

MIT
