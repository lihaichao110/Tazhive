export type ResourceIcon =
  Readonly<{ kind: 'image'; source: string }> | Readonly<{ kind: 'sprite'; symbolId: string }>

export type ResourceItem = Readonly<{
  href: string
  icon: ResourceIcon
  label: string
}>

export type ResourceGroup = Readonly<{
  description: string
  iconSymbolId: string
  id: string
  items: readonly ResourceItem[]
  title: string
}>
