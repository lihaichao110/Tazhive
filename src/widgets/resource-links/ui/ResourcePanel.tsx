import type { ResourceGroup } from '../model/types'
import { ResourceIcon } from './ResourceIcon'
import styles from './ResourcePanel.module.css'

import { SpriteIcon } from '@/shared/components/SpriteIcon'

type ResourcePanelProps = Readonly<{
  group: ResourceGroup
}>

export function ResourcePanel({ group }: ResourcePanelProps) {
  return (
    <article className={styles.panel}>
      <SpriteIcon className={styles.headingIcon} symbolId={group.iconSymbolId} />
      <h2>{group.title}</h2>
      <p>{group.description}</p>

      <ul className={styles.list}>
        {group.items.map((item) => (
          <li key={item.href}>
            <a href={item.href} target="_blank" rel="noreferrer">
              <span className={styles.itemIcon} aria-hidden="true">
                <ResourceIcon icon={item.icon} />
              </span>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </article>
  )
}
