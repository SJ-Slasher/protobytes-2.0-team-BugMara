"use client";

import { useState } from "react";
import { X, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { cn, getConnectorLabel } from "@/lib/utils";

export interface StationFilterValues {
  city: string;
  connectorTypes: string[];
  amenities: string[];
  vehicleType: string;
}

interface StationFiltersProps {
  cities: string[];
  onFilterChange: (filters: StationFilterValues) => void;
  className?: string;
}

const CONNECTOR_TYPES = [
  { value: "type2", label: "Type 2" },
  { value: "ccssae", label: "CCS/SAE" },
  { value: "chademo", label: "CHAdeMO" },
  { value: "tesla", label: "Tesla" },
  { value: "wall-bs1363", label: "Wall BS1363" },
];

const AMENITIES = [
  { value: "wifi", label: "WiFi" },
  { value: "parking", label: "Parking" },
  { value: "food", label: "Food" },
  { value: "coffee", label: "Coffee" },
  { value: "accomodation", label: "Accommodation" },
  { value: "restroom", label: "Restroom" },
  { value: "petrol", label: "Petrol" },
];

const VEHICLE_TYPES = [
  { value: "", label: "All Vehicles" },
  { value: "car", label: "Car" },
  { value: "bike", label: "Bike" },
  { value: "bus", label: "Bus" },
];

export function StationFilters({
  cities,
  onFilterChange,
  className,
}: StationFiltersProps) {
  const [filters, setFilters] = useState<StationFilterValues>({
    city: "",
    connectorTypes: [],
    amenities: [],
    vehicleType: "",
  });

  const [expandedSections, setExpandedSections] = useState({
    city: true,
    connectors: true,
    amenities: true,
    vehicle: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const updateFilters = (newFilters: Partial<StationFilterValues>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange(updated);
  };

  const toggleConnectorType = (type: string) => {
    const current = filters.connectorTypes;
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    updateFilters({ connectorTypes: updated });
  };

  const toggleAmenity = (amenity: string) => {
    const current = filters.amenities;
    const updated = current.includes(amenity)
      ? current.filter((a) => a !== amenity)
      : [...current, amenity];
    updateFilters({ amenities: updated });
  };

  const clearFilters = () => {
    const cleared: StationFilterValues = {
      city: "",
      connectorTypes: [],
      amenities: [],
      vehicleType: "",
    };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const hasActiveFilters =
    filters.city !== "" ||
    filters.connectorTypes.length > 0 ||
    filters.amenities.length > 0 ||
    filters.vehicleType !== "";

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-card-foreground">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {/* City Filter */}
      <div className="mt-5">
        <button
          onClick={() => toggleSection("city")}
          className="flex w-full items-center justify-between text-sm font-medium text-foreground"
        >
          City
          {expandedSections.city ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {expandedSections.city && (
          <div className="mt-2">
            <select
              value={filters.city}
              onChange={(e) => updateFilters({ city: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Connector Type Filter */}
      <div className="mt-5">
        <button
          onClick={() => toggleSection("connectors")}
          className="flex w-full items-center justify-between text-sm font-medium text-foreground"
        >
          Connector Type
          {expandedSections.connectors ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {expandedSections.connectors && (
          <div className="mt-2 space-y-2">
            {CONNECTOR_TYPES.map((type) => (
              <label
                key={type.value}
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={filters.connectorTypes.includes(type.value)}
                  onChange={() => toggleConnectorType(type.value)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">{type.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Amenities Filter */}
      <div className="mt-5">
        <button
          onClick={() => toggleSection("amenities")}
          className="flex w-full items-center justify-between text-sm font-medium text-foreground"
        >
          Amenities
          {expandedSections.amenities ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {expandedSections.amenities && (
          <div className="mt-2 space-y-2">
            {AMENITIES.map((amenity) => (
              <label
                key={amenity.value}
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={filters.amenities.includes(amenity.value)}
                  onChange={() => toggleAmenity(amenity.value)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">{amenity.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Vehicle Type Filter */}
      <div className="mt-5">
        <button
          onClick={() => toggleSection("vehicle")}
          className="flex w-full items-center justify-between text-sm font-medium text-foreground"
        >
          Vehicle Type
          {expandedSections.vehicle ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {expandedSections.vehicle && (
          <div className="mt-2 space-y-2">
            {VEHICLE_TYPES.map((vt) => (
              <label
                key={vt.value}
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="radio"
                  name="vehicleType"
                  checked={filters.vehicleType === vt.value}
                  onChange={() => updateFilters({ vehicleType: vt.value })}
                  className="h-4 w-4 border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">{vt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
