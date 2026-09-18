import { TokenView } from '@/components/TokenView'

export default async function TokenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TokenView id={id} />
}
