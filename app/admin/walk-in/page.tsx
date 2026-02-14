"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Square,
  Clock,
  Zap,
  Loader2,
  UserPlus,
  Calendar,
  Phone,
  Car,
  DollarSign,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { Spinner } from "@/components/ui/Spinner";

interface Port {
  _id: string;
  portNumber: string;
  connectorType: string;
  powerOutput: string;
  status: string;
}

interface StationData {
  _id: string;
  name: string;
  chargingPorts: Port[];
  pricing: { perHour: number };
}

interface ActiveSession {
  _id: string;
  stationId: string;
  portId: string;
  startTime: string;
  status: string;
  source: string;
}

interface WalkInSession {
  _id: string;
  customerName: string;
  customerPhone: string;
  vehicleNumber: string;
  vehicleType: string;
  stationId: string;
  portId: string;
  startTime: string;
  endTime: string;
  estimatedDuration: number;
  amountPaid: number;
  paymentMethod: string;
  source: string;
  status: string;
  notes: string;
  createdAt: string;
}

function ElapsedTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    function tick() {
      const ms = Date.now() - new Date(startTime).getTime();
      const totalSeconds = Math.floor(ms / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      setElapsed(
        h > 0
          ? `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`
          : `${m}m ${s.toString().padStart(2, "0")}s`
      );
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span className="font-mono text-lg font-bold tabular-nums text-primary">
      {elapsed}
    </span>
  );
}

export default function WalkInPage() {
  const [stations, setStations] = useState<StationData[]>([]);
  const [walkins, setWalkins] = useState<WalkInSession[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [stationsRes, walkinsRes] = await Promise.all([
        fetch("/api/admin/stations"),
        fetch("/api/admin/walk-in"),
      ]);
      if (stationsRes.ok) {
        const data = await stationsRes.json();
        setStations(data.stations || []);
      }
      if (walkinsRes.ok) {
        const data = await walkinsRes.json();
        const all: WalkInSession[] = data.walkins || [];
        const active = all.filter((w) => w.status === "active");
        const completed = all.filter((w) => w.status === "completed");
        setActiveSessions(active);
        setWalkins(completed);
      }
    } catch {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll every 30s to keep active sessions fresh
    pollRef.current = setInterval(fetchData, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchData]);

  const getActiveSession = (stationId: string, portId: string) => {
    return activeSessions.find(
      (s) =>
        (s.stationId === stationId || String(s.stationId) === stationId) &&
        (s.portId === portId || String(s.portId) === portId)
    );
  };

  const handleStart = async (stationId: string, portId: string) => {
    setError("");
    setActionLoading(portId);
    try {
      const res = await fetch("/api/admin/walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", stationId, portId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start session");
        return;
      }
      await fetchData();
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async (bookingId: string) => {
    setError("");
    setActionLoading(bookingId);
    try {
      const res = await fetch("/api/admin/walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop", bookingId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to stop session");
      }
      await fetchData();
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="border-b border-border/50 bg-surface px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              Walk-in Sessions
            </h1>
            <p className="text-sm text-muted-foreground">
              Press Start when a walk-in customer plugs in, Stop when they leave
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* ── Stations & Ports with Start/Stop ── */}
        {stations.map((station) => (
          <div
            key={station._id}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <div className="border-b border-border/50 bg-card/80 px-4 py-3 sm:px-5">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Zap className="h-4 w-4 text-primary" />
                {station.name}
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  Rs. {station.pricing?.perHour || 200}/hr
                </span>
              </h2>
            </div>

            <div className="divide-y divide-border/50">
              {station.chargingPorts?.map((port) => {
                const session = getActiveSession(station._id, port._id);
                const isActive = !!session;
                const isLoading =
                  actionLoading === port._id || actionLoading === session?._id;

                return (
                  <div
                    key={port._id}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 sm:px-5 transition-colors",
                      isActive && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg",
                          isActive ? "bg-primary/15" : "bg-muted/50"
                        )}
                      >
                        <Zap
                          className={cn(
                            "h-4 w-4",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Port {port.portNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {port.connectorType} · {port.powerOutput}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isActive && session && (
                        <div className="text-right mr-2">
                          <ElapsedTimer startTime={session.startTime} />
                          <p className="text-[10px] text-muted-foreground">elapsed</p>
                        </div>
                      )}

                      {isActive && session ? (
                        <button
                          onClick={() => handleStop(session._id)}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Square className="h-4 w-4 fill-current" />
                          )}
                          Stop
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStart(station._id, port._id)}
                          disabled={
                            isLoading || port.status === "maintenance"
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4 fill-current" />
                          )}
                          Start
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {stations.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
            <Zap className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No stations assigned. Contact a superadmin to assign stations.
            </p>
          </div>
        )}

        {/* ── Completed sessions history ── */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Completed Walk-ins
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({walkins.length})
            </span>
          </h2>

          {walkins.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
              <UserPlus className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No completed walk-in sessions yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {walkins.map((w) => (
                <div
                  key={w._id}
                  className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {w.customerName || "Walk-in"}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                            w.source === "walk-in-qr"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-amber-500/10 text-amber-400"
                          )}
                        >
                          {w.source === "walk-in-qr" ? "QR" : "Manual"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(w.startTime), "MMM d, h:mm a")} →{" "}
                          {format(new Date(w.endTime), "h:mm a")}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {w.estimatedDuration}m
                        </span>
                        {w.customerPhone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {w.customerPhone}
                          </span>
                        )}
                        {w.vehicleNumber && (
                          <span className="inline-flex items-center gap-1">
                            <Car className="h-3 w-3" /> {w.vehicleNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">
                        {formatPrice(w.amountPaid || 0)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {w.paymentMethod || "cash"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
