"use client";

import { Zap } from "lucide-react";
import { cn, getConnectorLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { ChargingPort } from "@/types";

interface PortAvailabilityProps {
  ports: ChargingPort[];
  className?: string;
  onSelectPort?: (portId: string) => void;
  selectedPortId?: string;
  selectable?: boolean;
}

const statusConfig: Record<
  string,
  { label: string; variant: "success" | "danger" | "warning" | "default"; dotColor: string }
> = {
  available: {
    label: "Available",
    variant: "success",
    dotColor: "bg-green-500",
  },
  occupied: {
    label: "Occupied",
    variant: "danger",
    dotColor: "bg-red-500",
  },
  reserved: {
    label: "Reserved",
    variant: "warning",
    dotColor: "bg-yellow-500",
  },
  maintenance: {
    label: "Maintenance",
    variant: "default",
    dotColor: "bg-gray-400",
  },
};

export function PortAvailability({
  ports,
  className,
  onSelectPort,
  selectedPortId,
  selectable = false,
}: PortAvailabilityProps) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {ports.map((port) => {
        const config = statusConfig[port.status] || statusConfig.maintenance;
        const isSelected = selectedPortId === port._id;
        const isClickable = selectable && port.status === "available";

        return (
          <button
            key={port._id || port.portNumber}
            type="button"
            disabled={!isClickable}
            onClick={() => {
              if (isClickable && port._id) {
                onSelectPort?.(port._id);
              }
            }}
            className={cn(
              "rounded-lg border p-4 text-left transition-all",
              isClickable
                ? "cursor-pointer hover:border-primary/50 hover:shadow-sm"
                : "cursor-default",
              isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border bg-card",
              !isClickable && selectable && "opacity-50"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    port.status === "available"
                      ? "bg-green-100"
                      : port.status === "occupied"
                        ? "bg-red-100"
                        : port.status === "reserved"
                          ? "bg-yellow-100"
                          : "bg-gray-100"
                  )}
                >
                  <Zap
                    className={cn(
                      "h-4 w-4",
                      port.status === "available"
                        ? "text-green-600"
                        : port.status === "occupied"
                          ? "text-red-600"
                          : port.status === "reserved"
                            ? "text-yellow-600"
                            : "text-gray-500"
                    )}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-card-foreground">
                    Port {port.portNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getConnectorLabel(port.connectorType)}
                  </p>
                </div>
              </div>
              <Badge variant={config.variant}>{config.label}</Badge>
            </div>

            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              {port.powerOutput && (
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {port.powerOutput}
                </span>
              )}
              {port.chargerType && (
                <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
                  {port.chargerType}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
