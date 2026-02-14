"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import {
  Calendar,
  Heart,
  MapPin,
  Zap,
  ChevronRight,
  Clock,
  Battery,
  Star,
  Activity,
  BarChart3,
  CreditCard,
  Settings,
  Car,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import type { IBooking, IStation } from "@/types";
import { format } from "date-fns";

/* ─── Stat Card ─── */
function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/20"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold text-card-foreground">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
            accent
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <ChevronRight className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

/* ─── Quick Action ─── */
function QuickAction({
  icon: Icon,
  label,
  description,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/20"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors">
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

/* ─── Status variant map for bookings ─── */
const statusVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  pending: "warning",
  confirmed: "info",
  active: "success",
  completed: "default",
  cancelled: "danger",
  "no-show": "danger",
};

export default function DashboardPage() {
  const { user } = useUser();
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [favorites, setFavorites] = useState<IStation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [bookingsRes, favoritesRes] = await Promise.all([
          fetch("/api/bookings"),
          fetch("/api/users/favorites"),
        ]);

        if (bookingsRes.ok) {
          const data = await bookingsRes.json();
          setBookings(data.bookings ?? data ?? []);
        }
        if (favoritesRes.ok) {
          const data = await favoritesRes.json();
          setFavorites(data.stations ?? data ?? []);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      upcoming: bookings.filter(
        (b) =>
          (b.status === "confirmed" || b.status === "pending") &&
          new Date(b.startTime) > now
      ).length,
      active: bookings.filter((b) => b.status === "active").length,
      completed: bookings.filter((b) => b.status === "completed").length,
      total: bookings.length,
      favorites: favorites.length,
    };
  }, [bookings, favorites]);

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 4);
  }, [bookings]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="animate-fade-in-up">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {greeting}, {user?.firstName || "there"}!
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here&apos;s an overview of your EV charging activity.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
          <StatCard
            icon={Calendar}
            label="Upcoming"
            value={stats.upcoming}
            accent="bg-blue-500/10 text-blue-400"
            href="/dashboard/bookings"
          />
          <StatCard
            icon={Activity}
            label="Active Now"
            value={stats.active}
            accent="bg-emerald-500/10 text-emerald-400"
            href="/dashboard/bookings"
          />
          <StatCard
            icon={Zap}
            label="Total Sessions"
            value={stats.total}
            accent="bg-amber-500/10 text-amber-400"
            href="/dashboard/bookings"
          />
          <StatCard
            icon={Heart}
            label="Favorites"
            value={stats.favorites}
            accent="bg-rose-500/10 text-rose-400"
            href="/dashboard/favorites"
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Recent Bookings */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Recent Bookings
              </h2>
              <Link
                href="/dashboard/bookings"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                View all
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {recentBookings.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                  <Calendar className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <h3 className="mt-3 text-sm font-medium text-foreground">
                    No bookings yet
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Find a charging station and book your first session.
                  </p>
                  <Link
                    href="/"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    Find Stations
                  </Link>
                </div>
              ) : (
                recentBookings.map((booking) => {
                  const station =
                    typeof booking.stationId === "object" &&
                    booking.stationId &&
                    "name" in booking.stationId
                      ? (booking.stationId as IStation)
                      : null;

                  let startDate: Date;
                  try {
                    startDate = new Date(booking.startTime);
                    if (isNaN(startDate.getTime())) throw new Error();
                  } catch {
                    startDate = new Date();
                  }

                  return (
                    <Link
                      key={booking._id}
                      href={`/dashboard/bookings`}
                      className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/20"
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          booking.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : booking.status === "confirmed" ||
                                booking.status === "pending"
                              ? "bg-blue-500/10 text-blue-400"
                              : booking.status === "completed"
                                ? "bg-slate-500/10 text-slate-400"
                                : "bg-red-500/10 text-red-400"
                        )}
                      >
                        <Zap className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-card-foreground">
                            {station?.name ||
                              `Station ${String(booking.stationId).slice(0, 8)}...`}
                          </p>
                          <Badge variant={statusVariant[booking.status] || "default"}>
                            {booking.status.charAt(0).toUpperCase() +
                              booking.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(startDate, "MMM d, yyyy")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(startDate, "h:mm a")}
                          </span>
                          {booking.estimatedDuration && (
                            <span className="flex items-center gap-1">
                              <Battery className="h-3 w-3" />
                              {booking.estimatedDuration}min
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Sidebar: Quick Actions + Favorites */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Quick Actions
              </h2>
              <div className="mt-4 space-y-2">
                <QuickAction
                  icon={MapPin}
                  label="Find Stations"
                  description="Browse the charging map"
                  href="/"
                />
                <QuickAction
                  icon={Calendar}
                  label="My Bookings"
                  description="View and manage bookings"
                  href="/dashboard/bookings"
                />
                <QuickAction
                  icon={Settings}
                  label="Edit Profile"
                  description="Update your vehicle info"
                  href="/dashboard/profile"
                />
              </div>
            </div>

            {/* Favorite Stations */}
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Favorites
                </h2>
                {favorites.length > 0 && (
                  <Link
                    href="/dashboard/favorites"
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    View all
                  </Link>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {favorites.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-5 text-center">
                    <Heart className="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      No favorites yet. Heart a station to save it here.
                    </p>
                  </div>
                ) : (
                  favorites.slice(0, 3).map((station) => {
                    const availablePorts =
                      station.chargingPorts?.filter(
                        (p) => p.status === "available"
                      ).length ?? 0;
                    const totalPorts = station.chargingPorts?.length ?? 0;

                    return (
                      <Link
                        key={station._id}
                        href={`/stations/${station._id}`}
                        className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-all hover:shadow-sm hover:border-primary/20"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                          <Heart className="h-4 w-4 fill-current" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-card-foreground">
                            {station.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{station.location?.city}</span>
                            <span>·</span>
                            <span
                              className={cn(
                                availablePorts > 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              )}
                            >
                              {availablePorts}/{totalPorts} available
                            </span>
                            {station.rating > 0 && (
                              <>
                                <span>·</span>
                                <span className="flex items-center gap-0.5">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                  {station.rating.toFixed(1)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
