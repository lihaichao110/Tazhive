import { HeroSection } from './components/HeroSection'
import styles from './HomePage.module.scss'

import { ResourceLinks } from '@/widgets/resource-links'

export function HomePage() {
  return (
    <main className={styles.page}>
      <HeroSection />
      <div className={styles.ticks} aria-hidden="true" />
      <ResourceLinks />
      <div className={styles.ticks} aria-hidden="true" />
      <div className={styles.spacer} aria-hidden="true" />
    </main>
  )
}
