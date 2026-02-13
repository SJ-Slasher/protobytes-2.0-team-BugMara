import { NextResponse } from "next/server";

// DEPRECATED: Stripe webhook is no longer in use.
// The payment system has been consolidated to use Khalti exclusively.
// Khalti payments are verified via POST /api/payments/verify

export async function POST(req: Request) {
  return NextResponse.json(
    {
      error: "Stripe webhook is deprecated. Payment system has been consolidated to Khalti. See /api/payments/verify",
    },
    { status: 410 }
  );
}
