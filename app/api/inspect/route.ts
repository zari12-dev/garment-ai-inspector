
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from "@/lib/supabase-admin";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const BUCKET_NAME = "garment-images";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const PROMPT = `
You are an expert garment quality inspection assistant.

Carefully inspect the uploaded garment or fabric image.

Analyze the following:

1. Overall garment condition.
2. Visible defects, such as stains, holes, tears, loose threads,
   stitching problems, fabric damage, discoloration, wrinkles,
   or other visible issues.
3. Location of each visible defect.
4. Severity of each defect: Minor, Moderate, or Major.
5. Quality assessment.
6. Recommended corrective actions.

Important rules:
- Only report defects that are actually visible in the image.
- Do not invent defects or claim something is defective if it cannot be seen.
- If no visible defect is found, clearly say so.
- If the image is unclear, mention that limitation.
- Do not make a final factory approval or rejection decision.
  A human inspector must make the final decision.

Use clear headings and bullet points.
Be detailed but easy to understand.
`;

export async function POST(request: NextRequest) {
  let uploadedImagePath: string | null = null;

  try {
    // 1. Verify logged-in user.
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

    // 2. Validate uploaded image.
    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please upload a garment image." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, and WEBP images are supported." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image size must not exceed 4 MB." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured on the server." },
        { status: 500 }
      );
    }

    // 3. Read image into a buffer.
    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const base64Image = imageBuffer.toString("base64");

    // 4. Generate a unique image path.
    const safeFileName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-100);

    const imagePath =
      `${user.id}/${crypto.randomUUID()}-${safeFileName}`;

    // 5. Upload original image to private Supabase Storage.
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(imagePath, imageBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase image upload error:", uploadError);

      return NextResponse.json(
        {
          error:
            "Image could not be saved in Supabase Storage. Please check your bucket configuration.",
        },
        { status: 500 }
      );
    }

    uploadedImagePath = imagePath;

    // 6. Send image to Gemini for analysis.
    const ai = new GoogleGenAI({ apiKey });

    const result = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          inlineData: {
            mimeType: file.type,
            data: base64Image,
          },
        },
        {
          text: PROMPT,
        },
      ],
    });

    const analysis = result.text?.trim();

    if (!analysis) {
      // Remove uploaded image if Gemini returns no analysis.
      await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .remove([imagePath]);

      uploadedImagePath = null;

      return NextResponse.json(
        {
          error: "Gemini did not return an analysis. Please try again.",
        },
        { status: 502 }
      );
    }

    // 7. Save analysis and image path in Supabase database.
    const { data: savedInspection, error: databaseError } =
      await supabaseAdmin
        .from("inspections")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_size: file.size,
          image_path: imagePath,
          analysis,
          status: "Pending",
          review_comment: null,
        })
        .select(
          "id, file_name, file_size, image_path, analysis, status, review_comment, created_at"
        )
        .single();

    if (databaseError) {
      console.error("Supabase insert error:", databaseError);

      // Remove uploaded image if database insertion fails.
      const { error: cleanupError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .remove([imagePath]);

      if (cleanupError) {
        console.error("Image cleanup error:", cleanupError);
      }

      uploadedImagePath = null;

      return NextResponse.json(
        {
          error:
            "Gemini analysis completed, but saving the result failed. Please check your Supabase table.",
          analysis,
        },
        { status: 500 }
      );
    }

    // 8. Return saved inspection.
    uploadedImagePath = null;

    return NextResponse.json({
      success: true,
      message: "Garment analysis completed successfully.",
      inspection: savedInspection,
    });

  } catch (error) {
    console.error("Inspection API error:", error);

    // Cleanup image if an unexpected error occurs.
    if (uploadedImagePath) {
      const { error: cleanupError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .remove([uploadedImagePath]);

      if (cleanupError) {
        console.error("Image cleanup error:", cleanupError);
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred during inspection.",
      },
      { status: 500 }
    );
  }
}
