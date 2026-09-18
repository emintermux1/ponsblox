import { handleDirectory } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 8;

export async function GET() {
  return handleDirectory();
}
