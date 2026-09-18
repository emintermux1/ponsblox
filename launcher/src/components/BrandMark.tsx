import { BRAND } from '../lib/brand.ts'
import { COPY } from '../lib/copy.ts'

export function BrandMark() {
  return (
    <>
      <img className="brand-otter" src={BRAND.sit} alt="" width={32} height={28} />
      {COPY.name}
    </>
  )
}
