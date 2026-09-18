import { handleRegister } from "@/lib/api";

export async function POST(request: Request) {
  return handleRegister(request);
}
