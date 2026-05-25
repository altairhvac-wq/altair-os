export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-600">
            Altair OS
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-900">
            Tradesman Operating System
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            A modern command center for dispatch, jobs, technicians, estimates,
            invoices, expenses, and subcontractor networking.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Active Jobs</p>
            <p className="mt-3 text-3xl font-black text-slate-900">0</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Pending Estimates</p>
            <p className="mt-3 text-3xl font-black text-slate-900">0</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Unpaid Invoices</p>
            <p className="mt-3 text-3xl font-black text-slate-900">$0</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Technicians</p>
            <p className="mt-3 text-3xl font-black text-slate-900">0</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">
            Foundation is live
          </h2>
          <p className="mt-2 text-slate-600">
            Next step: build the admin layout, sidebar navigation, and route
            structure one module at a time.
          </p>
        </div>
      </div>
    </main>
  );
}
