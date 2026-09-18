import { handleHeliusWebhook } from "@/lib/api";

export async function POST(request: Request) {
  return handleHeliusWebhook(request);
}
