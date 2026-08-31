import { createContext } from 'react'

import type { ConversationStoreApi } from '../model/conversationStore'

export const ConversationStoreContext = createContext<ConversationStoreApi | null>(null)
