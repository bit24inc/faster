"use client";

import { project, TBILISI_BOUNDS } from "@/lib/places";
import type { Driver, Ride } from "@/lib/types";

interface Props {
  drivers: Driver[];
  ride?: Ride | null;
  highlightDriverId?: string | null;
  height?: number;
}

const W = 600;
const H = 360;

// A purely stylised map of Tbilisi. We render:
//   - a few "road" polylines (Rustaveli, Saburtalo, river Mtkvari)
//   - online driver dots
//   - pickup/dropoff pins + the route line for an active ride
//   - a moving car icon that interpolates along the route in the active states

export function MapCanvas({ drivers, ride, highlightDriverId, height = 360 }: Props) {
  // Stylised "river" + "ring road" polylines, projected.
  const river = [
    { lat: 41.83, lng: 44.79 },
    { lat: 41.78, lng: 44.79 },
    { lat: 41.73, lng: 44.80 },
    { lat: 41.70, lng: 44.81 },
    { lat: 41.68, lng: 44.83 },
  ].map((p) => project(p, W, H));

  const rustaveli = [
    { lat: 41.7050, lng: 44.7920 },
    { lat: 41.7000, lng: 44.7980 },
    { lat: 41.6940, lng: 44.8020 },
  ].map((p) => project(p, W, H));

  const saburtalo = [
    { lat: 41.7280, lng: 44.7510 },
    { lat: 41.7220, lng: 44.7640 },
    { lat: 41.7150, lng: 44.7770 },
    { lat: 41.7080, lng: 44.7860 },
  ].map((p) => project(p, W, H));

  const airportRd = [
    { lat: 41.6940, lng: 44.8030 },
    { lat: 41.6810, lng: 44.8500 },
    { lat: 41.6700, lng: 44.9500 },
  ].map((p) => project(p, W, H));

  let driverPin: { x: number; y: number } | null = null;
  let pickupPin: { x: number; y: number } | null = null;
  let dropoffPin: { x: number; y: number } | null = null;
  let routePath: string | null = null;
  let carPos: { x: number; y: number } | null = null;

  if (ride) {
    pickupPin = project(ride.pickup.point, W, H);
    dropoffPin = project(ride.dropoff.point, W, H);
    routePath = `M ${pickupPin.x} ${pickupPin.y} L ${dropoffPin.x} ${dropoffPin.y}`;

    const assignedDriver = drivers.find((d) => d.id === ride.driverId);
    if (assignedDriver) {
      driverPin = project(assignedDriver.location, W, H);
    }
    // Animate the car: on the way (driverPin → pickup) or in trip (pickup → dropoff).
    if (ride.status === "ASSIGNED" && driverPin && pickupPin) {
      carPos = interp(driverPin, pickupPin, 0.5);
    } else if (ride.status === "ARRIVED" && pickupPin) {
      carPos = pickupPin;
    } else if (ride.status === "IN_PROGRESS" && pickupPin && dropoffPin) {
      carPos = interp(pickupPin, dropoffPin, 0.55);
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0e1729]">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={height}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          </pattern>
          <radialGradient id="bgglow" cx="40%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#0f2a23" />
            <stop offset="100%" stopColor="#0e1729" />
          </radialGradient>
        </defs>

        <rect x={0} y={0} width={W} height={H} fill="url(#bgglow)" />
        <rect x={0} y={0} width={W} height={H} fill="url(#grid)" />

        {/* River */}
        <polyline
          points={river.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#1d4ed8"
          strokeOpacity={0.55}
          strokeWidth={6}
          strokeLinecap="round"
        />

        {/* Roads */}
        {[rustaveli, saburtalo, airportRd].map((line, i) => (
          <polyline
            key={i}
            points={line.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}

        {/* City label */}
        <text
          x={W - 12}
          y={H - 12}
          textAnchor="end"
          fill="rgba(255,255,255,0.35)"
          fontSize={11}
          fontFamily="ui-monospace, monospace"
        >
          Tbilisi · {TBILISI_BOUNDS.minLat.toFixed(2)}–{TBILISI_BOUNDS.maxLat.toFixed(2)}°N
        </text>

        {/* Online drivers */}
        {drivers
          .filter((d) => d.isOnline)
          .map((d) => {
            const p = project(d.location, W, H);
            const isAssigned = ride?.driverId === d.id;
            const isHighlight = highlightDriverId === d.id;
            return (
              <g key={d.id}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHighlight ? 10 : 7}
                  fill={isAssigned ? "#10b981" : "rgba(16,185,129,0.55)"}
                  stroke="#0b1220"
                  strokeWidth={2}
                />
                {isHighlight && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={14}
                    fill="none"
                    stroke="#34d399"
                    strokeOpacity={0.6}
                  >
                    <animate attributeName="r" from="10" to="22" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" from="0.7" to="0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}

        {/* Route line */}
        {routePath && (
          <path
            d={routePath}
            stroke="#34d399"
            strokeWidth={3}
            strokeDasharray="6 6"
            fill="none"
          />
        )}

        {/* Pickup pin */}
        {pickupPin && <Pin x={pickupPin.x} y={pickupPin.y} color="#34d399" label="A" />}
        {dropoffPin && <Pin x={dropoffPin.x} y={dropoffPin.y} color="#fbbf24" label="B" />}

        {/* Animated car */}
        {carPos && (
          <g transform={`translate(${carPos.x},${carPos.y})`}>
            <circle r={11} fill="#fff" />
            <circle r={11} fill="#10b981" opacity={0.25}>
              <animate attributeName="r" from="11" to="22" dur="1.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.4" to="0" dur="1.2s" repeatCount="indefinite" />
            </circle>
            <text textAnchor="middle" y={4} fontSize={14}>🚖</text>
          </g>
        )}
      </svg>
    </div>
  );
}

function Pin({ x, y, color, label }: { x: number; y: number; color: string; label: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path
        d="M0,-22 C-8,-22 -14,-16 -14,-9 C-14,-1 0,12 0,12 C0,12 14,-1 14,-9 C14,-16 8,-22 0,-22 Z"
        fill={color}
        stroke="#0b1220"
        strokeWidth={1.5}
      />
      <circle cx={0} cy={-10} r={5} fill="#0b1220" />
      <text x={0} y={-7} textAnchor="middle" fill={color} fontSize={9} fontWeight={700}>
        {label}
      </text>
    </g>
  );
}

function interp(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
