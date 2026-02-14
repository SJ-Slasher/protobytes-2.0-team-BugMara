import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import Booking from "@/lib/models/Booking";
import Station from "@/lib/models/Station";
import User from "@/lib/models/User";
import mongoose from "mongoose";

/**
 * POST /api/admin/walk-in
 * Start or stop a walk-in session.
 *   body: { action: "start", stationId, portId }           → creates active session
 *   body: { action: "stop", bookingId }                     → completes the session
 *   body: { action: "log", stationId, portId, ... }         → legacy: full manual log
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ clerkId: userId });
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action || "log";

    // ── START a walk-in session ──
    if (action === "start") {
      const { stationId, portId } = body;
      if (!stationId || !portId) {
        return NextResponse.json(
          { error: "Station and port are required" },
          { status: 400 }
        );
      }

      // Convert to ObjectId if valid, keep as string otherwise
      const stationObjId = mongoose.Types.ObjectId.isValid(stationId)
        ? new mongoose.Types.ObjectId(stationId)
        : null;
      const portObjId = mongoose.Types.ObjectId.isValid(portId)
        ? new mongoose.Types.ObjectId(portId)
        : null;

      // Verify station exists in DB
      const station = stationObjId
        ? await Station.findById(stationObjId)
        : null;

      if (!station) {
        console.error("Walk-in start: station not found", { stationId });
        return NextResponse.json(
          { error: "Station not found in database" },
          { status: 404 }
        );
      }

      // Verify ownership for regular admins
      if (user.role === "admin" && station.adminId !== userId) {
        console.error("Walk-in start: not authorized", {
          stationAdminId: station.adminId,
          userId,
        });
        return NextResponse.json(
          { error: "Not authorized for this station" },
          { status: 403 }
        );
      }

      // Check no active walk-in already on this port (match both ObjectId and string)
      const portMatches = portObjId ? [portObjId, portId] : [portId];
      const stationMatches = stationObjId ? [stationObjId, stationId] : [stationId];
      const existing = await Booking.findOne({
        stationId: { $in: stationMatches },
        portId: { $in: portMatches },
        source: { $in: ["walk-in-manual", "walk-in-qr"] },
        status: "active",
      });
      if (existing) {
        return NextResponse.json(
          { error: "This port already has an active walk-in session" },
          { status: 409 }
        );
      }

      const now = new Date();
      const booking = await Booking.create({
        userId: `walk-in-${Date.now()}`,
        userName: "Walk-in",
        userEmail: "",
        stationId: stationObjId || stationId,
        portId: portObjId || portId,
        startTime: now,
        endTime: new Date(now.getTime() + 3600000), // placeholder 1h
        estimatedDuration: 60,
        status: "active",
        source: "walk-in-manual",
        amountPaid: 0,
        paymentMethod: "cash",
        customerName: "Walk-in",
        customerPhone: "",
        vehicleNumber: "",
        vehicleType: "",
        notes: "",
      });

      // Mark port occupied (non-blocking — don't fail if this doesn't match)
      try {
        if (portObjId) {
          await Station.updateOne(
            { _id: stationObjId, "chargingPorts._id": portObjId },
            { $set: { "chargingPorts.$.status": "occupied" } }
          );
        }
      } catch (e) {
        console.warn("Walk-in: failed to update port status", e);
      }

      return NextResponse.json(
        { booking, message: "Walk-in session started" },
        { status: 201 }
      );
    }

    // ── STOP a walk-in session ──
    if (action === "stop") {
      const { bookingId } = body;
      if (!bookingId) {
        return NextResponse.json(
          { error: "Booking ID is required" },
          { status: 400 }
        );
      }

      const booking = await Booking.findById(bookingId);
      if (!booking || booking.status !== "active") {
        return NextResponse.json(
          { error: "Active walk-in session not found" },
          { status: 404 }
        );
      }

      // Verify ownership for regular admins
      if (user.role === "admin") {
        const stObjId = mongoose.Types.ObjectId.isValid(String(booking.stationId))
          ? new mongoose.Types.ObjectId(String(booking.stationId))
          : null;
        const station = stObjId ? await Station.findById(stObjId) : null;
        if (!station || station.adminId !== userId) {
          return NextResponse.json(
            { error: "Not authorized" },
            { status: 403 }
          );
        }
      }

      const now = new Date();
      const durationMs = now.getTime() - new Date(booking.startTime).getTime();
      const durationMins = Math.max(1, Math.round(durationMs / 60000));

      // Calculate amount from station pricing
      const stObjId = mongoose.Types.ObjectId.isValid(String(booking.stationId))
        ? new mongoose.Types.ObjectId(String(booking.stationId))
        : null;
      const station = stObjId ? await Station.findById(stObjId) : null;
      const perHour = station?.pricing?.perHour || 200;
      const amount = Math.round((durationMs / 3600000) * perHour);

      booking.endTime = now;
      booking.estimatedDuration = durationMins;
      booking.amountPaid = amount;
      booking.status = "completed";
      await booking.save();

      // Free the port (non-blocking)
      try {
        const portObjId = mongoose.Types.ObjectId.isValid(String(booking.portId))
          ? new mongoose.Types.ObjectId(String(booking.portId))
          : null;
        if (stObjId && portObjId) {
          await Station.updateOne(
            { _id: stObjId, "chargingPorts._id": portObjId },
            { $set: { "chargingPorts.$.status": "available" } }
          );
        }
      } catch (e) {
        console.warn("Walk-in stop: failed to free port", e);
      }

      return NextResponse.json(
        { booking, amount, durationMins, message: "Walk-in session completed" },
        { status: 200 }
      );
    }

    // ── LEGACY: full manual log (keeps backward compat) ──
    const {
      stationId,
      portId,
      customerName,
      customerPhone,
      vehicleNumber,
      vehicleType,
      startTime,
      endTime,
      amountPaid,
      paymentMethod,
      notes,
    } = body;

    if (!stationId || !portId || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Station, port, start and end time are required" },
        { status: 400 }
      );
    }

    if (user.role === "admin") {
      const station = await Station.findById(stationId);
      if (!station || station.adminId !== userId) {
        return NextResponse.json(
          { error: "Station not found or not authorized" },
          { status: 403 }
        );
      }
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const estimatedDuration = Math.max(1, Math.round(durationMs / 60000));

    const booking = await Booking.create({
      userId: `walk-in-${Date.now()}`,
      userName: customerName || "Walk-in",
      userEmail: "",
      stationId,
      portId,
      startTime: start,
      endTime: end,
      estimatedDuration,
      status: "completed",
      source: "walk-in-manual",
      amountPaid: amountPaid || 0,
      paymentMethod: paymentMethod || "cash",
      customerName: customerName || "Walk-in",
      customerPhone: customerPhone || "",
      vehicleNumber: vehicleNumber || "",
      vehicleType: vehicleType || "",
      notes: notes || "",
    });

    return NextResponse.json(
      { booking, message: "Walk-in session logged successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in walk-in:", error);
    return NextResponse.json(
      { error: "Failed to process walk-in session" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/walk-in
 * List walk-in sessions for admin's stations.
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ clerkId: userId });
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const filter: Record<string, unknown> = {
      source: { $in: ["walk-in-manual", "walk-in-qr"] },
    };

    if (user.role === "admin") {
      const adminStations = await Station.find({ adminId: userId }).select("_id").lean();
      const stationIds = adminStations.map((s) => s._id);
      const stationIdStrings = stationIds.map((id) => String(id));
      filter.stationId = { $in: [...stationIds, ...stationIdStrings] };
    }

    const walkins = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Normalize IDs to strings for consistent frontend matching
    const normalized = walkins.map((w) => ({
      ...w,
      _id: String(w._id),
      stationId: String(w.stationId),
      portId: String(w.portId),
    }));

    return NextResponse.json({ walkins: normalized }, { status: 200 });
  } catch (error) {
    console.error("Error fetching walk-ins:", error);
    return NextResponse.json(
      { error: "Failed to fetch walk-in sessions" },
      { status: 500 }
    );
  }
}
