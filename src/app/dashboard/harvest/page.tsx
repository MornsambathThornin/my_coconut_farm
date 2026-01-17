import HarvestForm from '@/components/forms/HarvestForm'

export default function HarvestPage() {
  return (
    <div className="max-w-xl bg-white p-4 rounded shadow">
      <h1 className="text-xl font-bold mb-4">Add Harvest Record</h1>
      <HarvestForm />
    </div>
  )
}
