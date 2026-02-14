"use client";

import { useState } from "react";
import { User, Building2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type AccountRole = "user" | "admin" | "superadmin";

interface RoleOption {
  role: AccountRole;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
}

const roleOptions: RoleOption[] = [
  {
    role: "user",
    label: "User",
    description: "Book charging sessions, save favorites, and track your EV charging history.",
    icon: User,
    color: "text-blue-600",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20 ring-blue-500/20",
  },
  {
    role: "admin",
    label: "Station Admin",
    description: "Manage your charging stations, view bookings, and monitor analytics.",
    icon: Building2,
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20 ring-amber-500/20",
  },
  {
    role: "superadmin",
    label: "Super Admin",
    description: "Full platform access. Manage all stations, users, and system settings.",
    icon: ShieldCheck,
    color: "text-purple-600",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20 ring-purple-500/20",
  },
];

interface RoleSelectorProps {
  selectedRole: AccountRole;
  onRoleChange: (role: AccountRole) => void;
  className?: string;
}

export function RoleSelector({
  selectedRole,
  onRoleChange,
  className,
}: RoleSelectorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm font-medium text-foreground">Select Account Type</p>
      <div className="grid gap-3">
        {roleOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedRole === option.role;

          return (
            <button
              key={option.role}
              type="button"
              onClick={() => onRoleChange(option.role)}
              className={cn(
                "flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all",
                isSelected
                  ? `${option.border} bg-card shadow-sm ring-2`
                  : "border-border bg-card hover:border-border/80 hover:shadow-sm"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  option.bg
                )}
              >
                <Icon className={cn("h-5 w-5", option.color)} />
              </div>
              <div>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    isSelected ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {option.label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
              <div className="ml-auto mt-1">
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                    isSelected
                      ? `${option.border} ${option.bg}`
                      : "border-gray-300"
                  )}
                >
                  {isSelected && (
                    <div
                      className={cn("h-2.5 w-2.5 rounded-full", {
                        "bg-blue-600": option.role === "user",
                        "bg-amber-600": option.role === "admin",
                        "bg-purple-600": option.role === "superadmin",
                      })}
                    />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
