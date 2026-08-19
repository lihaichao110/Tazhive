import type { ResourceIcon as ResourceIconModel } from '../model/types'

import { SpriteIcon } from '@/shared/components/SpriteIcon'

type ResourceIconProps = Readonly<{
  icon: ResourceIconModel
}>

export function ResourceIcon({ icon }: ResourceIconProps) {
  if (icon.kind === 'image') {
    return <img src={icon.source} alt="" />
  }

  return <SpriteIcon symbolId={icon.symbolId} />
}
