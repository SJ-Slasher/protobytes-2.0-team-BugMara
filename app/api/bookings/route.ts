import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import { loadStationFromFile } from "@/lib/stations";
import Booking from "@/lib/models/Booking";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { userId };
    if (status) {
      filter.status = status;
    }

    // Use populate to avoid N+1 queries
    const bookings = await Booking.find(filter)
      .populate("stationId", "name location chargingPorts pricing photos")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Enrich file-based stations with data
    const enriched = bookings.map((booking) => {
      const sid = String(booking.stationId);
      if (sid.startsWith("station-")) {
        const stationData = loadStationFromFile(sid);
        return { ...booking, stationId: stationData || sid };
      }
      return booking;
    });

    // Get total count for pagination
    const total = await Booking.countDocuments(filter);

    return NextResponse.json(
      {
        bookings: enriched,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return NextResponse.json(
    { error: "Bookings must be created through the payment gateway. Use POST /api/payments/initiate instead." },
    { status: 403 }
  );
}
