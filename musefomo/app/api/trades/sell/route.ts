import { handleSell } from "@/lib/api";

export async function POST(request: Request) {
  return handleSell(request);
}
