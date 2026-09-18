import { handlePortfolio } from "@/lib/api";

export async function GET(request: Request) {
  return handlePortfolio(request);
}
