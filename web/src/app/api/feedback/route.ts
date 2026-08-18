import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/feedback
 *
 * Basic in-app user feedback collection (Level 4 requirement). Anyone
 * using the app — connected wallet or not — can leave a 1-5 rating plus
 * an optional message. No GET route is exposed here on purpose: this
 * table isn't meant to be publicly readable, so review submissions from
 * the Supabase dashboard's Table Editor instead (Table Editor -> feedback).
 *
 * Body: { rating: number (1-5), message?: string, role?: "agent" | "business" | "other", publicKey?: string, page?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rating, message, role, publicKey, page } = body as {
      rating?: number;
      message?: string;
      role?: string;
      publicKey?: string;
      page?: string;
    };

    if (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json({ error: "Rating must be an integer from 1 to 5." }, { status: 400 });
    }

    const trimmedMessage = typeof message === "string" ? message.trim() : "";

    const { error } = await supabase.from("feedback").insert({
      rating,
      message: trimmedMessage || null,
      role: role === "agent" || role === "business" ? role : "other",
      public_key: typeof publicKey === "string" && publicKey.length > 0 ? publicKey : null,
      page: typeof page === "string" ? page.slice(0, 200) : null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/feedback failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error submitting feedback." },
      { status: 500 }
    );
  }
}