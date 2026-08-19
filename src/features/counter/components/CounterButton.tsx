import { useCounter } from '../hooks/useCounter'
import styles from './CounterButton.module.css'

export function CounterButton() {
  const { count, increment } = useCounter()

  return (
    <button type="button" className={styles.button} onClick={increment}>
      Count is {count}
    </button>
  )
}
