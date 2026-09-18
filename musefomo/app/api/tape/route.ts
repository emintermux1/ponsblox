import { handleTape } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 8;

export async function GET(request: Request) {
  return handleTape(request);
}
