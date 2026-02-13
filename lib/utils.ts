import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Haversine distance in km between two lat/lng points */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Point-to-line-segment distance in km (for route corridor matching) */
export function pointToSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return haversineDistance(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return haversineDistance(px, py, ax + t * dx, ay + t * dy);
}

/** Find minimum distance from a point to any segment in a polyline (km) */
export function pointToRouteDistance(
  lat: number,
  lng: number,
  routeCoords: [number, number][] // [lng, lat]
): number {
  let minDist = Infinity;
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const [aLng, aLat] = routeCoords[i];
    const [bLng, bLat] = routeCoords[i + 1];
    const d = pointToSegmentDistance(lat, lng, aLat, aLng, bLat, bLng);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

export function formatPrice(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-NP")}`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}hr`;
  return `${hours}hr ${mins}min`;
}

export function getConnectorLabel(plug: string): string {
  const labels: Record<string, string> = {
    type2: "Type 2",
    ccssae: "CCS/SAE",
    chademo: "CHAdeMO",
    tesla: "Tesla",
    "wall-bs1363": "Wall BS1363",
  };
  return labels[plug] || plug;
}

export function getAmenityIcon(amenity: string): string {
  const icons: Record<string, string> = {
    wifi: "Wifi",
    parking: "ParkingCircle",
    food: "UtensilsCrossed",
    coffee: "Coffee",
    accomodation: "Hotel",
    restroom: "Bath",
    petrol: "Fuel",
  };
  return icons[amenity] || "CircleDot";
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    available: "text-green-600 bg-green-50",
    occupied: "text-red-600 bg-red-50",
    reserved: "text-yellow-600 bg-yellow-50",
    maintenance: "text-gray-600 bg-gray-50",
  };
  return colors[status] || "text-gray-600 bg-gray-50";
}

export function getBookingStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "text-yellow-600 bg-yellow-50",
    confirmed: "text-blue-600 bg-blue-50",
    active: "text-green-600 bg-green-50",
    completed: "text-gray-600 bg-gray-50",
    cancelled: "text-red-600 bg-red-50",
    "no-show": "text-orange-600 bg-orange-50",
  };
  return colors[status] || "text-gray-600 bg-gray-50";
}
