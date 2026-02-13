import { NextResponse } from "next/server";

// DEPRECATED: Stripe payment intent creation is no longer in use.
// The payment system has been consolidated to use Khalti exclusively.
// Use POST /api/payments/initiate instead.

export async function POST(req: Request) {
  return NextResponse.json(
    {
      error: "Stripe payment integration is deprecated. Use POST /api/payments/initiate for Khalti payments instead.",
    },
    { status: 410 }
  );
}
