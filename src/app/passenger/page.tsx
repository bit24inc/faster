"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { LocaleProvider, useLocale } from "@/components/LocaleContext";
import { MapCanvas } from "@/components/MapCanvas";
import { usePollingTick } from "@/components/usePolling";
import { api } from "@/lib/api";
import {
  formatDistance,
  formatDuration,
  formatGEL,
} from "@/lib/pricing";
import { TBILISI_PLACES } from "@/lib/places";
import type {
  Driver,
  FareEstimate,
  Locale,
  PaymentMethod,
  Place,
  Ride,
  VehicleCategory,
} from "@/lib/types";
import { intlLocale } from "@/lib/i18n";

const PASSENGER_ID = "pax-1";

export default function PassengerPage() {
  return (
    <LocaleProvider>
      <Passenger />
    </LocaleProvider>
  );
}

interface StateResp {
  drivers: Driver[];
  rides: Ride[];
}

function Passenger() {
  const { t, locale } = useLocale();
  const tick = usePollingTick(1500);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);

  const [pickup, setPickup] = useState<Place>(TBILISI_PLACES[0]);
  const [dropoff, setDropoff] = useState<Place>(TBILISI_PLACES[5]);
  const [category, setCategory] = useState<VehicleCategory>("ECONOMY");
  const [payment, setPayment] = useState<PaymentMethod>("CARD");

  const [estimates, setEstimates] = useState<FareEstimate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Live state polling — shared store with the driver tab.
  useEffect(() => {
    let alive = true;
    api<StateResp>("/api/state")
      .then((s) => {
        if (!alive) return;
        setDrivers(s.drivers);
        const mine = s.rides.find(
          (r) =>
            r.passengerId === PASSENGER_ID &&
            !["COMPLETED", "CANCELLED", "EXPIRED"].includes(r.status),
        );
        setActiveRide(mine ?? null);
        // If we have no active ride but the most recent ride is terminal,
        // surface it briefly so the user sees "completed".
        if (!mine) {
          const recent = s.rides.find((r) => r.passengerId === PASSENGER_ID);
          if (recent && ["COMPLETED", "CANCELLED"].includes(recent.status)) {
            setActiveRide(recent);
          }
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [tick]);

  // Re-estimate fares when pickup/dropoff change.
  useEffect(() => {
    let alive = true;
    setError(null);
    api<{ estimates: FareEstimate[] }>("/api/estimate", {
      method: "POST",
      body: JSON.stringify({ pickup: pickup.point, dropoff: dropoff.point }),
    })
      .then((r) => alive && setEstimates(r.estimates))
      .catch((e) => alive && setError(String(e.message ?? e)));
    return () => {
      alive = false;
    };
  }, [pickup, dropoff]);

  const currentEstimate = useMemo(
    () => estimates?.find((e) => e.category === category) ?? null,
    [estimates, category],
  );

  async function requestRide() {
    if (!currentEstimate) return;
    setBusy(true);
    setError(null);
    try {
      const { ride } = await api<{ ride: Ride }>("/api/rides", {
        method: "POST",
        body: JSON.stringify({
          passengerId: PASSENGER_ID,
          pickup,
          dropoff,
          category,
          paymentMethod: payment,
        }),
      });
      setActiveRide(ride);
    } catch (e: any) {
      setError(String(e.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function cancelRide() {
    if (!activeRide) return;
    setBusy(true);
    try {
      await api(`/api/rides/${activeRide.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ by: "PASSENGER" }),
      });
    } finally {
      setBusy(false);
    }
  }

  const showForm =
    !activeRide ||
    ["COMPLETED", "CANCELLED", "EXPIRED"].includes(activeRide.status);

  return (
    <main className="min-h-screen">
      <Header subtitle={t("role.passenger")} />
      <section className="mx-auto max-w-6xl px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <MapCanvas
            drivers={drivers}
            ride={activeRide}
            height={420}
          />
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-ink-400">
            <Legend dot="#34d399" label="Pickup (A)" />
            <Legend dot="#fbbf24" label="Dropoff (B)" />
            <Legend dot="#10b981" label="Online driver" />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {showForm ? (
            <RequestForm
              pickup={pickup}
              setPickup={setPickup}
              dropoff={dropoff}
              setDropoff={setDropoff}
              category={category}
              setCategory={setCategory}
              payment={payment}
              setPayment={setPayment}
              estimates={estimates}
              currentEstimate={currentEstimate}
              busy={busy}
              onRequest={requestRide}
              locale={locale}
              error={error}
            />
          ) : (
            <ActiveRideCard
              ride={activeRide!}
              onCancel={cancelRide}
              busy={busy}
              locale={locale}
            />
          )}

          {activeRide?.status === "COMPLETED" && (
            <CompletedCard ride={activeRide} locale={locale} />
          )}
        </div>
      </section>
    </main>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: dot }}
      />
      <span>{label}</span>
    </div>
  );
}

interface FormProps {
  pickup: Place;
  setPickup: (p: Place) => void;
  dropoff: Place;
  setDropoff: (p: Place) => void;
  category: VehicleCategory;
  setCategory: (c: VehicleCategory) => void;
  payment: PaymentMethod;
  setPayment: (p: PaymentMethod) => void;
  estimates: FareEstimate[] | null;
  currentEstimate: FareEstimate | null;
  busy: boolean;
  onRequest: () => void;
  locale: Locale;
  error: string | null;
}

function RequestForm(p: FormProps) {
  const { t } = useLocale();
  const intl = intlLocale(p.locale);
  return (
    <div className="card p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">
          {t("passenger.title")}
        </h2>
        <p className="text-xs text-ink-400 mt-0.5">
          {t("passenger.estimate").toLowerCase()} · GEL
        </p>
      </div>

      <PlaceSelect
        label={t("passenger.pickup")}
        value={p.pickup}
        onChange={p.setPickup}
      />
      <PlaceSelect
        label={t("passenger.dropoff")}
        value={p.dropoff}
        onChange={p.setDropoff}
      />

      <div>
        <div className="label mb-2">{t("passenger.choose_class")}</div>
        <div className="grid grid-cols-3 gap-2">
          {(["ECONOMY", "COMFORT", "COMFORT_PLUS"] as VehicleCategory[]).map((c) => {
            const e = p.estimates?.find((x) => x.category === c);
            const selected = p.category === c;
            return (
              <button
                key={c}
                onClick={() => p.setCategory(c)}
                className={
                  "rounded-xl border px-3 py-2 text-left transition-colors " +
                  (selected
                    ? "border-brand-500 bg-brand-500/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10")
                }
              >
                <div className="text-xs text-ink-400">{categoryLabel(c)}</div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {e ? formatGEL(e.estimatedFareTetri, intl) : "—"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="label mb-2">{t("passenger.payment")}</div>
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              ["CARD", t("passenger.payment.card")],
              ["CASH", t("passenger.payment.cash")],
              ["APPLE_PAY", t("passenger.payment.apple")],
              ["GOOGLE_PAY", t("passenger.payment.google")],
            ] as [PaymentMethod, string][]
          ).map(([m, label]) => {
            const selected = p.payment === m;
            return (
              <button
                key={m}
                onClick={() => p.setPayment(m)}
                className={
                  "rounded-xl border px-2 py-2 text-xs transition-colors " +
                  (selected
                    ? "border-brand-500 bg-brand-500/10 text-white"
                    : "border-white/10 bg-white/5 text-ink-200 hover:bg-white/10")
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {p.currentEstimate && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
          <div className="grid grid-cols-3 text-center">
            <Stat label={t("passenger.distance")} value={formatDistance(p.currentEstimate.distanceMeters)} />
            <Stat label={t("passenger.duration")} value={formatDuration(p.currentEstimate.durationSeconds)} />
            <Stat
              label={t("passenger.estimate")}
              value={formatGEL(p.currentEstimate.estimatedFareTetri, intl)}
              highlight
            />
          </div>
        </div>
      )}

      {p.error && <div className="text-xs text-red-400">{p.error}</div>}

      <button
        onClick={p.onRequest}
        disabled={p.busy || !p.currentEstimate}
        className="btn-primary w-full"
      >
        {t("passenger.request")}
      </button>
    </div>
  );
}

function PlaceSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Place;
  onChange: (p: Place) => void;
}) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      <select
        className="field"
        value={value.label}
        onChange={(e) => {
          const next = TBILISI_PLACES.find((p) => p.label === e.target.value);
          if (next) onChange(next);
        }}
      >
        {TBILISI_PLACES.map((p) => (
          <option key={p.label} value={p.label} className="bg-ink-800">
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <div
        className={
          "mt-1 font-semibold " +
          (highlight ? "text-brand-400 text-base" : "text-white text-sm")
        }
      >
        {value}
      </div>
    </div>
  );
}

function ActiveRideCard({
  ride,
  onCancel,
  busy,
  locale,
}: {
  ride: Ride;
  onCancel: () => void;
  busy: boolean;
  locale: Locale;
}) {
  const { t } = useLocale();
  const intl = intlLocale(locale);
  const statusText: Record<string, string> = {
    REQUESTED: t("passenger.searching"),
    ASSIGNED: t("passenger.driver_on_way"),
    ARRIVED: t("passenger.driver_arrived"),
    IN_PROGRESS: t("passenger.in_progress"),
    COMPLETED: t("passenger.completed"),
    CANCELLED: t("status.CANCELLED"),
    EXPIRED: t("status.EXPIRED"),
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="label">{t("status." + ride.status)}</div>
          <div className="text-lg font-semibold text-white">
            {statusText[ride.status]}
          </div>
        </div>
        <StatusDot status={ride.status} />
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
          <span className="text-ink-400">{t("passenger.estimate")}</span>
          <span className="text-brand-400 font-semibold">
            {formatGEL(ride.estimatedFareTetri, intl)}
          </span>
        </div>
      </div>

      {ride.driverSnapshot ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-ink-900 font-bold">
              {ride.driverSnapshot.fullName
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div className="flex-1">
              <div className="text-white font-medium">
                {ride.driverSnapshot.fullName}
              </div>
              <div className="text-xs text-ink-400">
                ★ {ride.driverSnapshot.rating.toFixed(2)} ·{" "}
                {ride.driverSnapshot.vehicle.color} {ride.driverSnapshot.vehicle.make}{" "}
                {ride.driverSnapshot.vehicle.model}
              </div>
            </div>
            <div className="rounded-md border border-white/15 px-2 py-1 text-xs font-mono">
              {ride.driverSnapshot.vehicle.plate}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/15 p-3 text-sm text-ink-400">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-500 mr-2" />
          {t("passenger.searching")}
        </div>
      )}

      {!["COMPLETED", "CANCELLED", "EXPIRED"].includes(ride.status) && (
        <button
          onClick={onCancel}
          disabled={busy}
          className="btn-ghost w-full"
        >
          {t("passenger.cancel")}
        </button>
      )}
    </div>
  );
}

function CompletedCard({ ride, locale }: { ride: Ride; locale: Locale }) {
  const { t } = useLocale();
  const intl = intlLocale(locale);
  return (
    <div className="card p-5 space-y-3">
      <div className="text-sm text-ink-400">{t("passenger.thanks")}</div>
      <div className="text-lg text-white font-semibold">
        {formatGEL(ride.finalFareTetri ?? ride.estimatedFareTetri, intl)}{" "}
        <span className="text-ink-400 text-sm font-normal">
          · {ride.paymentMethod.replace("_", " ")}
        </span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className="text-2xl text-yellow-400">★</span>
        ))}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: Ride["status"] }) {
  const color: Record<string, string> = {
    REQUESTED: "bg-yellow-400",
    ASSIGNED: "bg-brand-400",
    ARRIVED: "bg-brand-500",
    IN_PROGRESS: "bg-brand-500",
    COMPLETED: "bg-ink-400",
    CANCELLED: "bg-red-500",
    EXPIRED: "bg-red-500",
  };
  return (
    <span className={"h-3 w-3 rounded-full " + (color[status] ?? "bg-white")} />
  );
}

function categoryLabel(c: VehicleCategory): string {
  return c === "ECONOMY" ? "Economy" : c === "COMFORT" ? "Comfort" : "Comfort+";
}
