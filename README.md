# Faster — Tbilisi ride-hailing prototype

A working **web prototype** of the two-sided ride-hailing app described in the
TZ (`Двустороннее такси-приложение`, Phase 1 Georgia / Phase 2 Poland).

The full spec targets Flutter passenger + driver apps, NestJS gateway, Go
dispatch, payments, admin, PostgreSQL+PostGIS, Redis, and k3s. This prototype
condenses that into a **single Next.js 14 web app** that demonstrates the core
two-sided flow end-to-end with high fidelity to the domain model.

## What's in scope

- **Passenger UI** (`/passenger`): place selection, fare estimate per class,
  request a ride, see the assigned driver, watch the live map, cancel.
- **Driver UI** (`/driver`): act as one of three seeded drivers; toggle online
  status and Pro subscription; receive REQUESTED rides; accept → arrive →
  start → complete; live earnings (today) split into payout and commission.
- **Admin UI** (`/admin`): KPIs (active, online, completed, GMV, commission),
  rides table, drivers table, live audit log, and a "Reset demo" button.
- **i18n**: `ka`, `ru`, `en` switcher in the header; money formatted as GEL
  with the chosen locale.
- **Tetri integer money** throughout (1 GEL = 100 tetri); no floats for money.
- **RideStatus FSM** matching the TZ: `REQUESTED → ASSIGNED → ARRIVED →
  IN_PROGRESS → COMPLETED` plus `CANCELLED` / `EXPIRED`.
- **Commission**: 8% base, **4% with Pro** — recomputed when the driver accepts.
- **Mock Tbilisi map**: stylised SVG with real WGS84 landmark coordinates,
  online drivers, pickup/dropoff pins, route polyline, and an animated car.
- **In-memory backend** with API routes mimicking the production service
  shapes — see `src/app/api/`.
- **Audit log** for state-changing actions.

## What's intentionally out of scope (prototype)

- Real authentication / OTP, KYC, payments (TBC, iPay), push, Sentry.
- PostgreSQL/PostGIS, Redis, k3s, Valhalla — replaced with in-process state.
- Flutter apps and the Kotlin foreground location service.
- WebSocket dispatch — the prototype polls `/api/state` every ~1.5 s.

These are the milestones M0–M13 in the TZ. The prototype is a vertical slice
that proves out the user-facing flow before that infrastructure is built.

## Run

```bash
npm install
npm run dev
```

Open:

- `http://localhost:3000` — landing / role chooser
- `http://localhost:3000/passenger` — passenger app
- `http://localhost:3000/driver` — driver panel
- `http://localhost:3000/admin` — operator panel

Open `/passenger` and `/driver` side-by-side: the driver tab sees the
passenger's REQUESTED ride within ~1.5 s and can accept it. The passenger
tab then sees the assigned driver, vehicle, plate and rating.

## Demo script

1. `/passenger`: pick **Freedom Square → Tbilisi Airport**, choose Comfort,
   tap **Request ride**.
2. `/driver`: leave "Giorgi Kapanadze" selected, ensure **Online**. A request
   card appears showing payout (with Pro = 4%). Tap **Accept**.
3. `/passenger`: driver, car, plate and rating appear; map shows the route.
4. `/driver`: tap **I've arrived → Start trip → Complete**. Earnings today
   updates with the payout, commission is recorded.
5. `/admin`: KPIs update (GMV, commission today); audit log shows every step.

## Project layout

```
src/
├── app/
│   ├── page.tsx              # landing / role chooser
│   ├── passenger/page.tsx
│   ├── driver/page.tsx
│   ├── admin/page.tsx
│   └── api/
│       ├── state/            # GET full snapshot (used for polling)
│       ├── reset/            # POST reset demo
│       ├── estimate/         # POST fare estimate per class
│       ├── rides/            # POST create + state transitions
│       └── drivers/[id]/     # online + pro toggles
├── components/
│   ├── Header.tsx
│   ├── LanguageSwitcher.tsx
│   ├── LocaleContext.tsx
│   ├── MapCanvas.tsx         # stylised SVG Tbilisi map
│   └── usePolling.ts
└── lib/
    ├── types.ts              # domain types mirroring the Prisma schema
    ├── pricing.ts            # tetri fares + Haversine
    ├── places.ts             # Tbilisi landmarks + projection
    ├── i18n.ts               # ka / ru / en dictionaries
    ├── store.ts              # in-memory store + audit
    └── api.ts                # typed fetch wrapper
```

## Mapping prototype → TZ

| TZ concept                          | Prototype location                                |
|-------------------------------------|---------------------------------------------------|
| `Ride` Prisma model                 | `src/lib/types.ts` → `Ride`                       |
| RideStatus FSM                      | `src/app/api/rides/[id]/*/route.ts`               |
| Tetri integer money                 | All fields suffixed `*Tetri`; `pricing.ts`        |
| 8% / 4% Pro commission              | `pricing.ts::estimateFare`                        |
| H3-style nearby drivers             | Simplified to "all REQUESTED" in `store.ts`       |
| Audit log table                     | `store.ts::audit`, surfaced in `/admin`           |
| ka / ru / en simultaneously         | `lib/i18n.ts` + `LocaleProvider`                  |
| Passenger sees fare before request  | `passenger/page.tsx` class buttons                |
| Driver sees fare before accept      | `driver/page.tsx::PendingRequests`                |
