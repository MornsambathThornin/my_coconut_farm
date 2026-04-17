import {
  TreePalm,
  Apple,
  Sprout,
  Wheat,
  Carrot,
  Leaf,
  type LucideIcon,
} from 'lucide-react'

export type CropCategory = 'tree' | 'fruit' | 'root' | 'cereal' | 'other' | null | undefined

type CropIconInfo = {
  emoji: string
  Icon: LucideIcon
  accentClass: string
}

const mapping: Record<Exclude<CropCategory, null | undefined>, CropIconInfo> = {
  tree: { emoji: '🌴', Icon: TreePalm, accentClass: 'text-green-600' },
  fruit: { emoji: '🍌', Icon: Apple, accentClass: 'text-amber-600' },
  root: { emoji: '🥔', Icon: Carrot, accentClass: 'text-orange-600' },
  cereal: { emoji: '🌾', Icon: Wheat, accentClass: 'text-yellow-600' },
  other: { emoji: '🌱', Icon: Leaf, accentClass: 'text-emerald-600' },
}

const fallback: CropIconInfo = {
  emoji: '🌱',
  Icon: Sprout,
  accentClass: 'text-slate-500',
}

export function getCropIcon(category: CropCategory): CropIconInfo {
  if (!category) return fallback
  return mapping[category as Exclude<CropCategory, null | undefined>] ?? fallback
}
