import { handleHumanOrder } from "@/lib/api";

export async function POST(request: Request) {
  return handleHumanOrder(request, "buy");
}
