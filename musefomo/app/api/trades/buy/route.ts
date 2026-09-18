import { handleBuy } from "@/lib/api";

export async function POST(request: Request) {
  return handleBuy(request);
}
