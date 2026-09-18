import { handleMe } from "@/lib/api";

export async function GET(request: Request) {
  return handleMe(request);
}
