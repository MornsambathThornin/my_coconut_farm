import IrrigationForm from '@/components/forms/IrrigationForm'

export default function IrrigationPage() {
  return (
    <div className="max-w-xl bg-white p-4 rounded shadow">
      <h1 className="text-xl font-bold mb-4">Add Irrigation Log</h1>
      <IrrigationForm />
    </div>
  )
}
