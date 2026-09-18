import { jsonOk } from "@/lib/http";
import { openApiSpec } from "@/lib/openapi";

export async function GET() {
  return jsonOk(openApiSpec);
}
