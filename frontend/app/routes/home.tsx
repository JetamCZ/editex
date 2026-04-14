import type { Route } from "./+types/home";
import { Link, useLoaderData } from "react-router";
import { FileText, GitBranch, Users, Zap, ArrowRight } from "lucide-react";
import { getApiClient } from "~/lib/axios.server";
import { useTranslation } from 'react-i18next';
import i18n from '~/i18n';
import { LanguageSwitcher } from '~/components/LanguageSwitcher';

export function meta({}: Route.MetaArgs) {
  return [
    { title: i18n.t('home.meta.title') },
    { name: "description", content: i18n.t('home.meta.description') },
  ];
}

export function links() {
  return [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Lora:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const api = await getApiClient(request);
    const { data: user } = await api.get("/auth/me");
    return { user };
  } catch {
    return { user: null };
  }
}

const getFeatures = (t: (key: string) => string) => [
  {
    icon: GitBranch,
    color: "#2563eb",
    title: t('home.features.versionControl.title'),
    description: t('home.features.versionControl.description'),
  },
  {
    icon: Users,
    color: "#7c3aed",
    title: t('home.features.collaboration.title'),
    description: t('home.features.collaboration.description'),
  },
  {
    icon: FileText,
    color: "#059669",
    title: t('home.features.latexEditor.title'),
    description: t('home.features.latexEditor.description'),
  },
];

const DARK = "#09090b";
const WARM_WHITE = "#faf9f6";
const BLUE = "#2563eb";

export default function Home() {
  const { t } = useTranslation();
  const { user } = useLoaderData<typeof loader>();
  const features = getFeatures(t);

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: DARK }}>

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        backgroundColor: "rgba(9,9,11,0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{
          maxWidth: "1160px", margin: "0 auto", padding: "0 32px",
          height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <img src="/logo.svg" style={{ height: "36px", filter: "brightness(0) invert(1)" }} alt="Editex" />

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ color: "rgba(255,255,255,0.65)", marginRight: "4px" }}>
              <LanguageSwitcher />
            </div>
            {user ? (
              <Link to="/dashboard" style={{ textDecoration: "none" }}>
                <button style={{
                  padding: "9px 20px", borderRadius: "8px",
                  backgroundColor: BLUE, color: "white",
                  border: "none", cursor: "pointer",
                  fontSize: "14px", fontWeight: 600, fontFamily: "inherit",
                }}>
                  {t('home.nav.dashboard')}
                </button>
              </Link>
            ) : (
              <>
                <Link to="/auth/login" style={{ textDecoration: "none" }}>
                  <button style={{
                    padding: "9px 20px", borderRadius: "8px",
                    backgroundColor: "transparent",
                    color: "rgba(255,255,255,0.65)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    cursor: "pointer", fontSize: "14px", fontWeight: 500, fontFamily: "inherit",
                  }}>
                    {t('home.nav.signIn')}
                  </button>
                </Link>
                <Link to="/auth/register" style={{ textDecoration: "none" }}>
                  <button style={{
                    padding: "9px 20px", borderRadius: "8px",
                    backgroundColor: BLUE, color: "white",
                    border: "none", cursor: "pointer",
                    fontSize: "14px", fontWeight: 600, fontFamily: "inherit",
                  }}>
                    {t('home.nav.getStarted')}
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section style={{
        backgroundColor: DARK,
        backgroundImage:
          "radial-gradient(ellipse at 15% 60%, rgba(37,99,235,0.14) 0%, transparent 55%), radial-gradient(ellipse at 85% 20%, rgba(124,58,237,0.11) 0%, transparent 50%)",
        padding: "96px 32px 80px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Subtle grid */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.025,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />

        <div style={{ maxWidth: "1160px", margin: "0 auto", position: "relative", zIndex: 1 }}>

          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            padding: "5px 14px", borderRadius: "100px",
            backgroundColor: "rgba(37,99,235,0.15)",
            border: "1px solid rgba(37,99,235,0.3)",
            marginBottom: "44px",
          }}>
            <Zap size={12} style={{ color: "#60a5fa" }} />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#60a5fa", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {t('home.hero.badge')}
            </span>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left: copy */}
            <div>
              <h1 style={{
                fontFamily: "'Lora', serif",
                fontSize: "clamp(40px, 4.5vw, 62px)",
                fontWeight: 700, lineHeight: 1.12,
                color: "#f0ede6", letterSpacing: "-0.025em",
                margin: "0 0 24px",
              }}>
                {t('home.hero.headingLine1')}<br />
                <em style={{ fontStyle: "italic", color: "#93c5fd" }}>{t('home.hero.headingEmphasis')}</em>{" "}
                {t('home.hero.headingLine2')}
              </h1>

              <p style={{
                fontSize: "18px", lineHeight: 1.72,
                color: "rgba(240,237,230,0.55)",
                margin: "0 0 40px", maxWidth: "430px",
              }}>
                {t('home.hero.subheading')}
              </p>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <Link to="/auth/register" style={{ textDecoration: "none" }}>
                  <button style={{
                    padding: "13px 22px", borderRadius: "10px",
                    backgroundColor: BLUE, color: "white",
                    border: "none", cursor: "pointer",
                    fontSize: "15px", fontWeight: 700, fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: "8px",
                    boxShadow: "0 0 48px rgba(37,99,235,0.4)",
                  }}>
                    {t('home.hero.ctaPrimary')} <ArrowRight size={15} />
                  </button>
                </Link>
                <Link to="/auth/login" style={{ textDecoration: "none" }}>
                  <button style={{
                    padding: "13px 22px", borderRadius: "10px",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.75)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer", fontSize: "15px", fontWeight: 500, fontFamily: "inherit",
                  }}>
                    {t('home.hero.ctaSecondary')}
                  </button>
                </Link>
              </div>
            </div>

            {/* Right: mock editor */}
            <div style={{ position: "relative" }}>
              <div style={{
                borderRadius: "16px", overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.09)",
                boxShadow: "0 40px 96px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
                backgroundColor: "#111113",
              }}>
                {/* Window chrome */}
                <div style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", gap: "8px",
                  backgroundColor: "#0d0d0f",
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#ef4444" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#f59e0b" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#22c55e" }} />
                  <span style={{ marginLeft: 12, fontSize: 12, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>
                    main.tex
                  </span>
                  <span style={{
                    marginLeft: "auto", fontSize: 11, fontWeight: 600,
                    color: "#22c55e", letterSpacing: "0.04em",
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#22c55e", display: "inline-block" }} />
                    LIVE
                  </span>
                </div>

                {/* Code body */}
                <div style={{
                  padding: "28px 28px 32px",
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontSize: "13.5px", lineHeight: 2,
                }}>
                  <div>
                    <span style={{ color: "#60a5fa" }}>\documentclass</span>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>{"{"}</span>
                    <span style={{ color: "#f0ede6" }}>article</span>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>{"}"}</span>
                  </div>
                  <div>
                    <span style={{ color: "#60a5fa" }}>\usepackage</span>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>{"{"}</span>
                    <span style={{ color: "#f0ede6" }}>amsmath</span>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>{"}"}</span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span style={{ color: "#60a5fa" }}>\begin</span>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>{"{"}</span>
                    <span style={{ color: "#a5f3fc" }}>document</span>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>{"}"}</span>
                  </div>
                  <div style={{ paddingLeft: 20 }}>
                    <span style={{ color: "#60a5fa" }}>\title</span>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>{"{"}</span>
                    <span style={{ color: "#f0ede6" }}>Research Paper</span>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>{"}"}</span>
                  </div>
                  <div style={{ paddingLeft: 20 }}>
                    <span style={{ color: "#60a5fa" }}>\section</span>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>{"{"}</span>
                    <span style={{ color: "#f0ede6" }}>Introduction</span>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>{"}"}</span>
                  </div>
                  <div style={{ paddingLeft: 20, color: "rgba(255,255,255,0.45)" }}>
                    Collaborative writing made simple.
                  </div>
                  <div style={{ paddingLeft: 20, color: "#fbbf24", marginTop: 4 }}>
                    $E = mc^2$
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span style={{ color: "#60a5fa" }}>\end</span>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>{"{"}</span>
                    <span style={{ color: "#a5f3fc" }}>document</span>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>{"}"}</span>
                  </div>
                </div>
              </div>

              {/* Floating: active collaborators */}
              <div style={{
                position: "absolute", bottom: -20, left: 20,
                display: "flex", alignItems: "center", gap: 8,
                backgroundColor: "#1c1c1f",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "100px", padding: "8px 16px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}>
                <div style={{ display: "flex" }}>
                  {["#2563eb", "#7c3aed", "#059669"].map((c, i) => (
                    <div key={i} style={{
                      width: 24, height: 24, borderRadius: "50%",
                      backgroundColor: c,
                      border: "2px solid #1c1c1f",
                      marginLeft: i > 0 ? -8 : 0,
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                  {t('home.mockEditor.editingNow')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: WARM_WHITE, padding: "96px 32px" }}>
        <div style={{ maxWidth: "1160px", margin: "0 auto" }}>

          <div style={{ marginBottom: "64px" }}>
            <p style={{
              fontSize: "12px", fontWeight: 700, color: BLUE,
              letterSpacing: "0.1em", textTransform: "uppercase",
              margin: "0 0 16px",
            }}>
              {t('home.features.label')}
            </p>
            <h2 style={{
              fontFamily: "'Lora', serif",
              fontSize: "clamp(30px, 3.5vw, 44px)",
              fontWeight: 700, color: "#0c0c0e",
              letterSpacing: "-0.025em", lineHeight: 1.2,
              margin: "0 0 16px", maxWidth: "540px",
            }}>
              {t('home.features.heading')}
            </h2>
            <p style={{ fontSize: "17px", color: "#666", lineHeight: 1.65, margin: 0 }}>
              {t('home.features.subheading')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, color, title, description }) => (
              <FeatureCard key={title} icon={<Icon size={22} style={{ color }} />} iconBg={`${color}18`} title={title} description={description} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section style={{
        backgroundColor: DARK,
        backgroundImage: "radial-gradient(ellipse at 50% 110%, rgba(37,99,235,0.25) 0%, transparent 60%)",
        padding: "104px 32px",
        textAlign: "center",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ maxWidth: "560px", margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "'Lora', serif",
            fontSize: "clamp(34px, 4vw, 50px)",
            fontWeight: 700, color: "#f0ede6",
            letterSpacing: "-0.025em", lineHeight: 1.2,
            margin: "0 0 20px",
          }}>
            {t('home.cta.headingLine1')}<br />
            <em style={{ fontStyle: "italic", color: "#93c5fd" }}>{t('home.cta.headingEmphasis')}</em>
          </h2>
          <p style={{ fontSize: "18px", color: "rgba(240,237,230,0.5)", margin: "0 0 40px", lineHeight: 1.65 }}>
            {t('home.cta.subheading')}
          </p>
          <Link to="/auth/register" style={{ textDecoration: "none" }}>
            <button style={{
              padding: "14px 32px", borderRadius: "12px",
              backgroundColor: "white", color: "#0c0c0e",
              border: "none", cursor: "pointer",
              fontSize: "16px", fontWeight: 700, fontFamily: "inherit",
              boxShadow: "0 0 80px rgba(255,255,255,0.12)",
            }}>
              {t('home.cta.button')}
            </button>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{
        backgroundColor: DARK,
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "28px 32px",
      }}>
        <div style={{
          maxWidth: "1160px", margin: "0 auto",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 16,
        }}>
          <img src="/logo.svg" style={{ height: "26px", filter: "brightness(0) invert(1) opacity(0.4)" }} alt="Editex" />
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)", fontFamily: "inherit" }}>
            {t('home.footer.copyright')}
          </span>
        </div>
      </footer>
    </div>
  );
}

/* ── Sub-component ──────────────────────────────────────────────────────── */

interface FeatureCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
}

function FeatureCard({ icon, iconBg, title, description }: FeatureCardProps) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "16px",
        padding: "32px",
        border: "1px solid #e8e5df",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        cursor: "default",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = "0 12px 40px rgba(0,0,0,0.09)";
        el.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)";
        el.style.transform = "translateY(0)";
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        backgroundColor: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 24,
      }}>
        {icon}
      </div>
      <h3 style={{
        fontFamily: "'Lora', serif",
        fontSize: "20px", fontWeight: 700,
        color: "#0c0c0e", margin: "0 0 12px",
        letterSpacing: "-0.015em",
      }}>
        {title}
      </h3>
      <p style={{ fontSize: "15px", color: "#666", lineHeight: 1.7, margin: 0 }}>
        {description}
      </p>
    </div>
  );
}
