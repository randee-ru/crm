export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_28%)]" />
      <section className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20">
        <p className="mb-4 text-sm uppercase tracking-[0.45em] text-cyan-300">
          CRM Kit
        </p>
        <h1 className="max-w-4xl text-5xl font-semibold leading-tight md:text-7xl">
          Modular CRM/ERP foundation for service businesses.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          This shell establishes a clear starting point for the product,
          architecture, and design direction.
        </p>

        <div className="mt-12 grid max-w-4xl gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-sm text-slate-400">Architecture</p>
            <p className="mt-2 text-lg font-medium">Modular monolith</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-sm text-slate-400">First vertical</p>
            <p className="mt-2 text-lg font-medium">Fitness clubs</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-sm text-slate-400">Next step</p>
            <p className="mt-2 text-lg font-medium">Backend bootstrap</p>
          </div>
        </div>
      </section>
    </main>
  );
}
