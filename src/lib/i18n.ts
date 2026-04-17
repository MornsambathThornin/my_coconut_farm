export type Locale = "en" | "km"

export const defaultLocale: Locale = "en"

export const fallbackTranslations: Record<Locale, Record<string, string>> = {
  en: {
    "dashboard.title": "Farm Overview",
    "dashboard.subtitle":
      "Precision agriculture insights for every hectare under management.",
    "dashboard.welcome": "Welcome back",
    "dashboard.metrics.totalArea": "Total area",
    "dashboard.metrics.zones": "Active zones",
    "dashboard.metrics.totalHarvest": "Total yield",
    "dashboard.metrics.yieldPerHa": "Yield per hectare",
    "dashboard.noBoundary": "No farm boundary saved yet.",
    "dashboard.farm.details": "Farm details",
    "dashboard.chart.title": "Farm map",
    "zone.title": "Zone",
    "zone.variety": "Variety",
    "zone.totalArea": "Total area",
    "zone.avgTreeAge": "Avg tree age",
    "zone.efficiency": "Yield per hectare",
    "zone.cropType": "Crop type",
    "zone.tabs.analysis": "Analysis",
    "zone.tabs.harvest": "Harvest",
    "zone.tabs.irrigation": "Irrigation",
    "zone.tabs.batches": "Batches",
    "zone.batch-title": "Planting batches history",
    "zone.batch-action": "New planting batch",
    "reports.title": "Reports overview",
    "reports.subtitle": "Track yield trends, compare zones, export insights.",
    "reports.zonePerformance": "Zone performance",
    "reports.yieldPerHa": "Yield per hectare",
  },
  km: {
    "dashboard.title": "ទិដ្ឋភាពស្រែ",
    "dashboard.subtitle":
      "ចំណេះដឹងកសិកម្មឆ្លាតវៃសម្រាប់គីឡូម៉ែត្រការ​ក្នុងការគ្រប់គ្រង។",
    "dashboard.welcome": "ស្វាគមន៍វិញ",
    "dashboard.metrics.totalArea": "ពោលគីឡូម៉ែត្រសរុប",
    "dashboard.metrics.zones": "តំបន់សកម្ម",
    "dashboard.metrics.totalHarvest": "ផលចំណេញសរុប",
    "dashboard.metrics.yieldPerHa": "ផលចំណេញក្នុងមេត្រការ",
    "dashboard.noBoundary": "មិនទាន់រកឃើញខ្សែសង្វាក់ស្រែទេ។",
    "dashboard.farm.details": "ព័ត៌មានលម្អិតស្រែ",
    "dashboard.chart.title": "ផែនទីស្រែ",
    "zone.title": "តំបន់",
    "zone.variety": "ប្រភេទដំណាំ",
    "zone.totalArea": "ទំហំតំបន់",
    "zone.avgTreeAge": "អាយុមធ្យមនៃដើមឈើ",
    "zone.efficiency": "ផលចំណេញក្នុងមេត្រការ",
    "zone.cropType": "ប្រភេទដំណាំ",
    "zone.tabs.analysis": "វិភាគ",
    "zone.tabs.harvest": "ប្រមូលផល",
    "zone.tabs.irrigation": "សេសស្រែ",
    "zone.tabs.batches": "កូនដី",
    "zone.batch-title": "ប្រវត្តិក្រុមដាំដុះ",
    "zone.batch-action": "បន្ថែមក្រុមដាំដុះថ្មី",
    "reports.title": "សង្ខេបរបាយការណ៍",
    "reports.subtitle": "តាមដានចំណូលផល ការប្រៀបធៀបតំបន់ និងបញ្ចូនទិន្នន័យ។",
    "reports.zonePerformance": "សមត្ថភាពតំបន់",
    "reports.yieldPerHa": "ផលចំណេញក្នុងមេត្រការ",
  },
}

export const mergeTranslations = (
  locale: Locale,
  overrides?: Record<string, string> | null
) => {
  return {
    ...fallbackTranslations[locale],
    ...(overrides ?? {}),
  }
}
