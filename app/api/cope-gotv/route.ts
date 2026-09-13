import { copeGotvForm } from "@/lib/forms/cope-gotv";
import { handleFormSubmission } from "@/lib/submit-pipeline";

// Buffer (Mailgun basic auth) requires the Node runtime, not Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleFormSubmission(request, copeGotvForm);
}
