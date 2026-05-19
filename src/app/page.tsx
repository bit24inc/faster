"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { LocaleProvider, useLocale } from "@/components/LocaleContext";

export default function HomePage() {
  return (
    <LocaleProvider>
      <Home />
    </LocaleProvider>
  );
}

function Home() {
  const { t } = useLocale();
  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Hero title={t("app.tagline")} />
          <RoleCard
            href="/passenger"
            title={t("role.passenger")}
            sub="Request a ride · See driver before accept · Pay card or cash"
            emoji="🧍"
          />
          <RoleCard
            href="/driver"
            title={t("role.driver")}
            sub="See requests · 8% / 4% Pro commission · Instant payout (mock)"
            emoji="🚖"
          />
          <RoleCard
            href="/admin"
            title={t("role.admin")}
            sub="Dispatch board · KPIs · Audit log"
            emoji="🛠"
          />
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-ink-200">
          <Bullet
            title="Fair commission"
            body="8% base / 4% with Pro subscription (GEL 150/mo). No taxi-park middleman."
          />
          <Bullet
            title="Transparent fare"
            body="Passenger sees route and price before requesting; driver sees both before accepting."
          />
          <Bullet
            title="ka · ru · en"
            body="Multilingual UI from day one. Money formatted as GEL with locale rules."
          />
        </div>

        <p className="mt-10 text-xs text-ink-400">
          Prototype only — in-memory state, no real maps tiles, no real payments.
          Open <span className="kbd">/passenger</span> and <span className="kbd">/driver</span>{" "}
          in two windows to see the full flow live.
        </p>
      </section>
    </main>
  );
}

function Hero({ title }: { title: string }) {
  return (
    <div className="card p-6 md:row-span-2 md:col-span-1 flex flex-col justify-between">
      <div>
        <div className="label">Tbilisi · MVP prototype</div>
        <h1 className="mt-2 text-3xl font-bold text-white leading-tight">
          {title}
        </h1>
        <p className="mt-3 text-sm text-ink-200">
          Two-sided ride-hailing prototype following the locked architecture from the TZ:
          passenger app, driver app, dispatch and pricing.
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <span className="chip">PostGIS-ready domain</span>
        <span className="chip">Tetri integer money</span>
        <span className="chip">Pro 4% commission</span>
        <span className="chip">RideStatus FSM</span>
      </div>
    </div>
  );
}

function RoleCard({
  href, title, sub, emoji,
}: { href: string; title: string; sub: string; emoji: string }) {
  return (
    <Link
      href={href}
      className="card p-6 hover:bg-white/10 transition-colors flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <div className="text-2xl">{emoji}</div>
        <span className="chip">Open →</span>
      </div>
      <div className="text-xl font-semibold text-white">{title}</div>
      <p className="text-sm text-ink-200">{sub}</p>
    </Link>
  );
}

function Bullet({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-5">
      <div className="text-white font-semibold">{title}</div>
      <p className="mt-1 text-ink-200">{body}</p>
    </div>
  );
}
