import { useState } from 'react'

type UseCounterResult = Readonly<{
  count: number
  increment: () => void
}>

export function useCounter(initialCount = 0): UseCounterResult {
  const [count, setCount] = useState(initialCount)

  function increment() {
    setCount((currentCount) => currentCount + 1)
  }

  return { count, increment }
}
