import { handleTrending } from "@/lib/api";

export async function GET() {
  return handleTrending();
}
