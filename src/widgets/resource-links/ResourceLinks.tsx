import { RESOURCE_GROUPS } from './model/resourceGroups'
import { ResourcePanel } from './ui/ResourcePanel'
import styles from './ResourceLinks.module.css'

export function ResourceLinks() {
  return (
    <section className={styles.section} aria-label="后续资源">
      {RESOURCE_GROUPS.map((group) => (
        <ResourcePanel key={group.id} group={group} />
      ))}
    </section>
  )
}
