export default function DashboardPage() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">Welcome to Altair OS</h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Your admin command center is ready. Use the sidebar to navigate
          modules as they are built out one at a time.
        </p>
      </div>
    </>
  );
}
