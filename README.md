# Glovebox

A self-hosted tracker for your vehicles: MOT, road tax, insurance, servicing, breakdown cover, warranty and finance, all in one place and colour-coded by when they're due.

- **Dashboard.** Every vehicle at a glance, with overdue items in red and anything due within 30 days in amber.
- **Renewals and due dates.** Store providers, policy and membership numbers, phone numbers, premiums and excesses alongside the dates.
- **Service by date or mileage.** Update the mileage and service reminders work out the rest.
- **Reminders.** A daily digest by email, [ntfy](https://ntfy.sh), Gotify, Discord or webhook (e.g. Home Assistant). Each user picks when (60/30/14/7/3/1 days before, and when overdue) and where. You never get the same reminder twice, and renewing an item starts its reminders afresh.
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

**Backups:** stop the container, then copy `/config`. Alternatively, copy `glovebox.db` along with its `-wal` file while the container is running.

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
- [ ] Look up by registration via DVLA (tax and MOT dates) and DVSA (MOT history)
- [ ] Service history, mileage log, document uploads (V5C, certificates, receipts)
- [ ] Calendar (`.ics`) feed
- [ ] Community Apps listing

## Licence

MIT
