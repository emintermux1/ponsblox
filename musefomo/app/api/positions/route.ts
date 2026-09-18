import { handlePositions } from "@/lib/api";

export async function GET(request: Request) {
  return handlePositions(request);
}
