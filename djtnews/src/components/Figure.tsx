export function Figure({
  src,
  alt,
  caption,
  credit,
  crop,
}: {
  src: string
  alt: string
  caption: string
  credit?: string
  crop?: 'wide' | 'tight'
}) {
  return (
    <figure className={crop === 'tight' ? 'figure figure-tight' : 'figure'}>
      <img src={src} alt={alt} />
      <figcaption>
        {caption}
        {credit ? <span className="credit"> {credit}</span> : null}
      </figcaption>
    </figure>
  )
}
