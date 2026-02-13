/**
 * Utilities for calculating arrival status and urgency levels based on ETA data
 */

export interface ArrivalStatus {
  expectedArrivalTime: Date;
  minutesUntilArrival: number;
  urgencyLevel: "urgent" | "approaching" | "delayed" | "normal";
  isOverdue: boolean;
  statusLabel: string;
  bgColor: string;
  textColor: string;
}

/**
 * Calculate expected arrival time and urgency level based on booking ETA
 * @param bookingCreatedAt - When the booking was created
 * @param eta - ETA data (duration in minutes from booking time)
 * @param bookingStartTime - When the booking slot starts
 * @returns Arrival status with colors and labels
 */
export function calculateArrivalStatus(
  bookingCreatedAt: Date | string,
  eta: { durationMinutes?: number; distanceKm?: number; updatedAt?: Date | string } | undefined,
  bookingStartTime: Date | string
): ArrivalStatus {
  // Validate and convert inputs to Date objects
  let createdTime: Date;
  let startTime: Date;

  try {
    createdTime = bookingCreatedAt instanceof Date ? bookingCreatedAt : new Date(bookingCreatedAt);
    startTime = bookingStartTime instanceof Date ? bookingStartTime : new Date(bookingStartTime);

    // Check if dates are valid
    if (isNaN(createdTime.getTime())) createdTime = new Date();
    if (isNaN(startTime.getTime())) startTime = new Date();
  } catch {
    createdTime = new Date();
    startTime = new Date();
  }

  if (!eta || !eta.durationMinutes) {
    return {
      expectedArrivalTime: startTime,
      minutesUntilArrival: Math.max(0, (startTime.getTime() - new Date().getTime()) / (1000 * 60)),
      urgencyLevel: "normal",
      isOverdue: false,
      statusLabel: "No location data",
      bgColor: "bg-gray-100",
      textColor: "text-gray-700",
    };
  }

  // Validate ETA updated time
  let etaUpdatedTime: Date;
  try {
    etaUpdatedTime = eta.updatedAt instanceof Date ? eta.updatedAt : new Date(eta.updatedAt || new Date());
    if (isNaN(etaUpdatedTime.getTime())) etaUpdatedTime = new Date();
  } catch {
    etaUpdatedTime = new Date();
  }

  // Expected arrival: when user started their journey + ETA duration
  const expectedArrivalTime = new Date(etaUpdatedTime.getTime() + eta.durationMinutes * 60 * 1000);
  const now = new Date();
  const minutesUntilArrival = (expectedArrivalTime.getTime() - now.getTime()) / (1000 * 60);
  const isOverdue = minutesUntilArrival < 0;

  let urgencyLevel: "urgent" | "approaching" | "delayed" | "normal";
  let statusLabel: string;
  let bgColor: string;
  let textColor: string;

  if (isOverdue && Math.abs(minutesUntilArrival) > 30) {
    // More than 30 minutes overdue
    urgencyLevel = "delayed";
    statusLabel = `${Math.round(Math.abs(minutesUntilArrival))} mins overdue`;
    bgColor = "bg-red-100";
    textColor = "text-red-800";
  } else if (isOverdue) {
    // 0-30 minutes overdue or arriving soon
    urgencyLevel = "urgent";
    statusLabel = isOverdue ? `Overdue by ${Math.round(Math.abs(minutesUntilArrival))} mins` : "Arriving now";
    bgColor = "bg-orange-100";
    textColor = "text-orange-800";
  } else if (minutesUntilArrival <= 5) {
    // Arriving within 5 minutes (urgent)
    urgencyLevel = "urgent";
    statusLabel = `Arrives in ${Math.round(minutesUntilArrival)} min${Math.round(minutesUntilArrival) === 1 ? "" : "s"}`;
    bgColor = "bg-red-100";
    textColor = "text-red-800";
  } else if (minutesUntilArrival <= 15) {
    // Approaching (15 minutes)
    urgencyLevel = "approaching";
    statusLabel = `Arrives in ${Math.round(minutesUntilArrival)} mins`;
    bgColor = "bg-yellow-100";
    textColor = "text-yellow-800";
  } else {
    // Normal
    urgencyLevel = "normal";
    statusLabel = `Arrives in ${Math.round(minutesUntilArrival)} mins`;
    bgColor = "bg-green-100";
    textColor = "text-green-800";
  }

  return {
    expectedArrivalTime,
    minutesUntilArrival,
    urgencyLevel,
    isOverdue,
    statusLabel,
    bgColor,
    textColor,
  };
}

/**
 * Format arrival time for display (e.g., "2:45 PM")
 */
export function formatArrivalTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Get label for urgency level with icon
 */
export function getUrgencyIcon(urgencyLevel: string): string {
  switch (urgencyLevel) {
    case "urgent":
      return "🔴";
    case "approaching":
      return "🟡";
    case "delayed":
      return "🔺";
    default:
      return "🟢";
  }
}
