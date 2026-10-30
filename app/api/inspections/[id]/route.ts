import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ALLOWED_STATUSES = ["Approved", "Rejected", "Needs Review"] as const;
const MAX_COMMENT_LENGTH = 1000;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required. Please log in again." },
        { status: 401 }
      );
    }

    const accessToken = authorization.substring(7);

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Your session is invalid. Please log in again." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const inspectionId = Number(id);

    if (!Number.isInteger(inspectionId) || inspectionId <= 0) {
      return NextResponse.json(
        { error: "Invalid inspection ID." },
        { status: 400 }
      );
    }

    let body: { status?: unknown; review_comment?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const status = body.status;

    if (
      typeof status !== "string" ||
      !(ALLOWED_STATUSES as readonly string[]).includes(status)
    ) {
      return NextResponse.json(
        { error: "Status must be Approved, Rejected, or Needs Review." },
        { status: 400 }
      );
    }

    const rawComment =
      typeof body.review_comment === "string" ? body.review_comment.trim() : "";

    if (rawComment.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        {
          error: `Review comment must not exceed ${MAX_COMMENT_LENGTH} characters.`,
        },
        { status: 400 }
      );
    }

    const { data: updatedInspection, error: updateError } = await supabaseAdmin
      .from("inspections")
      .update({
        status,
        review_comment: rawComment || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", inspectionId)
      .eq("user_id", user.id)
      .select(
        "id, file_name, file_size, image_path, analysis, status, review_comment, created_at, reviewed_at"
      )
      .maybeSingle();

    if (updateError) {
      console.error("Supabase review update error:", updateError);

      return NextResponse.json(
        { error: "Could not save the review decision. Please try again." },
        { status: 500 }
      );
    }

    if (!updatedInspection) {
      return NextResponse.json(
        { error: "Inspection not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Inspection marked as ${status}.`,
      inspection: updatedInspection,
    });
  } catch (error) {
    console.error("Inspection review API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while saving the review." },
      { status: 500 }
    );
  }
}
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(authorization.substring(7));

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired session." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const inspectionId = Number(id);

    if (!Number.isInteger(inspectionId) || inspectionId <= 0) {
      return NextResponse.json(
        { error: "Invalid inspection ID." },
        { status: 400 }
      );
    }

    const { data: inspection } = await supabaseAdmin
      .from("inspections")
      .select("id, image_path")
      .eq("id", inspectionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!inspection) {
      return NextResponse.json(
        { error: "Inspection not found." },
        { status: 404 }
      );
    }

    if (!inspection.image_path) {
      return NextResponse.json(
        { error: "No image is saved for this inspection." },
        { status: 404 }
      );
    }

    const { data: signedImage, error: imageError } = await supabaseAdmin.storage
      .from("garment-images")
      .createSignedUrl(inspection.image_path, 300);

    if (imageError || !signedImage) {
      console.error("Signed URL error:", imageError);

      return NextResponse.json(
        { error: "Unable to retrieve garment image from storage." },
        { status: 500 }
      );
    }

    return NextResponse.json({ imageUrl: signedImage.signedUrl });
  } catch (error) {
    console.error("Image retrieval error:", error);

    return NextResponse.json(
      { error: "Something went wrong while retrieving the image." },
      { status: 500 }
    );
  }
}