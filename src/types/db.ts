export type CropType = {
  id: string
  name_en: string | null
  name_km: string | null
  default_unit: string | null
  category: string | null
}

export type Zone = {
  id: string
  name: string
  area_ha: number | null
  crop_type_id: string | null
  crop_type?: CropType | null
  planting_density: number | null
  tree_count: number | null
  avg_tree_age_years: number | null
  variety: string | null
  boundary?: [number, number][] | null
}
