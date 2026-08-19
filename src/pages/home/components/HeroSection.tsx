import { CounterButton } from '@/features/counter'
import { heroImage, reactLogo, viteLogo } from '@/shared/assets'

import styles from './HeroSection.module.css'

export function HeroSection() {
  return (
    <section className={styles.section} aria-labelledby="home-title">
      <div className={styles.hero} aria-hidden="true">
        <img src={heroImage} className={styles.base} width="170" height="179" alt="" />
        <img src={reactLogo} className={styles.framework} alt="" />
        <img src={viteLogo} className={styles.vite} alt="" />
      </div>

      <div>
        <h1 id="home-title">Get started</h1>
        <p>
          Edit <code>src/app/App.tsx</code> and save to test <code>HMR</code>
        </p>
      </div>

      <CounterButton />
    </section>
  )
}
