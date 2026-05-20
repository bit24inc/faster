"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { LocaleProvider, useLocale } from "@/components/LocaleContext";
import { MapCanvas } from "@/components/MapCanvas";
import { usePollingTick } from "@/components/usePolling";
import { api } from "@/lib/api";
import { intlLocale } from "@/lib/i18n";
import {
  formatDistance,
  formatGEL,
  tbilisiDateKey,
  todayInTbilisi,
} from "@/lib/pricing";
import type { AuditEntry, Driver, Locale, Ride } from "@/lib/types";

export default function AdminPage() {
  return (
    <LocaleProvider>
      <Admin />
    </LocaleProvider>
  );
}

interface StateResp {
  drivers: Driver[];
  rides: Ride[];
  audit: AuditEntry[];
  startedAt: string;
}

function Admin() {
  const { t, locale } = useLocale();
  const intl = intlLocale(locale);
  const tick = usePollingTick(2000);

  const [state, setState] = useState<StateResp | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api<StateResp>("/api/state")
      .then((s) => alive && setState(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [tick]);

  const stats = useMemo(() => {
    if (!state) return null;
    const today = todayInTbilisi();
    const active = state.rides.filter((r) =>
      ["REQUESTED", "ASSIGNED", "ARRIVED", "IN_PROGRESS"].includes(r.status),
    );
    const online = state.drivers.filter((d) => d.isOnline);
    const completedToday = state.rides.filter(
      (r) =>
        r.status === "COMPLETED" &&
        tbilisiDateKey(r.completedAt) === today,
    );
    const gmv = completedToday.reduce(
      (s, r) => s + (r.finalFareTetri ?? r.estimatedFareTetri),
      0,
    );
    const commission = completedToday.reduce(
      (s, r) => s + (r.platformFeeTetri ?? 0),
      0,
    );
    return {
      active: active.length,
      online: online.length,
      completed: completedToday.length,
      gmv,
      commission,
    };
  }, [state]);

  async function reset() {
    setBusy(true);
    try {
      await api("/api/reset", { method: "POST" });
    } finally {
      setBusy(false);
    }
  }

  if (!state || !stats) {
    return (
      <main className="min-h-screen">
        <Header subtitle={t("role.admin")} />
        <div className="px-6 py-8 text-ink-400">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Header subtitle={t("role.admin")} />
      <section className="mx-auto max-w-7xl px-4 md:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-xl text-white font-semibold">{t("admin.title")}</h1>
          <button onClick={reset} disabled={busy} className="btn-ghost">
            {t("admin.reset")}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi label={t("admin.active_rides")} value={stats.active} />
          <Kpi label={t("admin.online_drivers")} value={stats.online} />
          <Kpi label={t("admin.completed_today")} value={stats.completed} />
          <Kpi label={t("admin.gmv")} value={formatGEL(stats.gmv, intl)} />
          <Kpi
            label={t("admin.commission_today")}
            value={formatGEL(stats.commission, intl)}
            accent
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <MapCanvas drivers={state.drivers} height={380} />
            <RidesTable rides={state.rides} locale={locale} />
          </div>
          <div className="space-y-4">
            <DriversTable drivers={state.drivers} />
            <AuditList entries={state.audit} />
          </div>
        </div>
      </section>
    </main>
  );
}

function Kpi({
  label, value, accent,
}: {
  label: string; value: string | number; accent?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div
        className={
          "mt-1 text-lg font-semibold " +
          (accent ? "text-brand-400" : "text-white")
        }
      >
        {value}
      </div>
    </div>
  );
}

function RidesTable({ rides, locale }: { rides: Ride[]; locale: Locale }) {
  const intl = intlLocale(locale);
  if (rides.length === 0) {
    return (
      <div className="card p-5 text-sm text-ink-400">No rides yet.</div>
    );
  }
  return (
    <div className="card p-4">
      <div className="label mb-3">Rides</div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-ink-400 text-xs">
            <tr>
              <Th>ID</Th>
              <Th>Status</Th>
              <Th>Route</Th>
              <Th>Class</Th>
              <Th>Dist</Th>
              <Th>Fare</Th>
              <Th>Commission</Th>
              <Th>Payment</Th>
            </tr>
          </thead>
          <tbody>
            {rides.slice(0, 20).map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <Td><span className="font-mono text-xs">{r.id.slice(-6)}</span></Td>
                <Td>
                  <span className="chip">{r.status}</span>
                </Td>
                <Td className="text-xs">
                  {short(r.pickup.label)} → {short(r.dropoff.label)}
                </Td>
                <Td className="text-xs">{r.category}</Td>
                <Td className="text-xs">{formatDistance(r.distanceMeters)}</Td>
                <Td>{formatGEL(r.estimatedFareTetri, intl)}</Td>
                <Td>
                  {r.platformFeeTetri != null
                    ? formatGEL(r.platformFeeTetri, intl)
                    : "—"}
                </Td>
                <Td className="text-xs">{r.paymentMethod}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DriversTable({ drivers }: { drivers: Driver[] }) {
  return (
    <div className="card p-4">
      <div className="label mb-3">Drivers</div>
      <ul className="space-y-3 text-sm">
        {drivers.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3">
            <div>
              <div className="text-white">{d.fullName}</div>
              <div className="text-xs text-ink-400">
                {d.vehicle.make} {d.vehicle.model} ·{" "}
                <span className="font-mono">{d.vehicle.plateNumber}</span>
              </div>
            </div>
            <div className="text-right">
              <span
                className={
                  "chip " +
                  (d.isOnline
                    ? "!border-brand-500/40 !bg-brand-500/10 !text-brand-400"
                    : "")
                }
              >
                {d.isOnline ? "online" : "offline"}
              </span>
              {d.proSubscription && (
                <div className="mt-1 text-[10px] text-brand-400">PRO 4%</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AuditList({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="card p-4">
      <div className="label mb-3">Audit log</div>
      <ul className="space-y-2 text-xs font-mono max-h-72 overflow-auto">
        {entries.length === 0 && (
          <li className="text-ink-400">No events.</li>
        )}
        {entries.map((e) => (
          <li key={e.id} className="flex items-start gap-2">
            <span className="text-ink-400">
              {new Date(e.createdAt).toLocaleTimeString()}
            </span>
            <span className="text-brand-400">{e.action}</span>
            <span className="text-ink-200">
              {e.targetType}
              {e.targetId ? `:${e.targetId.slice(-6)}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left font-medium px-2 py-1.5">{children}</th>;
}
function Td({
  children, className,
}: { children: React.ReactNode; className?: string }) {
  return <td className={"px-2 py-1.5 " + (className ?? "")}>{children}</td>;
}

function short(s: string): string {
  const i = s.indexOf(" /");
  return i > 0 ? s.slice(0, i) : s.length > 22 ? s.slice(0, 22) + "…" : s;
}
