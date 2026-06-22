import { NextResponse } from "next/server";

/**
 * Payment provider webhook ingress (route shell).
 *
 * This route is intentionally no-op until provider signature verification
 * and provider expansion migrations are added.
 */
export async function POST(request: Request) {
  // Preserve raw body for future signature verification.
  await request.text();

  return NextResponse.json({ received: true, processed: false });
}
