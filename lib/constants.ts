// Time constants
export const MINUTES_PER_DAY = 1440;
export const SECONDS_PER_MINUTE = 60;
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = SECONDS_PER_MINUTE * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;

// ETA tracking constants
export const ETA_UPDATE_INTERVAL_MS = 30_000; // 30 seconds
export const AUTO_REFRESH_INTERVAL_MS = 5 * MS_PER_MINUTE; // 5 minutes
export const MIN_ETA_UPDATE_INTERVAL_MS = ETA_UPDATE_INTERVAL_MS;

// Booking duration constants
export const MIN_BOOKING_DURATION_MINUTES = 1;
export const MAX_BOOKING_DURATION_MINUTES = MINUTES_PER_DAY;

// Pricing constants (NPR - Nepalese Rupee)
export const DEFAULT_HOURLY_RATE_NPR = 200;
export const KHALTI_AMOUNT_UNIT = 100; // Paisa (1 NPR = 100 Paisa)

// Geolocation constants
export const GEOLOCATION_TIMEOUT_MS = 5000;
export const GEOLOCATION_ENABLE_HIGH_ACCURACY = true;

// Pagination constants
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 50;

// Location validation constants
export const MIN_LATITUDE = -90;
export const MAX_LATITUDE = 90;
export const MIN_LONGITUDE = -180;
export const MAX_LONGITUDE = 180;

// Booking status values
export const BOOKING_STATUS_PENDING = "pending";
export const BOOKING_STATUS_CONFIRMED = "confirmed";
export const BOOKING_STATUS_ACTIVE = "active";
export const BOOKING_STATUS_COMPLETED = "completed";
export const BOOKING_STATUS_CANCELLED = "cancelled";
export const BOOKING_STATUS_NO_SHOW = "no-show";

export const VALID_BOOKING_STATUSES = [
  BOOKING_STATUS_PENDING,
  BOOKING_STATUS_CONFIRMED,
  BOOKING_STATUS_ACTIVE,
  BOOKING_STATUS_COMPLETED,
  BOOKING_STATUS_CANCELLED,
  BOOKING_STATUS_NO_SHOW,
] as const;

// Port status values
export const PORT_STATUS_AVAILABLE = "available";
export const PORT_STATUS_RESERVED = "reserved";
export const PORT_STATUS_IN_USE = "in-use";
export const PORT_STATUS_MAINTENANCE = "maintenance";
export const PORT_STATUS_DISABLED = "disabled";

// User role values
export const USER_ROLE_USER = "user";
export const USER_ROLE_ADMIN = "admin";
export const USER_ROLE_SUPERADMIN = "superadmin";
