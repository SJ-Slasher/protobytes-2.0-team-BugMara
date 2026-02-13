import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import Station from "@/lib/models/Station";
import User from "@/lib/models/User";

async function verifyAdmin(userId: string) {
  await dbConnect();
  const user = await User.findOne({ clerkId: userId });
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) return null;
  return user;
}

/**
 * PATCH /api/admin/stations/[id]/ports
 * Toggle the status of a specific charging port.
 * Body: { portId: string, status: "available" | "occupied" | "maintenance" | "reserved" }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyAdmin(userId);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Verify station access
    const station = await Station.findById(id);
    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    if (user.role !== "superadmin" && station.adminId !== userId) {
      return NextResponse.json(
        { error: "You can only manage your own stations" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { portId, status } = body;

    if (!portId || !status) {
      return NextResponse.json(
        { error: "portId and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["available", "occupied", "maintenance", "reserved"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Find the port by _id or portNumber
    const port = station.chargingPorts.find(
      (p: { _id?: { toString(): string }; portNumber?: string }) =>
        p._id?.toString() === portId || p.portNumber === portId
    );

    if (!port) {
      return NextResponse.json({ error: "Port not found" }, { status: 404 });
    }

    // Update port status
    port.status = status;
    // Clear booking reference if marking as available
    if (status === "available") {
      port.currentBookingId = undefined;
    }

    await station.save();

    return NextResponse.json({ station: station.toObject() }, { status: 200 });
  } catch (error) {
    console.error("Error updating port status:", error);
    return NextResponse.json(
      { error: "Failed to update port status" },
      { status: 500 }
    );
  }
}
