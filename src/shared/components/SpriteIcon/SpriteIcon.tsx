type SpriteIconProps = Readonly<{
  className?: string
  symbolId: string
}>

export function SpriteIcon({ className, symbolId }: SpriteIconProps) {
  return (
    <svg className={className} aria-hidden="true" focusable="false">
      <use href={`/icons.svg#${symbolId}`} />
    </svg>
  )
}
