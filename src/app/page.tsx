import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import UpgradeButton from "@/components/UpgradeButton";

/* ─── Nav ────────────────────────────────────────────────────────────────── */
function Nav() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4"
      style={{
        background: "rgba(7, 11, 20, 0.75)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <span className="font-display text-xl font-semibold tracking-tight">
        Extranjería<span style={{ color: "var(--accent)" }}>.ai</span>
      </span>
      <div className="flex items-center gap-6 text-sm" style={{ color: "var(--text-muted)" }}>
        <a href="#servicios" className="hidden md:block hover:text-white transition-colors">
          Servicios
        </a>
        <a href="#precios" className="hidden md:block hover:text-white transition-colors">
          Precios
        </a>
        <SignedIn>
          <Link
            href="/dashboard/chat"
            className="hidden md:block hover:text-white transition-colors"
          >
            Mi cuenta
          </Link>
          <UserButton />
        </SignedIn>
        <SignedOut>
          <Link href="/sign-in" className="hover:text-white transition-colors">
            Entrar
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90 pulse-glow"
            style={{ background: "var(--accent)" }}
          >
            Empezar gratis
          </Link>
        </SignedOut>
      </div>
    </nav>
  );
}

/* ─── Chat Mockup ────────────────────────────────────────────────────────── */
function ChatMockup() {
  return (
    <div
      className="float relative w-full max-w-sm rounded-2xl overflow-hidden text-sm"
      style={{
        background: "var(--surface)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(255,107,53,0.08)",
      }}
    >
      {/* Window chrome */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}
      >
        <span className="w-3 h-3 rounded-full" style={{ background: "#FF5F57" }} />
        <span className="w-3 h-3 rounded-full" style={{ background: "#FFBD2E" }} />
        <span className="w-3 h-3 rounded-full" style={{ background: "#28C840" }} />
        <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
          Extranjería.ai
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* User message */}
        <div className="flex justify-end">
          <div
            className="rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] text-white text-sm leading-relaxed"
            style={{ background: "var(--accent)" }}
          >
            ¿Qué necesito para solicitar el TIE como trabajador extracomunitario?
          </div>
        </div>

        {/* Assistant typing */}
        <div className="flex justify-start gap-2.5">
          <div
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-warm))",
              color: "white",
            }}
          >
            E
          </div>
          <div
            className="rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] leading-relaxed"
            style={{ background: "var(--surface-2)", color: "var(--text)" }}
          >
            <p className="text-sm">Para el TIE necesitas presentar en la Oficina de Extranjería:</p>
            <ul className="mt-2 space-y-1 text-sm" style={{ color: "var(--text-muted)" }}>
              <li>
                ✓ <span style={{ color: "var(--text)" }}>Pasaporte original + copia</span>
              </li>
              <li>
                ✓ <span style={{ color: "var(--text)" }}>Formulario EX-17</span>
              </li>
              <li>
                ✓ <span style={{ color: "var(--text)" }}>Tasa 790 código 012</span>
              </li>
              <li>
                ✓ <span style={{ color: "var(--text)" }}>Contrato de trabajo</span>
              </li>
            </ul>
            <span className="cursor" />
          </div>
        </div>

        {/* Source badge */}
        <div
          className="flex items-center gap-2 text-xs rounded-lg px-3 py-2"
          style={{ background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.15)" }}
        >
          <span
            className="px-1.5 py-0.5 rounded text-xs font-semibold"
            style={{ background: "var(--accent)", color: "white" }}
          >
            SEDE
          </span>
          <span style={{ color: "var(--text-muted)" }}>
            sede.administracion.gob.es · Verificado hoy
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Hero ───────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="mesh-bg noise min-h-screen flex items-center pt-24 pb-16 px-6 md:px-12 lg:px-20">
      <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">
        {/* Copy */}
        <div>
          <div
            className="fade-up-1 inline-flex items-center gap-2 text-xs font-medium rounded-full px-3 py-1.5 mb-8"
            style={{
              background: "rgba(255,107,53,0.1)",
              border: "1px solid rgba(255,107,53,0.25)",
              color: "var(--accent-warm)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full pulse-glow"
              style={{ background: "var(--accent)" }}
            />
            Fuentes actualizadas cada 24 horas
          </div>

          <h1 className="fade-up-2 font-display text-5xl md:text-6xl xl:text-7xl font-semibold leading-tight mb-6">
            Tu abogado de
            <br />
            <span className="shimmer-text">extranjería</span>
            <br />
            disponible 24/7
          </h1>

          <p
            className="fade-up-3 text-lg leading-relaxed mb-10 max-w-lg"
            style={{ color: "var(--text-muted)" }}
          >
            Resuelve tus dudas sobre NIE, TIE, visados y permisos de residencia en España — en
            segundos, con fuentes oficiales verificadas del BOE, SEPE y Sede Electrónica.
          </p>

          <div className="fade-up-4 flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white transition-all hover:scale-105 hover:shadow-lg"
              style={{
                background: "linear-gradient(135deg, var(--accent), #E8531A)",
                boxShadow: "0 8px 24px rgba(255,107,53,0.3)",
              }}
            >
              Empezar gratis
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
            <Link
              href="#precios"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium transition-all hover:border-white/20"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--text-muted)",
              }}
            >
              Ver precios
            </Link>
          </div>

          <p className="fade-up-5 text-xs mt-6" style={{ color: "var(--text-muted)" }}>
            5 consultas gratis · Sin tarjeta de crédito ·{" "}
            <span style={{ color: "rgba(255,255,255,0.3)" }}>
              ⚠️ Orientativo, no asesoramiento jurídico
            </span>
          </p>
        </div>

        {/* Chat mockup */}
        <div className="fade-up-3 flex justify-center lg:justify-end">
          <ChatMockup />
        </div>
      </div>
    </section>
  );
}

/* ─── Sources Strip ──────────────────────────────────────────────────────── */
function SourcesStrip() {
  const sources = [
    { label: "BOE", name: "Boletín Oficial del Estado", color: "#FF6B35" },
    { label: "SEDE", name: "Sede Electrónica Ministerio Interior", color: "#3B82F6" },
    { label: "SEPE", name: "Servicio Público de Empleo", color: "#10B981" },
    { label: "DGP", name: "Dirección General de Policía", color: "#8B5CF6" },
  ];

  return (
    <section
      className="py-10 px-6 md:px-12"
      style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-6 md:gap-10">
        <p className="text-sm font-medium shrink-0" style={{ color: "var(--text-muted)" }}>
          Verificado con datos de:
        </p>
        <div className="flex flex-wrap justify-center md:justify-start gap-3">
          {sources.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{ background: s.color + "22", color: s.color }}
              >
                {s.label}
              </span>
              <span className="text-sm hidden sm:block" style={{ color: "var(--text-muted)" }}>
                {s.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ───────────────────────────────────────────────────────────── */
function Features() {
  const features = [
    {
      icon: "⚡",
      title: "Respuestas en segundos",
      desc: "Sin colas, sin esperas. Obtén información precisa sobre tu trámite en menos de 8 segundos.",
      large: true,
    },
    {
      icon: "📋",
      title: "Checklists personalizados",
      desc: "Genera automáticamente la lista de documentos según tu situación y nacionalidad.",
      large: true,
    },
    {
      icon: "🔔",
      title: "Alertas normativas",
      desc: "Te avisamos cuando cambia la normativa relevante para tu caso.",
    },
    {
      icon: "📅",
      title: "Actualización diaria",
      desc: "La base de datos se sincroniza con el BOE y las sedes cada 24 horas.",
    },
    {
      icon: "📎",
      title: "Fuentes citadas",
      desc: "Cada respuesta incluye la fuente oficial y la fecha de verificación.",
    },
    {
      icon: "⚖️",
      title: "Derivación a abogados",
      desc: "Casos complejos: conectamos con especialistas de nuestra red.",
    },
  ];

  return (
    <section id="servicios" className="py-24 px-6 md:px-12 lg:px-20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <p
            className="text-sm font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--accent)" }}
          >
            Servicios
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-semibold max-w-xl">
            Todo lo que necesitas para tus trámites
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={i}
              className={`card-hover rounded-2xl p-6 ${f.large ? "md:col-span-1" : ""}`}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-5"
                style={{ background: "rgba(255,107,53,0.1)" }}
              >
                {f.icon}
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ───────────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Haz tu consulta",
      desc: "Escribe tu duda en lenguaje natural. NIE, TIE, visado, permiso de trabajo — lo que necesites.",
    },
    {
      num: "02",
      title: "Buscamos en fuentes oficiales",
      desc: "Nuestra IA recupera información actualizada del BOE, SEPE y la Sede Electrónica en tiempo real.",
    },
    {
      num: "03",
      title: "Recibe tu respuesta",
      desc: "Una respuesta clara, con fuentes citadas y la fecha de verificación. Sin letra pequeña.",
    },
  ];

  return (
    <section
      className="py-24 px-6 md:px-12 lg:px-20"
      style={{
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 text-center">
          <p
            className="text-sm font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--accent)" }}
          >
            Cómo funciona
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-semibold">
            Tres pasos, cero burocracia
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div
            className="hidden md:block absolute top-10 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-px"
            style={{
              background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
            }}
          />

          {steps.map((s, i) => (
            <div key={i} className="relative text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 font-display text-2xl font-bold"
                style={{
                  background:
                    i === 1
                      ? "linear-gradient(135deg, var(--accent), var(--accent-warm))"
                      : "var(--surface-2)",
                  color: i === 1 ? "white" : "var(--accent)",
                  border: "1px solid",
                  borderColor: i === 1 ? "transparent" : "var(--border)",
                }}
              >
                {s.num}
              </div>
              <h3 className="font-semibold text-xl mb-3">{s.title}</h3>
              <p
                className="text-sm leading-relaxed max-w-xs mx-auto"
                style={{ color: "var(--text-muted)" }}
              >
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ────────────────────────────────────────────────────────────── */
function Pricing() {
  const plans = [
    {
      name: "Básico",
      price: "0",
      period: "/ mes",
      tagline: "Para empezar sin compromiso",
      features: [
        "5 consultas al mes",
        "Respuestas generales",
        "Acceso a guías públicas",
        "Fuentes citadas",
      ],
      missing: ["Historial guardado", "Alertas normativas", "Checklists personalizados"],
      cta: "Empezar gratis",
      href: "/sign-up",
      highlight: false,
    },
    {
      name: "Pro",
      price: "9",
      period: "/ mes",
      tagline: "Para trámites activos",
      features: [
        "Consultas ilimitadas",
        "Respuestas personalizadas",
        "Historial completo",
        "Alertas normativas",
        "Checklists automáticos",
        "Fuentes con fecha de verificación",
      ],
      missing: [],
      cta: "Empezar con Pro",
      href: null,
      stripePlan: "pro" as const,
      highlight: true,
    },
    // {
    //   name: 'Empresa',
    //   price: '49',
    //   period: '/ mes',
    //   tagline: 'Para gestorías y despachos',
    //   features: [
    //     'Todo lo de Pro',
    //     'Hasta 20 usuarios',
    //     'API REST + webhooks',
    //     'White-label básico',
    //     'Red de abogados especialistas',
    //     'Soporte prioritario',
    //     'Factura disponible',
    //   ],
    //   missing: [],
    //   cta: 'Empezar con Empresa',
    //   href: null,
    //   stripePlan: 'empresa' as const,
    //   highlight: false,
    // },
  ];

  return (
    <section id="precios" className="py-24 px-6 md:px-12 lg:px-20">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 text-center">
          <p
            className="text-sm font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--accent)" }}
          >
            Precios
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-semibold mb-4">
            Justo lo que necesitas
          </h2>
          <p className="max-w-md mx-auto text-base" style={{ color: "var(--text-muted)" }}>
            Sin sorpresas. Sin compromisos anuales. Cancela cuando quieras.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-start max-w-3xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={i}
              className="card-hover relative rounded-2xl p-8"
              style={{
                background: plan.highlight ? "var(--surface-2)" : "var(--surface)",
                border: `1px solid ${plan.highlight ? "rgba(255,107,53,0.4)" : "var(--border)"}`,
                boxShadow: plan.highlight ? "0 0 60px rgba(255,107,53,0.1)" : "none",
                marginTop: 0,
              }}
            >
              {plan.highlight && (
                <div
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  MÁS POPULAR
                </div>
              )}

              <p
                className="font-semibold text-sm mb-1"
                style={{ color: plan.highlight ? "var(--accent)" : "var(--text-muted)" }}
              >
                {plan.name}
              </p>

              <div className="flex items-end gap-1 my-4">
                <span className="font-display text-5xl font-bold">€{plan.price}</span>
                <span className="mb-2" style={{ color: "var(--text-muted)" }}>
                  {plan.period}
                </span>
              </div>

              <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                {plan.tagline}
              </p>

              {plan.href ? (
                <Link
                  href={plan.href}
                  className="block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 hover:scale-[1.02] mb-8"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--text)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {plan.cta}
                </Link>
              ) : (
                <UpgradeButton
                  plan={plan.stripePlan!}
                  label={plan.cta}
                  highlight={plan.highlight}
                />
              )}

              <ul className="space-y-3">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm">
                    <svg
                      className="w-4 h-4 mt-0.5 shrink-0"
                      style={{ color: plan.highlight ? "var(--accent)" : "#10B981" }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
                {plan.missing.map((f, j) => (
                  <li
                    key={j}
                    className="flex items-start gap-2.5 text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <svg
                      className="w-4 h-4 mt-0.5 shrink-0 opacity-30"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="opacity-40">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-xs mt-8" style={{ color: "var(--text-muted)" }}>
          También disponible: créditos de pago único — €5 por 20 consultas
        </p>
      </div>
    </section>
  );
}

/* ─── Final CTA ──────────────────────────────────────────────────────────── */
function FinalCta() {
  return (
    <section
      className="py-28 px-6 md:px-12 text-center"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 70%), var(--surface)",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div className="max-w-2xl mx-auto">
        <p
          className="text-sm font-semibold uppercase tracking-widest mb-6"
          style={{ color: "var(--accent)" }}
        >
          Empieza hoy
        </p>
        <h2 className="font-display text-4xl md:text-6xl font-semibold mb-6 leading-tight">
          No llegues a ciegas
          <br />a ninguna oficina
        </h2>
        <p className="text-base mb-10" style={{ color: "var(--text-muted)" }}>
          Extranjería.ai es el paso previo al abogado: entiende tu situación, prepara tus documentos
          y llega informado a cada trámite.
        </p>
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white text-base transition-all hover:scale-105"
          style={{
            background: "linear-gradient(135deg, var(--accent), #E8531A)",
            boxShadow: "0 12px 32px rgba(255,107,53,0.35)",
          }}
        >
          Empieza gratis — sin tarjeta
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
            />
          </svg>
        </Link>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="py-10 px-6 md:px-12" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="font-display text-lg font-semibold">
          Extranjería<span style={{ color: "var(--accent)" }}>.ai</span>
        </span>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          © 2025 Extranjería.ai · Información orientativa, no asesoramiento jurídico.
        </p>
        <div className="flex gap-6 text-sm" style={{ color: "var(--text-muted)" }}>
          <a href="#" className="hover:text-white transition-colors">
            Privacidad
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Términos
          </a>
          <a href="mailto:hola@extranjeria.ai" className="hover:text-white transition-colors">
            Contacto
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <>
      <Nav />
      <Hero />
      <SourcesStrip />
      <Features />
      <HowItWorks />
      <Pricing />
      <FinalCta />
      <Footer />
    </>
  );
}
