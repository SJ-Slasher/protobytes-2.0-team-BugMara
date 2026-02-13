import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import Booking from "@/lib/models/Booking";
import User from "@/lib/models/User";
import { calculateETA, getStationCoordinates } from "@/lib/eta";

/**
 * POST /api/bookings/[id]/refresh-eta
 * Recalculate ETA for a booking based on current user location (if provided)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const { userLocation } = body;

    if (!userLocation || !userLocation.lat || !userLocation.lng) {
      return NextResponse.json(
        { error: "User location (lat, lng) is required" },
        { status: 400 }
      );
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Only allow admin to refresh ETA for other users' bookings
    if (booking.userId !== userId) {
      const user = await User.findOne({ clerkId: userId });
      if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Get station coordinates
    const stationCoords = await getStationCoordinates(String(booking.stationId));
    if (!stationCoords) {
      return NextResponse.json(
        { error: "Could not find station location" },
        { status: 400 }
      );
    }

    // Recalculate ETA
    const newETA = await calculateETA(userLocation, stationCoords);
    if (!newETA) {
      return NextResponse.json(
        { error: "Failed to calculate ETA" },
        { status: 500 }
      );
    }

    // Update booking with new location and ETA
    booking.userLocation = userLocation;
    booking.eta = newETA;
    await booking.save();

    return NextResponse.json(
      { booking, message: "ETA refreshed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error refreshing ETA:", error);
    return NextResponse.json(
      { error: "Failed to refresh ETA" },
      { status: 500 }
    );
  }
}
