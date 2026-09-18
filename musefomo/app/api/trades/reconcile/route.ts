import { handleTradeReconcile } from "@/lib/api";

export async function POST(request: Request) {
  return handleTradeReconcile(request);
}
