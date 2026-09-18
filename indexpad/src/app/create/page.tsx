import type { Metadata } from "next";
import { IndexBuilder } from "@/components/index-builder";

export const metadata: Metadata = {
  title: "Create Index",
  description: "Compose a weighted basket from the Pons ecosystem, then print it live.",
};

export default function CreatePage() {
  return <IndexBuilder />;
}
