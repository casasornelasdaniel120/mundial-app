import Link from 'next/link'

const STEPS = [
  {
    num: '01',
    title: 'Crea una liga',
    description: 'Configura el presupuesto, el límite de equipos y las reglas de puntuación. Tú decides cómo se juega.',
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Arma tu equipo',
    description: 'Elige tus once titulares y suplentes de entre todos los jugadores del Mundial respetando el tope de presupuesto.',
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        <path d="M2 12h20" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Gana puntos',
    description: 'Acumula puntos en tiempo real con cada gol, asistencia y estadística de tus jugadores en cada partido.',
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
]

const FEATURES = [
  {
    title: 'Reglas personalizadas',
    description: 'El admin configura los puntos por gol, asistencia, tarjeta, portería a cero y más.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: 'Tabla de posiciones en vivo',
    description: 'Consulta el ranking de tu liga en tiempo real a medida que se juegan los partidos.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    title: 'Enlace de invitación único',
    description: 'Cada liga genera un enlace único. Compártelo y tus amigos se unen con un solo clic.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">

      {/* ── Mexico tricolor top bar ── */}
      <div className="flex h-1 w-full" aria-hidden="true">
        <div className="flex-1" style={{ backgroundColor: '#006847' }} />
        <div className="flex-1 bg-white" />
        <div className="flex-1" style={{ backgroundColor: '#CE1126' }} />
      </div>

      {/* ── Hero ── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center">
        {/* Aztec background pattern */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <svg className="absolute inset-0 h-full w-full" style={{ color: '#006847', opacity: 0.03 }}>
            <defs>
              <pattern id="aztec-hero" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <rect x="12" y="2" width="8" height="2" fill="currentColor"/>
                <rect x="2" y="12" width="2" height="8" fill="currentColor"/>
                <rect x="28" y="12" width="2" height="8" fill="currentColor"/>
                <rect x="12" y="28" width="8" height="2" fill="currentColor"/>
                <rect x="12" y="12" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#aztec-hero)" />
          </svg>
          {/* Soft green glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(0,104,71,0.08) 0%, transparent 70%)' }} />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#006847]/20 bg-green-50 px-4 py-1.5 text-sm font-medium" style={{ color: '#006847' }}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 12h20" />
            </svg>
            <span>FIFA World Cup 2026 · México</span>
          </div>

          {/* Headline */}
          <h1
            className="mb-6 text-5xl leading-none uppercase sm:text-6xl md:text-7xl lg:text-8xl"
            style={{ fontFamily: 'var(--font-russo)' }}
          >
            <span className="text-stone-900">Mundial </span>
            <span style={{ color: '#006847' }}>Fantasy</span>
            <br />
            <span className="text-stone-900">2026</span>
          </h1>

          {/* Tagline */}
          <p className="mx-auto mb-10 max-w-lg text-lg leading-relaxed text-stone-500 sm:text-xl">
            Crea tu liga, arma tu equipo, domina el Mundial.
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="w-full rounded-xl px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-[#005539] sm:w-auto"
              style={{ backgroundColor: '#006847', fontFamily: 'var(--font-russo)' }}
            >
              Crear Liga →
            </Link>
            <Link
              href="/login"
              className="w-full rounded-xl border border-stone-300 bg-white px-8 py-3.5 text-base font-semibold text-stone-700 transition-all hover:border-stone-400 hover:bg-stone-100 sm:w-auto"
              style={{ fontFamily: 'var(--font-russo)' }}
            >
              Iniciar sesión
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-stone-400">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-white px-4 py-24 border-t border-stone-100">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em]" style={{ color: '#006847' }}>Paso a paso</p>
            <h2 className="text-3xl text-stone-900 sm:text-4xl" style={{ fontFamily: 'var(--font-russo)' }}>
              Cómo funciona
            </h2>
            <p className="mt-3 text-stone-500">Tres pasos para empezar a competir</p>
          </div>

          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-20 w-20 flex-col items-center justify-center rounded-2xl border-2 border-[#006847]/15 bg-green-50 transition-all hover:border-[#006847]/30" style={{ color: '#006847' }}>
                  <span className="mb-1 text-[10px] font-bold tracking-widest" style={{ color: '#006847', opacity: 0.5 }}>{step.num}</span>
                  {step.icon}
                </div>
                <h3 className="mb-2 text-xl text-stone-900" style={{ fontFamily: 'var(--font-russo)' }}>{step.title}</h3>
                <p className="text-sm leading-relaxed text-stone-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-t border-stone-100 bg-stone-50 px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em]" style={{ color: '#006847' }}>Herramientas</p>
            <h2 className="text-3xl text-stone-900 sm:text-4xl" style={{ fontFamily: 'var(--font-russo)' }}>
              Todo lo que necesitas
            </h2>
            <p className="mt-3 text-stone-500">Herramientas para hacer tu liga única</p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#006847]/15 bg-green-50" style={{ color: '#006847' }}>
                  {f.icon}
                </div>
                <h3 className="mb-2 text-base text-stone-900" style={{ fontFamily: 'var(--font-russo)' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed text-stone-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="border-t border-stone-100 bg-white px-4 py-24">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-4 text-3xl text-stone-900 sm:text-4xl" style={{ fontFamily: 'var(--font-russo)' }}>
            ¿Listo para competir?
          </h2>
          <p className="mb-8 text-stone-500">
            Crea tu liga en menos de un minuto y empieza a armar tu equipo.
          </p>
          <Link
            href="/register"
            className="inline-block rounded-xl px-10 py-3.5 text-base font-semibold text-white transition-all hover:bg-[#005539]"
            style={{ backgroundColor: '#006847', fontFamily: 'var(--font-russo)' }}
          >
            Empezar ahora →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-stone-200 bg-stone-50 px-4 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2" style={{ fontFamily: 'var(--font-russo)' }}>
            <svg className="h-5 w-5" style={{ color: '#006847' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 12h20" />
            </svg>
            <span className="text-sm text-stone-700 uppercase tracking-wider">Mundial Fantasy 2026</span>
          </div>
          <p className="text-sm text-stone-400">© 2026. Todos los derechos reservados.</p>
        </div>
      </footer>

    </div>
  )
}
