import { createContext } from 'react'

export type DynamicCardReadyHandler = (surfaceId: string, element: HTMLElement) => void

export const DynamicCardHostContext = createContext<DynamicCardReadyHandler | null>(null)
