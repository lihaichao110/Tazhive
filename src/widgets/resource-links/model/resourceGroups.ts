import { reactLogo, viteLogo } from '@/shared/assets'

import type { ResourceGroup } from './types'

export const RESOURCE_GROUPS: readonly ResourceGroup[] = [
  {
    id: 'documentation',
    title: 'Documentation',
    description: 'Your questions, answered',
    iconSymbolId: 'documentation-icon',
    items: [
      {
        href: 'https://vite.dev/',
        label: 'Explore Vite',
        icon: { kind: 'image', source: viteLogo },
      },
      {
        href: 'https://react.dev/',
        label: 'Learn more',
        icon: { kind: 'image', source: reactLogo },
      },
    ],
  },
  {
    id: 'social',
    title: 'Connect with us',
    description: 'Join the Vite community',
    iconSymbolId: 'social-icon',
    items: [
      {
        href: 'https://github.com/vitejs/vite',
        label: 'GitHub',
        icon: { kind: 'sprite', symbolId: 'github-icon' },
      },
      {
        href: 'https://chat.vite.dev/',
        label: 'Discord',
        icon: { kind: 'sprite', symbolId: 'discord-icon' },
      },
      {
        href: 'https://x.com/vite_js',
        label: 'X.com',
        icon: { kind: 'sprite', symbolId: 'x-icon' },
      },
      {
        href: 'https://bsky.app/profile/vite.dev',
        label: 'Bluesky',
        icon: { kind: 'sprite', symbolId: 'bluesky-icon' },
      },
    ],
  },
]
