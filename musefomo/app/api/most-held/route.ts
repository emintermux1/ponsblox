import { handleMostHeld } from "@/lib/api";

export async function GET() {
  return handleMostHeld();
}
