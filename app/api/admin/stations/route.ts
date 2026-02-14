import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import Station from "@/lib/models/Station";
import { loadAllStationsFromFile } from "@/lib/stations";
import { verifyAdminRole } from "@/lib/auth";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyAdminRole(userId);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Station admins only see their own stations; superadmins see all
    const filter = user.role === "admin" ? { adminId: userId } : {};
    const dbStations = await Station.find(filter).sort({ createdAt: -1 }).lean();

    // File-based demo stations are only visible to superadmins
    let stations: unknown[] = [...dbStations];
    if (user.role === "superadmin") {
      const fileStations = loadAllStationsFromFile();
      const dbIds = new Set(dbStations.map((s) => String(s.name)));
      const extraFileStations = fileStations.filter((s) => !dbIds.has(s.name));
      stations = [...dbStations, ...extraFileStations];
    }

    return NextResponse.json({ stations }, { status: 200 });
  } catch (error) {
    console.error("Error fetching admin stations:", error);
    return NextResponse.json(
      { error: "Failed to fetch stations" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await verifyAdminRole(userId);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.name || !body.location) {
      return NextResponse.json(
        { error: "Missing required fields: name, location" },
        { status: 400 }
      );
    }

    // Validate location coordinates
    if (!body.location.coordinates?.lat || !body.location.coordinates?.lng) {
      return NextResponse.json(
        { error: "Invalid location: must include coordinates with lat and lng" },
        { status: 400 }
      );
    }

    const lat = parseFloat(body.location.coordinates.lat);
    const lng = parseFloat(body.location.coordinates.lng);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return NextResponse.json(
        { error: "Invalid latitude: must be between -90 and 90" },
        { status: 400 }
      );
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: "Invalid longitude: must be between -180 and 180" },
        { status: 400 }
      );
    }

    // Whitelist allowed fields
    const allowedFields = [
      "name",
      "location",
      "telephone",
      "operatingHours",
      "chargingPorts",
      "pricing",
      "photos",
      "description",
    ];

    const stationData: Record<string, unknown> = { adminId: userId };

    for (const field of allowedFields) {
      if (field in body) {
        if (field === "pricing") {
          // Validate pricing
          if (body.pricing?.perHour && body.pricing.perHour < 0) {
            return NextResponse.json(
              { error: "Pricing per hour cannot be negative" },
              { status: 400 }
            );
          }
        }
        stationData[field] = body[field];
      }
    }

    const station = await Station.create(stationData);

    return NextResponse.json({ station }, { status: 201 });
  } catch (error) {
    console.error("Error creating station:", error);
    return NextResponse.json(
      { error: "Failed to create station" },
      { status: 500 }
    );
  }
}
