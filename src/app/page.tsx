import Link from 'next/link'

const STEPS = [
  {
    icon: '🏆',
    label: '01',
    title: 'Crea una liga',
    description:
      'Configura el presupuesto, el límite de equipos y las reglas de puntuación. Tú decides cómo se juega.',
  },
  {
    icon: '⚽',
    label: '02',
    title: 'Arma tu equipo',
    description:
      'Elige tus once titulares y suplentes de entre todos los jugadores del Mundial respetando el tope de presupuesto.',
  },
  {
    icon: '📈',
    label: '03',
    title: 'Gana puntos',
    description:
      'Acumula puntos en tiempo real con cada gol, asistencia y estadística de tus jugadores en cada partido.',
  },
]

const FEATURES = [
  {
    icon: '⚙️',
    title: 'Reglas personalizadas',
    description:
      'El admin configura los puntos por gol, asistencia, tarjeta, portería a cero y más. Incluso puede crear eventos propios con puntaje positivo o negativo.',
  },
  {
    icon: '🏅',
    title: 'Tabla de posiciones en vivo',
    description:
      'Consulta el ranking de tu liga en tiempo real a medida que se juegan los partidos del Mundial 2026.',
  },
  {
    icon: '🔗',
    title: 'Enlace de invitación único',
    description:
      'Cada liga genera un enlace único. Compártelo y tus amigos se unen con un solo clic, sin buscar ni escribir nada.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center">
        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full bg-green-900/25 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 h-[480px] w-[480px] rounded-full bg-emerald-900/20 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-green-950/60 via-gray-950/80 to-gray-950" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-green-800/50 bg-green-900/30 px-4 py-1.5 text-sm font-medium text-green-400">
            <span>⚽</span>
            <span>FIFA World Cup 2026</span>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-5xl font-black leading-tight tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
            <span className="text-white">Mundial </span>
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              Fantasy
            </span>
            <br />
            <span className="text-white">2026</span>
          </h1>

          {/* Tagline */}
          <p className="mx-auto mb-10 max-w-lg text-lg leading-relaxed text-gray-400 sm:text-xl">
            Crea tu liga, arma tu equipo, domina el Mundial.
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="w-full rounded-xl bg-green-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-green-950 transition-colors hover:bg-green-500 sm:w-auto"
            >
              Crear Liga →
            </Link>
            <Link
              href="/join"
              className="w-full rounded-xl border border-gray-700 bg-gray-900/60 px-8 py-3.5 text-base font-semibold text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-800/60 sm:w-auto"
            >
              Unirse a una Liga
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-gray-600">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────── */}
      <section className="bg-gray-950 px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="mb-3 text-3xl font-bold text-white sm:text-4xl">Cómo funciona</h2>
            <p className="text-gray-500">Tres pasos para empezar a competir</p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={i} className="group flex flex-col items-center text-center">
                {/* Icon box */}
                <div className="mb-6 flex h-20 w-20 flex-col items-center justify-center rounded-2xl border border-green-900/50 bg-green-950/60 transition-colors group-hover:border-green-700/60">
                  <span className="mb-0.5 text-xs font-bold tracking-widest text-green-600">
                    {step.label}
                  </span>
                  <span className="text-3xl leading-none">{step.icon}</span>
                </div>

                {/* Connector (desktop) */}
                {i < STEPS.length - 1 && (
                  <div className="absolute hidden md:block" aria-hidden="true" />
                )}

                <h3 className="mb-2 text-xl font-bold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>

          {/* Step connector line — desktop only */}
          <div className="relative -mt-[calc(theme(spacing.8)+theme(spacing.20)+theme(spacing.6))] mb-[calc(theme(spacing.8)+theme(spacing.20)+theme(spacing.6))] hidden px-[calc(100%/6)] md:block" aria-hidden="true">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-green-800/50 to-transparent" />
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section className="border-t border-gray-900 bg-black px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="mb-3 text-3xl font-bold text-white sm:text-4xl">Todo lo que necesitas</h2>
            <p className="text-gray-500">Herramientas para hacer tu liga única</p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-800/60 bg-gray-950 p-6 transition-colors hover:border-green-900/50 hover:bg-gray-950/80"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-green-900/40 bg-green-950/60 text-xl">
                  {f.icon}
                </div>
                <h3 className="mb-2 text-base font-bold text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ─────────────────────────────────────────────── */}
      <section className="border-t border-green-900/30 bg-gradient-to-b from-green-950/40 to-gray-950 px-4 py-24">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">¿Listo para competir?</h2>
          <p className="mb-8 text-gray-400">
            Crea tu liga en menos de un minuto y empieza a armar tu equipo.
          </p>
          <Link
            href="/register"
            className="inline-block rounded-xl bg-green-600 px-10 py-3.5 text-base font-semibold text-white shadow-lg shadow-green-950 transition-colors hover:bg-green-500"
          >
            Empezar ahora →
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-900 bg-black px-4 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2 font-bold text-white">
            <span>⚽</span>
            <span>Mundial Fantasy 2026</span>
          </div>
          <p className="text-sm text-gray-600">© 2026. Todos los derechos reservados.</p>
        </div>
      </footer>

    </div>
  )
}
