"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Zap,
  Loader2,
  Check,
  AlertCircle,
  Clock,
  Car,
  Phone,
  User,
  Hash,
  MapPin,
  PlugZap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StationInfo {
  stationName: string;
  portInfo: {
    portNumber: string;
    connectorType: string;
    powerOutput: string;
  };
}

interface CheckInResult {
  bookingId: string;
  stationName: string;
  portInfo: { portNumber: string; connectorType: string; powerOutput: string };
  estimatedAmount: number;
  startTime: string;
  endTime: string;
}

export default function WalkInCheckInPage({
  params,
}: {
  params: Promise<{ stationId: string; portId: string }>;
}) {
  const [stationId, setStationId] = useState("");
  const [portId, setPortId] = useState("");
  const [stationInfo, setStationInfo] = useState<StationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CheckInResult | null>(null);

  // Form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("car");
  const [estimatedDuration, setEstimatedDuration] = useState(60);

  // Resolve params
  useEffect(() => {
    params.then(({ stationId: sid, portId: pid }) => {
      setStationId(sid);
      setPortId(pid);
    });
  }, [params]);

  const fetchStationInfo = useCallback(async () => {
    if (!stationId) return;
    try {
      const res = await fetch(`/api/stations/${stationId}`);
      if (res.ok) {
        const data = await res.json();
        const station = data.station || data;
        const port = station.chargingPorts?.find(
          (p: { _id: string }) => p._id === portId || p._id?.toString() === portId
        );
        if (!port) {
          setError("Port not found at this station.");
          setLoading(false);
          return;
        }
        setStationInfo({
          stationName: station.name,
          portInfo: {
            portNumber: port.portNumber,
            connectorType: port.connectorType,
            powerOutput: port.powerOutput,
          },
        });
      } else {
        setError("Station not found.");
      }
    } catch {
      setError("Failed to load station information.");
    } finally {
      setLoading(false);
    }
  }, [stationId, portId]);

  useEffect(() => {
    if (stationId) fetchStationInfo();
  }, [stationId, fetchStationInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/walk-in/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId,
          portId,
          customerName,
          customerPhone,
          vehicleNumber,
          vehicleType,
          estimatedDuration,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || "Check-in failed. Please ask staff for help.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──
  if (result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-emerald-500/20 bg-gray-900/80 p-6 text-center shadow-xl backdrop-blur-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <Check className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Check-in Successful!</h1>
            <p className="mt-1 text-sm text-gray-400">
              Your charging session has started
            </p>
          </div>

          <div className="space-y-3 rounded-xl bg-gray-800/50 p-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Station</span>
              <span className="font-medium text-white">{result.stationName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Port</span>
              <span className="font-medium text-white">
                #{result.portInfo.portNumber} ({result.portInfo.connectorType})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Est. Amount</span>
              <span className="font-bold text-emerald-400">
                Rs. {result.estimatedAmount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Duration</span>
              <span className="text-white">{estimatedDuration} mins</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Booking ID</span>
              <span className="font-mono text-xs text-gray-300">
                {result.bookingId.slice(-8).toUpperCase()}
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
            <p className="text-xs text-amber-300">
              <strong>Payment:</strong> Please pay at the station counter when your
              session ends. Show this screen or your booking ID to the staff.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading / Error state ──
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (error && !stationInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-red-500/20 bg-gray-900/80 p-6 text-center shadow-xl backdrop-blur-lg">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="text-xl font-bold text-white">Station Not Found</h1>
          <p className="text-sm text-gray-400">{error}</p>
          <p className="text-xs text-gray-500">
            Please ask the station staff for assistance.
          </p>
        </div>
      </div>
    );
  }

  // ── Check-in form ──
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border/50 bg-gray-900/80 p-6 shadow-xl backdrop-blur-lg">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Zap className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-white">EV Charging Check-in</h1>
          <p className="mt-1 text-sm text-gray-400">
            Start your charging session by filling in details below
          </p>
        </div>

        {/* Station info banner */}
        {stationInfo && (
          <div className="flex items-center gap-3 rounded-xl bg-gray-800/50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {stationInfo.stationName}
              </p>
              <p className="text-xs text-gray-400">
                <PlugZap className="mr-1 inline h-3 w-3" />
                Port #{stationInfo.portInfo.portNumber} —{" "}
                {stationInfo.portInfo.connectorType} ({stationInfo.portInfo.powerOutput})
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-300">
              <User className="h-3.5 w-3.5" /> Your Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              placeholder="Full name"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-300">
              <Phone className="h-3.5 w-3.5" /> Phone Number
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              required
              placeholder="98XXXXXXXX"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Vehicle */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-300">
                <Hash className="h-3.5 w-3.5" /> Vehicle No.
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="BA 1 PA 1234"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-300">
                <Car className="h-3.5 w-3.5" /> Vehicle Type
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="car">Car</option>
                <option value="suv">SUV</option>
                <option value="bike">E-Bike</option>
                <option value="scooter">E-Scooter</option>
                <option value="bus">Bus</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-300">
              <Clock className="h-3.5 w-3.5" /> Estimated Duration
            </label>
            <div className="flex gap-2">
              {[30, 60, 90, 120].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setEstimatedDuration(d)}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors",
                    estimatedDuration === d
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700"
                  )}
                >
                  {d < 60 ? `${d}m` : `${d / 60}h`}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting Session…
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Start Charging
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[10px] text-gray-500">
          By checking in you agree to pay at the station counter.
        </p>
      </div>
    </div>
  );
}
