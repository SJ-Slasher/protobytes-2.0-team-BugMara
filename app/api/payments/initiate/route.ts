import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import Station from "@/lib/models/Station";
import User from "@/lib/models/User";
import Booking from "@/lib/models/Booking";
import { khaltiInitiate } from "@/lib/khalti";
import { loadStationFromFile } from "@/lib/stations";
import { calculateETA } from "@/lib/eta";
import QRCode from "qrcode";
import type { IStationDocument } from "@/lib/models/Station";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Try DB first, fall back to Clerk user data if DB User not found
    let user = await User.findOne({ clerkId: userId });
    if (!user) {
      const clerkUser = await currentUser();
      if (!clerkUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      // Auto-create user document
      user = await User.create({
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User",
        role: "user",
        favoriteStations: [],
      });
    }

    const body = await req.json();
    const { stationId, portId, startTime, estimatedDuration, userLocation } = body;

    if (!stationId || !portId || !startTime || !estimatedDuration) {
      return NextResponse.json(
        { error: "stationId, portId, startTime, and estimatedDuration are required" },
        { status: 400 }
      );
    }

    // Fail fast if Khalti is not configured
    if (!process.env.KHALTI_SECRET_KEY) {
      return NextResponse.json(
        { error: "Payment gateway is not configured. Please contact the administrator." },
        { status: 503 }
      );
    }

    const isFileBased = stationId.startsWith("station-");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let station: any = null;

    if (isFileBased) {
      station = loadStationFromFile(stationId);
    } else {
      station = await Station.findById(stationId);
    }

    if (!station) {
      return NextResponse.json(
        { error: "Station not found" },
        { status: 404 }
      );
    }

    const port = station.chargingPorts?.find(
      (p: any) => String(p._id || p.portNumber) === portId
    );
    if (!port) {
      return NextResponse.json({ error: "Port not found" }, { status: 404 });
    }

    // Normalize portId to the canonical _id so overlap checks are consistent
    const canonicalPortId = String(port._id || port.portNumber || portId);

    const perHourNPR = station.pricing?.perHour ?? 200;
    const durationMinutes = Number(estimatedDuration);
    const totalAmountNPR = Math.round(perHourNPR * (durationMinutes / 60));
    const totalAmountPaisa = Math.round(totalAmountNPR * 100);

    // Create a pending booking first so we have a bookingId for the return URL
    // Use transactions to prevent race conditions on concurrent booking requests
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    let booking;
    try {
      // Check for overlapping bookings within the transaction
      const overlapping = await Booking.findOne({
        stationId,
        portId: canonicalPortId,
        status: { $in: ["pending", "confirmed", "active"] },
        $or: [{ startTime: { $lt: end }, endTime: { $gt: start } }],
      }).session(session);

      if (overlapping) {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json(
          { error: "Time slot is not available for this port" },
          { status: 409 }
        );
      }

      // Create booking within transaction
      booking = await Booking.create(
        [
          {
            userId,
            userName: user.name,
            userEmail: user.email,
            stationId,
            portId: canonicalPortId,
            startTime: start,
            estimatedDuration: durationMinutes,
            endTime: end,
            status: "pending",
          },
        ],
        { session }
      );
      booking = booking[0]; // Create returns array when using session

      await session.commitTransaction();
    } catch (transactionError) {
      await session.abortTransaction();
      throw transactionError;
    } finally {
      session.endSession();
    }

    // Calculate ETA if user location is provided
    if (userLocation?.lat && userLocation?.lng) {
      const stationCoords = station.location?.coordinates;
      if (stationCoords?.lat && stationCoords?.lng) {
        const eta = await calculateETA(userLocation, stationCoords);
        if (eta) {
          booking.userLocation = userLocation;
          booking.eta = eta;
        }
      }
    }

    // Generate QR code
    const qrData = JSON.stringify({
      bookingId: booking._id,
      stationId,
      portId: canonicalPortId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });
    booking.qrCode = await QRCode.toDataURL(qrData);

    // Build return URL from environment variable only (never trust Origin header)
    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const returnUrl = `${origin}/booking/confirmation/${booking._id}`;
    const websiteUrl = origin;

    // Initiate Khalti payment
    const khaltiRes = await khaltiInitiate({
      return_url: returnUrl,
      website_url: websiteUrl,
      amount: totalAmountPaisa,
      purchase_order_id: String(booking._id),
      purchase_order_name: `Charging – ${(station as any).name}`,
      customer_info: {
        name: user.name,
        email: user.email,
        phone: user.phone || undefined,
      },
      merchant_booking_id: String(booking._id),
      merchant_station_id: stationId,
      merchant_port_id: portId,
      merchant_start_time: startTime,
      merchant_estimated_duration: String(estimatedDuration),
    });

    // Save Khalti payment reference
    booking.khaltiPidx = khaltiRes.pidx;
    booking.amountPaid = totalAmountNPR;
    await booking.save();

    return NextResponse.json(
      {
        bookingId: booking._id,
        payment_url: khaltiRes.payment_url,
        pidx: khaltiRes.pidx,
        amount: totalAmountNPR,
        currency: "NPR",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error initiating Khalti payment:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
