"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  MapPin,
  Zap,
  DollarSign,
  Clock,
  Settings,
  Save,
  ToggleLeft,
  ToggleRight,
  CircleDot,
  QrCode,
  Download,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import type { IStation } from "@/types";

interface StationFormData {
  name: string;
  address: string;
  city: string;
  province: string;
  telephone: string;
  lat: number;
  lng: number;
  chargingPorts: {
    portNumber: string;
    connectorType: string;
    powerOutput: string;
    chargerType: string;
  }[];
  perHour: number;
  openTime: string;
  closeTime: string;
  amenities: string[];
}

const CONNECTOR_OPTIONS = [
  { value: "type2", label: "Type 2" },
  { value: "ccssae", label: "CCS/SAE" },
  { value: "chademo", label: "CHAdeMO" },
  { value: "tesla", label: "Tesla" },
  { value: "wall-bs1363", label: "Wall BS1363" },
];

const AMENITY_OPTIONS = [
  { value: "wifi", label: "WiFi" },
  { value: "parking", label: "Parking" },
  { value: "food", label: "Food" },
  { value: "coffee", label: "Coffee" },
  { value: "accomodation", label: "Accommodation" },
  { value: "restroom", label: "Restroom" },
  { value: "petrol", label: "Petrol" },
];

export default function EditStationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [stationId, setStationId] = useState("");
  const [station, setStation] = useState<IStation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [togglingPortId, setTogglingPortId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<StationFormData>({
    defaultValues: {
      name: "",
      address: "",
      city: "",
      province: "",
      telephone: "",
      lat: 0,
      lng: 0,
      chargingPorts: [],
      perHour: 0,
      openTime: "06:00",
      closeTime: "22:00",
      amenities: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "chargingPorts",
  });

  const watchAmenities = watch("amenities");

  useEffect(() => {
    params.then((p) => setStationId(p.id));
  }, [params]);

  useEffect(() => {
    if (!stationId) return;

    async function fetchStation() {
      try {
        const res = await fetch(`/api/admin/stations/${stationId}`);
        if (res.ok) {
          const data = await res.json();
          const s: IStation = data.station ?? data;
          setStation(s);

          reset({
            name: s.name,
            address: s.location?.address ?? "",
            city: s.location?.city ?? "",
            province: s.location?.province ?? "",
            telephone: s.telephone ?? "",
            lat: s.location?.coordinates?.lat ?? 0,
            lng: s.location?.coordinates?.lng ?? 0,
            chargingPorts:
              s.chargingPorts?.map((p) => ({
                portNumber: p.portNumber,
                connectorType: p.connectorType,
                powerOutput: p.powerOutput,
                chargerType: p.chargerType,
              })) ?? [],
            perHour: s.pricing?.perHour ?? 0,
            openTime: s.operatingHours?.open ?? "06:00",
            closeTime: s.operatingHours?.close ?? "22:00",
            amenities: s.amenities ?? [],
          });
        }
      } catch (err) {
        console.error("Failed to fetch station:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStation();
  }, [stationId, reset]);

  const toggleAmenity = (amenity: string) => {
    const current = watchAmenities || [];
    const updated = current.includes(amenity)
      ? current.filter((a: string) => a !== amenity)
      : [...current, amenity];
    setValue("amenities", updated);
  };

  const togglePortStatus = async (portId: string, currentStatus: string) => {
    if (!stationId) return;
    setTogglingPortId(portId);
    try {
      const newStatus = currentStatus === "available" ? "occupied" : "available";
      const res = await fetch(`/api/admin/stations/${stationId}/ports`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portId, status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setStation(data.station);
      }
    } catch (err) {
      console.error("Failed to toggle port status:", err);
    } finally {
      setTogglingPortId(null);
    }
  };

  const setPortStatus = async (portId: string, status: string) => {
    if (!stationId) return;
    setTogglingPortId(portId);
    try {
      const res = await fetch(`/api/admin/stations/${stationId}/ports`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portId, status }),
      });
      if (res.ok) {
        const data = await res.json();
        setStation(data.station);
      }
    } catch (err) {
      console.error("Failed to set port status:", err);
    } finally {
      setTogglingPortId(null);
    }
  };

  const onSubmit = async (data: StationFormData) => {
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name: data.name,
        location: {
          address: data.address,
          city: data.city,
          province: data.province || "",
          coordinates: {
            lat: data.lat,
            lng: data.lng,
          },
        },
        telephone: data.telephone || "",
        chargingPorts: data.chargingPorts.map((port, index) => {
          // Preserve existing port status when editing (don't reset to available)
          const existingPort = station?.chargingPorts?.[index];
          return {
            ...port,
            ...(existingPort?._id ? { _id: existingPort._id } : {}),
            status: existingPort?.status || "available",
          };
        }),
        pricing: {
          perHour: data.perHour,
        },
        operatingHours: {
          open: data.openTime,
          close: data.closeTime,
        },
        amenities: data.amenities,
      };

      const res = await fetch(`/api/admin/stations/${stationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const resData = await res.json();
        setError(resData.message || "Failed to update station.");
        setSubmitting(false);
        return;
      }

      router.push("/admin/stations");
    } catch (err) {
      setError("An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading station...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/admin/stations"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Stations
        </Link>

        <h1 className="text-2xl font-bold text-foreground">Edit Station</h1>
        <p className="mt-1 text-muted-foreground">
          Update the station details below.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
          {/* Basic Info */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
              <MapPin className="h-5 w-5 text-primary" />
              Station Information
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Station Name *
                </label>
                <input
                  {...register("name", { required: "Station name is required" })}
                  className={cn(
                    "mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1",
                    errors.name
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-border focus:border-primary focus:ring-primary"
                  )}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-400">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Address *
                  </label>
                  <input
                    {...register("address", {
                      required: "Address is required",
                    })}
                    className={cn(
                      "mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1",
                      errors.address
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-border focus:border-primary focus:ring-primary"
                    )}
                  />
                  {errors.address && (
                    <p className="mt-1 text-xs text-red-400">
                      {errors.address.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    City *
                  </label>
                  <input
                    {...register("city", { required: "City is required" })}
                    className={cn(
                      "mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1",
                      errors.city
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-border focus:border-primary focus:ring-primary"
                    )}
                  />
                  {errors.city && (
                    <p className="mt-1 text-xs text-red-400">
                      {errors.city.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Province
                  </label>
                  <input
                    {...register("province")}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Phone
                  </label>
                  <input
                    {...register("telephone")}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    {...register("lat", {
                      required: "Latitude is required",
                      valueAsNumber: true,
                    })}
                    className={cn(
                      "mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1",
                      errors.lat
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-border focus:border-primary focus:ring-primary"
                    )}
                  />
                  {errors.lat && (
                    <p className="mt-1 text-xs text-red-400">
                      {errors.lat.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    {...register("lng", {
                      required: "Longitude is required",
                      valueAsNumber: true,
                    })}
                    className={cn(
                      "mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1",
                      errors.lng
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-border focus:border-primary focus:ring-primary"
                    )}
                  />
                  {errors.lng && (
                    <p className="mt-1 text-xs text-red-400">
                      {errors.lng.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Charging Ports */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
                <Zap className="h-5 w-5 text-primary" />
                Charging Ports
              </h2>
              <button
                type="button"
                onClick={() =>
                  append({
                    portNumber: String(fields.length + 1),
                    connectorType: "type2",
                    powerOutput: "7.2Kw",
                    chargerType: "AC",
                  })
                }
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <Plus className="h-4 w-4" />
                Add Port
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Port {index + 1}
                    </span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="rounded p-1 text-red-500 transition-colors hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground">
                        Port Number
                      </label>
                      <input
                        {...register(`chargingPorts.${index}.portNumber`)}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground">
                        Connector Type
                      </label>
                      <select
                        {...register(`chargingPorts.${index}.connectorType`)}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {CONNECTOR_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground">
                        Power Output
                      </label>
                      <input
                        {...register(`chargingPorts.${index}.powerOutput`)}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="e.g. 7.2Kw"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground">
                        Charger Type
                      </label>
                      <select
                        {...register(`chargingPorts.${index}.chargerType`)}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="AC">AC</option>
                        <option value="DC">DC</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No ports added. Click "Add Port" to add one.
                </p>
              )}
            </div>
          </div>

          {/* Port Status Management */}
          {station && station.chargingPorts && station.chargingPorts.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
                <CircleDot className="h-5 w-5 text-primary" />
                Port Status Management
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Toggle ports between available and occupied, or set maintenance mode.
              </p>

              <div className="mt-4 space-y-3">
                {station.chargingPorts.map((port) => {
                  const portId = String(port._id || port.portNumber);
                  const isToggling = togglingPortId === portId;
                  return (
                    <div
                      key={portId}
                      className="flex items-center justify-between rounded-lg border border-border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg",
                            port.status === "available"
                              ? "bg-green-500/15"
                              : port.status === "occupied"
                                ? "bg-red-500/15"
                                : port.status === "reserved"
                                  ? "bg-amber-500/15"
                                  : "bg-slate-500/15"
                          )}
                        >
                          <Zap
                            className={cn(
                              "h-5 w-5",
                              port.status === "available"
                                ? "text-green-400"
                                : port.status === "occupied"
                                  ? "text-red-400"
                                  : port.status === "reserved"
                                    ? "text-amber-400"
                                    : "text-slate-400"
                            )}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Port {port.portNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {port.connectorType} &middot; {port.powerOutput} &middot; {port.chargerType}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status badge */}
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-medium",
                            port.status === "available"
                              ? "bg-green-500/10 text-green-400"
                              : port.status === "occupied"
                                ? "bg-red-500/10 text-red-400"
                                : port.status === "reserved"
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-slate-500/10 text-slate-400"
                          )}
                        >
                          {port.status.charAt(0).toUpperCase() + port.status.slice(1)}
                        </span>

                        {/* Quick toggle: available ↔ occupied */}
                        <button
                          type="button"
                          onClick={() => togglePortStatus(portId, port.status)}
                          disabled={isToggling || port.status === "maintenance"}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                          title={port.status === "available" ? "Mark as Occupied" : "Mark as Available"}
                        >
                          {isToggling ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : port.status === "available" ? (
                            <ToggleRight className="h-6 w-6 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-red-400" />
                          )}
                        </button>

                        {/* Maintenance toggle */}
                        <select
                          value={port.status}
                          disabled={isToggling}
                          onChange={(e) => setPortStatus(portId, e.target.value)}
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                        >
                          <option value="available">Available</option>
                          <option value="occupied">Occupied</option>
                          <option value="reserved">Reserved</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Walk-in QR Codes */}
          {station && station.chargingPorts && station.chargingPorts.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
                <QrCode className="h-5 w-5 text-primary" />
                Walk-in QR Codes
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Print these QR codes and place them at each charging port. Walk-in customers can scan to self-check-in.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {station.chargingPorts.map((port) => {
                  const portIdStr = String(port._id || port.portNumber);
                  const checkInUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/walk-in/${stationId}/${portIdStr}`;
                  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(checkInUrl)}&bgcolor=1a1a2e&color=ffffff`;

                  return (
                    <div
                      key={portIdStr}
                      className="flex flex-col items-center rounded-lg border border-border p-4 text-center"
                    >
                      <div className="mb-3 rounded-lg bg-white p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qrApiUrl}
                          alt={`QR Code for Port ${port.portNumber}`}
                          width={160}
                          height={160}
                          className="h-40 w-40"
                        />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        Port {port.portNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {port.connectorType} &middot; {port.powerOutput}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <a
                          href={qrApiUrl}
                          download={`qr-port-${port.portNumber}.png`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </a>
                        <a
                          href={checkInUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Preview
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
              <DollarSign className="h-5 w-5 text-primary" />
              Pricing
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Rate per Hour (Rs.) *
                </label>
                <input
                  type="number"
                  {...register("perHour", { valueAsNumber: true })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Operating Hours */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
              <Clock className="h-5 w-5 text-primary" />
              Operating Hours
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Opening Time *
                </label>
                <input
                  type="time"
                  {...register("openTime")}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Closing Time *
                </label>
                <input
                  type="time"
                  {...register("closeTime")}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
              <Settings className="h-5 w-5 text-primary" />
              Amenities
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {AMENITY_OPTIONS.map((amenity) => {
                const isChecked = (watchAmenities || []).includes(amenity.value);
                return (
                  <label
                    key={amenity.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 transition-all",
                      isChecked
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-foreground hover:border-primary/30"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleAmenity(amenity.value)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium">{amenity.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <Link
              href="/admin/stations"
              className="flex flex-1 items-center justify-center rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors",
                submitting
                  ? "cursor-not-allowed bg-primary/50"
                  : "bg-primary hover:bg-primary/90"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
