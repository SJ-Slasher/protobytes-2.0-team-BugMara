import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Booking from "@/lib/models/Booking";
import Station from "@/lib/models/Station";

/**
 * POST /api/walk-in/checkin
 * Public endpoint — walk-in customer self-registers by scanning port QR.
 * No auth required.
 */
export async function POST(req: Request) {
  try {
    await dbConnect();

    const body = await req.json();
    const {
      stationId,
      portId,
      customerName,
      customerPhone,
      vehicleNumber,
      vehicleType,
      estimatedDuration,
    } = body;

    if (!stationId || !portId) {
      return NextResponse.json(
        { error: "Station and port are required" },
        { status: 400 }
      );
    }

    if (!customerName || !customerPhone) {
      return NextResponse.json(
        { error: "Name and phone number are required" },
        { status: 400 }
      );
    }

    // Verify station exists
    const station = await Station.findById(stationId);
    if (!station) {
      return NextResponse.json(
        { error: "Station not found" },
        { status: 404 }
      );
    }

    // Check port exists and is available
    const port = station.chargingPorts.find(
      (p) => String(p._id) === portId || p.portNumber === portId
    );
    if (!port) {
      return NextResponse.json(
        { error: "Port not found" },
        { status: 404 }
      );
    }

    if (port.status !== "available") {
      return NextResponse.json(
        { error: `Port is currently ${port.status}. Please choose another port or wait.` },
        { status: 409 }
      );
    }

    const duration = Math.max(30, Math.min(Number(estimatedDuration) || 60, 480));
    const start = new Date();
    const end = new Date(start.getTime() + duration * 60000);

    // Calculate amount based on station pricing
    const perHour = station.pricing?.perHour ?? 200;
    const amount = Math.round((duration / 60) * perHour);

    const booking = await Booking.create({
      userId: `walk-in-qr-${Date.now()}`,
      userName: customerName,
      userEmail: "",
      stationId: String(station._id),
      portId: String(port._id || port.portNumber),
      startTime: start,
      endTime: end,
      estimatedDuration: duration,
      status: "active",
      source: "walk-in-qr",
      amountPaid: amount,
      paymentMethod: "cash",
      customerName,
      customerPhone,
      vehicleNumber: vehicleNumber || "",
      vehicleType: vehicleType || "",
    });

    // Mark port as occupied
    await Station.updateOne(
      { _id: station._id, "chargingPorts._id": port._id } as Record<string, unknown>,
      {
        $set: {
          "chargingPorts.$.status": "occupied",
          "chargingPorts.$.currentBookingId": booking._id,
        },
      }
    );

    return NextResponse.json(
      {
        booking: {
          _id: booking._id,
          stationName: station.name,
          portNumber: port.portNumber,
          connectorType: port.connectorType,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          estimatedDuration: duration,
          estimatedAmount: amount,
          status: "active",
        },
        message: "Check-in successful! Your charging session has started.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error during walk-in check-in:", error);
    return NextResponse.json(
      { error: "Failed to check in. Please ask station staff for help." },
      { status: 500 }
    );
  }
}
