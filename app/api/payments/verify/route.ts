import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import Booking from "@/lib/models/Booking";
import Station from "@/lib/models/Station";
import { khaltiLookup } from "@/lib/khalti";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { pidx, bookingId } = body;

    if (!pidx || !bookingId) {
      return NextResponse.json(
        { error: "pidx and bookingId are required" },
        { status: 400 }
      );
    }

    if (!process.env.KHALTI_SECRET_KEY) {
      return NextResponse.json(
        { error: "Payment gateway is not configured." },
        { status: 503 }
      );
    }

    // Lookup payment status from Khalti
    const lookup = await khaltiLookup(pidx);

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Ensure the booking belongs to this user
    if (booking.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Skip if booking is already confirmed/active/completed
    if (["confirmed", "active", "completed"].includes(booking.status)) {
      return NextResponse.json(
        { verified: true, status: "Completed", booking },
        { status: 200 }
      );
    }

    if (lookup.status === "Completed") {
      // Payment successful — confirm the booking
      booking.status = "confirmed";
      await booking.save();

      // Reserve the port
      const isOid = /^[a-f\d]{24}$/i.test(String(booking.portId));
      const portFilter = isOid
        ? { "chargingPorts._id": booking.portId }
        : { "chargingPorts.portNumber": booking.portId };
      await Station.updateOne(
        { _id: booking.stationId, ...portFilter },
        {
          $set: {
            "chargingPorts.$.status": "reserved",
            "chargingPorts.$.currentBookingId": booking._id,
          },
        }
      );

      return NextResponse.json(
        { verified: true, status: "Completed", booking },
        { status: 200 }
      );
    }

    if (
      lookup.status === "User canceled" ||
      lookup.status === "Expired"
    ) {
      // Payment failed — cancel the booking
      booking.status = "cancelled";
      await booking.save();

      return NextResponse.json(
        { verified: false, status: lookup.status },
        { status: 200 }
      );
    }

    if (
      lookup.status === "Refunded" || lookup.status === "Partially refunded"
    ) {
      booking.status = "cancelled";
      await booking.save();

      return NextResponse.json(
        { verified: false, status: lookup.status },
        { status: 200 }
      );
    }

    // Pending / Initiated — still processing
    return NextResponse.json(
      { verified: false, status: lookup.status },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error verifying Khalti payment:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
