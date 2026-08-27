import { Activity } from 'lucide-react'
import OperationsLifecycleQueue from './OperationsLifecycleQueue'
import PickupExceptionTriageQueue from './PickupExceptionTriageQueue'

const OperationsCenterDashboard = () => (
  <main className="min-h-screen bg-slate-50 p-6">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Operations Center</h1>
          <p className="mt-2 text-slate-600">
            Canonical rental execution continuity and governed exception triage.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
          <Activity className="h-4 w-4" /> Read-only lifecycle view
        </div>
      </header>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Operations access only. Frontend visibility does not grant lifecycle, billing, custody,
        exception-resolution, or granular rental authority.
      </div>

      <OperationsLifecycleQueue />
      <PickupExceptionTriageQueue />
    </div>
  </main>
)

export default OperationsCenterDashboard
