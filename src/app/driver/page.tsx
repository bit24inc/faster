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
  formatDuration,
  formatGEL,
  haversineMeters,
  tbilisiDateKey,
  todayInTbilisi,
} from "@/lib/pricing";
import type { Driver, Locale, Ride } from "@/lib/types";

export default function DriverPage() {
  return (
    <LocaleProvider>
      <DriverPanel />
    </LocaleProvider>
  );
}

interface StateResp {
  drivers: Driver[];
  rides: Ride[];
}

function DriverPanel() {
  const { t, locale } = useLocale();
  const intl = intlLocale(locale);
  const tick = usePollingTick(1500);

  const [driverId, setDriverId] = useState<string>("drv-1");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<StateResp>("/api/state")
      .then((s) => {
        if (!alive) return;
        setDrivers(s.drivers);
        setRides(s.rides);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [tick]);

  const driver = useMemo(
    () => drivers.find((d) => d.id === driverId),
    [drivers, driverId],
  );

  const activeRide = useMemo(
    () =>
      rides.find(
        (r) =>
          r.driverId === driverId &&
          ["ASSIGNED", "ARRIVED", "IN_PROGRESS"].includes(r.status),
      ) ?? null,
    [rides, driverId],
  );

  const pendingRequests = useMemo(
    () => (driver?.isOnline ? rides.filter((r) => r.status === "REQUESTED") : []),
    [rides, driver?.isOnline],
  );

  // Earnings today = sum of driverPayoutTetri for COMPLETED rides for this
  // driver today. "Today" is the Tbilisi calendar day, not UTC.
  const earnings = useMemo(() => {
    const today = todayInTbilisi();
    let payout = 0;
    let commission = 0;
    let count = 0;
    for (const r of rides) {
      if (
        r.driverId === driverId &&
        r.status === "COMPLETED" &&
        tbilisiDateKey(r.completedAt) === today
      ) {
        payout += r.driverPayoutTetri ?? 0;
        commission += r.platformFeeTetri ?? 0;
        count += 1;
      }
    }
    return { payout, commission, count };
  }, [rides, driverId]);

  async function setOnline(isOnline: boolean) {
    if (!driver) return;
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/drivers/${driver.id}/online`, {
        method: "POST",
        body: JSON.stringify({ isOnline }),
      });
    } catch (e: any) {
      setErr(String(e.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function togglePro() {
    if (!driver) return;
    setBusy(true);
    try {
      await api(`/api/drivers/${driver.id}/pro`, {
        method: "POST",
        body: JSON.stringify({ proSubscription: !driver.proSubscription }),
      });
    } finally {
      setBusy(false);
    }
  }

  async function accept(ride: Ride) {
    if (!driver) return;
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/rides/${ride.id}/accept`, {
        method: "POST",
        body: JSON.stringify({ driverId: driver.id }),
      });
    } catch (e: any) {
      setErr(String(e.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function advance(action: "arrive" | "start" | "complete" | "cancel") {
    if (!activeRide) return;
    setBusy(true);
    setErr(null);
    try {
      await api(
        `/api/rides/${activeRide.id}/${action}`,
        action === "cancel"
          ? { method: "POST", body: JSON.stringify({ by: "DRIVER" }) }
          : { method: "POST" },
      );
    } catch (e: any) {
      setErr(String(e.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen">
      <Header subtitle={t("role.driver")} />
      <section className="mx-auto max-w-6xl px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <MapCanvas
            drivers={drivers}
            ride={activeRide}
            highlightDriverId={driverId}
            height={420}
          />

          <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="label">{t("driver.earnings_today")}</div>
              <div className="mt-1 text-lg font-semibold text-brand-400">
                {formatGEL(earnings.payout, intl)}
              </div>
            </div>
            <div>
              <div className="label">{t("driver.commission")}</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {formatGEL(earnings.commission, intl)}
              </div>
            </div>
            <div>
              <div className="label">Rides</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {earnings.count}
              </div>
            </div>
            <div>
              <div className="label">{t("common.rating")}</div>
              <div className="mt-1 text-lg font-semibold text-white">
                ★ {driver?.rating?.toFixed(2) ?? "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <DriverSwitcher
            drivers={drivers}
            driverId={driverId}
            setDriverId={setDriverId}
          />

          {driver && (
            <DriverStatus
              driver={driver}
              busy={busy}
              onToggleOnline={() => setOnline(!driver.isOnline)}
              onTogglePro={togglePro}
            />
          )}

          {err && <div className="text-xs text-red-400">{err}</div>}

          {activeRide ? (
            <ActiveRideForDriver
              ride={activeRide}
              driver={driver!}
              busy={busy}
              locale={locale}
              onAdvance={advance}
            />
          ) : (
            <PendingRequests
              requests={pendingRequests}
              driver={driver}
              busy={busy}
              onAccept={accept}
              locale={locale}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function DriverSwitcher({
  drivers, driverId, setDriverId,
}: {
  drivers: Driver[]; driverId: string; setDriverId: (id: string) => void;
}) {
  return (
    <div className="card p-4">
      <div className="label mb-2">Demo: act as driver</div>
      <select
        className="field"
        value={driverId}
        onChange={(e) => setDriverId(e.target.value)}
      >
        {drivers.map((d) => (
          <option key={d.id} value={d.id} className="bg-ink-800">
            {d.fullName} · {d.vehicle.make} {d.vehicle.model} · {d.vehicle.plateNumber}
          </option>
        ))}
      </select>
    </div>
  );
}

function DriverStatus({
  driver, busy, onToggleOnline, onTogglePro,
}: {
  driver: Driver; busy: boolean;
  onToggleOnline: () => void; onTogglePro: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white font-semibold">{driver.fullName}</div>
          <div className="text-xs text-ink-400">
            {driver.vehicle.color} {driver.vehicle.make} {driver.vehicle.model} ·{" "}
            <span className="font-mono">{driver.vehicle.plateNumber}</span>
          </div>
          <div className="text-xs text-ink-400 mt-0.5">
            Taxi licence:{" "}
            <span className="font-mono">{driver.taxiLicenseNumber}</span>
          </div>
        </div>
        <span
          className={
            "chip " +
            (driver.isOnline
              ? "!border-brand-500/40 !bg-brand-500/10 !text-brand-400"
              : "")
          }
        >
          {driver.isOnline ? t("driver.online") : t("driver.offline")}
        </span>
      </div>

      <button
        disabled={busy}
        onClick={onToggleOnline}
        className={driver.isOnline ? "btn-ghost w-full" : "btn-primary w-full"}
      >
        {driver.isOnline ? t("driver.go_offline") : t("driver.go_online")}
      </button>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-medium">{t("driver.pro")}</div>
            <div className="text-ink-400">
              {driver.proSubscription
                ? t("driver.pro.on")
                : t("driver.pro.off")}
            </div>
          </div>
          <button
            onClick={onTogglePro}
            disabled={busy}
            className={driver.proSubscription ? "btn-ghost" : "btn-primary"}
          >
            {t("driver.toggle_pro")}
          </button>
        </div>
      </div>
    </div>
  );
}

function PendingRequests({
  requests, driver, busy, onAccept, locale,
}: {
  requests: Ride[]; driver: Driver | undefined; busy: boolean;
  onAccept: (r: Ride) => void; locale: Locale;
}) {
  const { t } = useLocale();
  const intl = intlLocale(locale);

  if (!driver?.isOnline) {
    return (
      <div className="card p-5 text-sm text-ink-200">
        <div className="font-medium text-white">{t("driver.offline")}</div>
        <p className="text-ink-400 mt-1">{t("driver.go_online")}.</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="card p-5 text-sm">
        <div className="label mb-1">{t("driver.requests")}</div>
        <div className="text-ink-200">{t("driver.no_requests")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="label">{t("driver.requests")} · {requests.length}</div>
      {requests.map((r) => {
        const distanceToPickup =
          driver && r.pickup
            ? haversineMeters(driver.location, r.pickup.point)
            : 0;
        // Pro recompute on accept; show indicative payout here:
        const rate = driver?.proSubscription ? 0.04 : 0.08;
        const payout = Math.round(r.estimatedFareTetri * (1 - rate));
        return (
          <div key={r.id} className="card p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-ink-400">
                  {categoryLabel(r.category)} ·{" "}
                  {formatDistance(r.distanceMeters)} ·{" "}
                  {formatDuration(r.durationSeconds)}
                </div>
                <div className="mt-1 text-white text-sm">
                  <div>
                    <span className="text-ink-400 mr-1">A</span>
                    {r.pickup.label}
                  </div>
                  <div>
                    <span className="text-ink-400 mr-1">B</span>
                    {r.dropoff.label}
                  </div>
                </div>
                <div className="mt-2 text-xs text-ink-400">
                  {t("driver.eta")}: ~{Math.max(1, Math.round(distanceToPickup / 333))}{" "}
                  {t("common.minutes_short")} · {formatDistance(distanceToPickup)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-ink-400">
                  {t("driver.your_payout")}
                </div>
                <div className="text-lg font-semibold text-brand-400">
                  {formatGEL(payout, intl)}
                </div>
                <div className="text-[10px] text-ink-400">
                  {(rate * 100).toFixed(0)}% {t("driver.commission").toLowerCase()}
                </div>
              </div>
            </div>
            <button
              onClick={() => onAccept(r)}
              disabled={busy}
              className="btn-primary w-full"
            >
              {t("driver.accept")}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ActiveRideForDriver({
  ride, driver, busy, locale, onAdvance,
}: {
  ride: Ride; driver: Driver; busy: boolean; locale: Locale;
  onAdvance: (a: "arrive" | "start" | "complete" | "cancel") => void;
}) {
  const { t } = useLocale();
  const intl = intlLocale(locale);

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="label">{t("status." + ride.status)}</div>
          <div className="text-lg font-semibold text-white">
            {categoryLabel(ride.category)} · {formatDistance(ride.distanceMeters)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-ink-400">{t("driver.your_payout")}</div>
          <div className="text-brand-400 font-semibold">
            {formatGEL(ride.driverPayoutTetri ?? 0, intl)}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-ink-400">{t("common.from")}</span>
          <span className="text-white text-right">{ride.pickup.label}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink-400">{t("common.to")}</span>
          <span className="text-white text-right">{ride.dropoff.label}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink-400">{t("driver.commission")}</span>
          <span className="text-white">
            {formatGEL(ride.platformFeeTetri ?? 0, intl)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ride.status === "ASSIGNED" && (
          <button
            className="btn-primary col-span-2"
            disabled={busy}
            onClick={() => onAdvance("arrive")}
          >
            {t("driver.arrived")}
          </button>
        )}
        {ride.status === "ARRIVED" && (
          <button
            className="btn-primary col-span-2"
            disabled={busy}
            onClick={() => onAdvance("start")}
          >
            {t("driver.start")}
          </button>
        )}
        {ride.status === "IN_PROGRESS" && (
          <button
            className="btn-primary col-span-2"
            disabled={busy}
            onClick={() => onAdvance("complete")}
          >
            {t("driver.complete")}
          </button>
        )}
        {ride.status !== "IN_PROGRESS" && (
          <button
            className="btn-ghost col-span-2"
            disabled={busy}
            onClick={() => onAdvance("cancel")}
          >
            {t("passenger.cancel")}
          </button>
        )}
      </div>

      <div className="text-[11px] text-ink-400">
        {t("common.driver")}: {driver.fullName} · {driver.vehicle.color}{" "}
        {driver.vehicle.make} {driver.vehicle.model} ·{" "}
        <span className="font-mono">{driver.vehicle.plateNumber}</span>
      </div>
    </div>
  );
}

function categoryLabel(c: Ride["category"]): string {
  return c === "ECONOMY" ? "Economy" : c === "COMFORT" ? "Comfort" : "Comfort+";
}
