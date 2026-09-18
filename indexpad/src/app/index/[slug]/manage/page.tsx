import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ManageIndexPage({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/index/${slug}`);
}
