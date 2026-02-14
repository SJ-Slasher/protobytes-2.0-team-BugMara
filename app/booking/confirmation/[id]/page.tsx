"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Zap,
  QrCode,
  CheckCircle2,
  X,
  Loader2,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import {
  cn,
  formatPrice,
  formatDuration,
  getConnectorLabel,
} from "@/lib/utils";
import type { IBooking, IStation } from "@/types";
import { format } from "date-fns";
import { ReviewForm } from "@/components/review/ReviewForm";

const statusVariantMap: Record<
  string,
  "default" | "success" | "warning" | "danger" | "info"
> = {
  pending: "warning",
  confirmed: "info",
  active: "success",
  completed: "default",
  cancelled: "danger",
  "no-show": "danger",
};

export default function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState<IBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    params.then((p) => setBookingId(p.id));
  }, [params]);

  // Verify Khalti payment if pidx is present in URL
  useEffect(() => {
    if (!bookingId) return;
    const pidx = searchParams.get("pidx");
    if (!pidx) return;

    async function verifyPayment() {
      setVerifying(true);
      setPaymentError("");
      try {
        const res = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pidx, bookingId }),
        });
        const data = await res.json();

        if (res.ok && data.verified) {
          // Payment verified — refresh booking data
          const bookingRes = await fetch(`/api/bookings/${bookingId}`);
          if (bookingRes.ok) {
            const bookingData = await bookingRes.json();
            setBooking(bookingData.booking ?? bookingData);
          }
        } else if (data.status === "User canceled" || data.status === "Expired") {
          setPaymentError("Payment was cancelled or expired. Your booking has been cancelled.");
          // Refresh booking to show cancelled status
          const bookingRes = await fetch(`/api/bookings/${bookingId}`);
          if (bookingRes.ok) {
            const bookingData = await bookingRes.json();
            setBooking(bookingData.booking ?? bookingData);
          }
        } else if (!res.ok) {
          setPaymentError(data.error || "Payment verification failed.");
        } else {
          setPaymentError("Payment is still being processed. Please wait and refresh.");
        }
      } catch (err) {
        console.error("Payment verification error:", err);
        setPaymentError("Failed to verify payment. Please contact support.");
      } finally {
        setVerifying(false);
        setLoading(false);
      }
    }
    verifyPayment();
  }, [bookingId, searchParams]);

  // Fetch booking details (skip if Khalti verification is handling it)
  useEffect(() => {
    if (!bookingId) return;
    const pidx = searchParams.get("pidx");
    if (pidx) return; // verification useEffect handles fetching

    async function fetchBooking() {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        if (res.ok) {
          const data = await res.json();
          setBooking(data.booking ?? data);
        }
      } catch (err) {
        console.error("Failed to fetch booking:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBooking();
  }, [bookingId]);

  // Live ETA tracking — periodically send user location to update ETA for station admin
  useEffect(() => {
    if (!booking) return;
    // Only track for active bookings (pending/confirmed)
    if (!["pending", "confirmed"].includes(booking.status)) return;
    if (!navigator.geolocation) return;

    let watchId: number;
    let lastUpdate = 0;
    const MIN_INTERVAL = 30_000; // update at most every 30 seconds

    const updateEta = (lat: number, lng: number) => {
      const now = Date.now();
      if (now - lastUpdate < MIN_INTERVAL) return;
      lastUpdate = now;

      fetch(`/api/bookings/${booking._id}/eta`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.eta) {
            setBooking((prev) => prev ? { ...prev, eta: data.eta } : prev);
          }
        })
        .catch((err) => {
          console.warn("Failed to update ETA:", err);
        });
    };

    watchId = navigator.geolocation.watchPosition(
      (pos) => updateEta(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, maximumAge: 20_000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [booking?._id, booking?.status]);

  const handleCancel = async () => {
    if (!booking) return;
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );
    if (!confirmed) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${booking._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        const data = await res.json();
        setBooking(data.booking ?? data);
      }
    } catch (err) {
      console.error("Failed to cancel booking:", err);
    } finally {
      setCancelling(false);
    }
  };

  if (loading || verifying) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-muted-foreground">
            {verifying ? "Verifying payment..." : "Loading booking details..."}
          </p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">
            Booking Not Found
          </h2>
          <p className="mt-2 text-muted-foreground">
            The booking you are looking for does not exist.
          </p>
          <Link
            href="/dashboard/bookings"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            View My Bookings
          </Link>
        </div>
      </div>
    );
  }

  const station =
    typeof booking.stationId === "object"
      ? (booking.stationId as IStation)
      : null;

  // Get port details from station
  const portDetails = station?.chargingPorts?.find(
    (p) => String(p._id) === String(booking.portId) || String(p.portNumber) === String(booking.portId)
  );

  const statusVariant = statusVariantMap[booking.status] || "default";
  const canCancel =
    booking.status === "pending" || booking.status === "confirmed";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/dashboard/bookings"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          My Bookings
        </Link>

        {/* Payment Error Banner */}
        {paymentError && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {paymentError}
          </div>
        )}

        {/* Confirmation Header */}
        <div className="text-center">
          <div
            className={cn(
              "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full",
              booking.status === "cancelled"
                ? "bg-red-500/10"
                : booking.status === "pending"
                ? "bg-yellow-500/10"
                : "bg-primary/10"
            )}
          >
            {booking.status === "cancelled" ? (
              <X className="h-8 w-8 text-red-500" />
            ) : booking.status === "pending" ? (
              <Clock className="h-8 w-8 text-yellow-500" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {booking.status === "cancelled"
              ? "Booking Cancelled"
              : booking.status === "pending"
              ? "Booking Pending"
              : "Booking Confirmed"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Booking ID:{" "}
            <span className="font-mono text-sm">{booking._id}</span>
          </p>
        </div>

        {/* Status Badge */}
        <div className="mt-6 flex justify-center">
          <Badge variant={statusVariant} className="px-4 py-1.5 text-sm">
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </div>

        {/* Booking Details */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold text-card-foreground">
            Booking Details
          </h2>

          <div className="mt-4 space-y-4">
            {/* Station */}
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {station ? station.name : "Charging Station"}
                </p>
                {station && (
                  <p className="text-sm text-muted-foreground">
                    {station.location?.address}, {station.location?.city}
                  </p>
                )}
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {format(new Date(booking.startTime), "EEEE, MMMM d, yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(booking.startTime), "h:mm a")} -{" "}
                  {format(new Date(booking.endTime), "h:mm a")}
                </p>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Duration: {formatDuration(booking.estimatedDuration)}
                </p>
              </div>
            </div>

            {/* Port */}
            <div className="flex items-start gap-3">
              <Zap className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Charging Port
                </p>
                <div className="mt-2 rounded-lg bg-muted/50 p-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Port Number</p>
                      <p className="font-medium text-foreground">
                        {portDetails?.portNumber || booking.portId}
                      </p>
                    </div>
                    {portDetails?.connectorType && (
                      <div>
                        <p className="text-xs text-muted-foreground">Connector</p>
                        <p className="font-medium text-foreground">
                          {portDetails.connectorType}
                        </p>
                      </div>
                    )}
                    {portDetails?.powerOutput && (
                      <div>
                        <p className="text-xs text-muted-foreground">Power Output</p>
                        <p className="font-medium text-foreground">
                          {portDetails.powerOutput}
                        </p>
                      </div>
                    )}
                    {portDetails?.chargerType && (
                      <div>
                        <p className="text-xs text-muted-foreground">Charger Type</p>
                        <p className="font-medium text-foreground">
                          {portDetails.chargerType}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Charging Cost */}
            {station?.pricing?.perHour && (
              <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Charging Cost
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {formatPrice(station.pricing.perHour * (booking.estimatedDuration / 60))}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatPrice(station.pricing.perHour)}/hr × {formatDuration(booking.estimatedDuration)}
                </p>
              </div>
            )}

            {/* ETA to Station */}
            {booking.eta && ["pending", "confirmed"].includes(booking.status) && (
              <div className="mt-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    ETA to Station
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    {booking.eta.durationMinutes} min
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {booking.eta.distanceKm} km away · Updated {format(new Date(booking.eta.updatedAt), "h:mm a")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* QR Code */}
        {booking.qrCode && (
          <div className="mt-6 rounded-xl border border-border bg-card p-6 text-center">
            <h3 className="flex items-center justify-center gap-2 font-semibold text-card-foreground">
              <QrCode className="h-5 w-5 text-primary" />
              Your QR Code
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Show this QR code at the station to start charging.
            </p>
            <div className="mt-4 flex justify-center">
              <img
                src={booking.qrCode}
                alt="Booking QR Code"
                className="h-48 w-48 rounded-lg border border-border"
              />
            </div>
          </div>
        )}

        {/* Review Section - show for completed bookings */}
        {booking.status === "completed" && (
          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <h3 className="flex items-center gap-2 font-semibold text-card-foreground">
              <Star className="h-5 w-5 text-yellow-500" />
              Leave a Review
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              How was your charging experience?
            </p>
            <div className="mt-4">
              <ReviewForm
                stationId={typeof booking.stationId === "object" ? (booking.stationId as IStation)._id : booking.stationId}
                bookingId={booking._id}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard/bookings"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            View My Bookings
          </Link>
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500/10 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
            >
              {cancelling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Cancel Booking
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
