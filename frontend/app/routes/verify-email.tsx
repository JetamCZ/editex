import { Link, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import api from '../lib/axios.server';
import { useTranslation } from 'react-i18next';
import i18n from '~/i18n';

export function meta() {
    return [
        { title: i18n.t('auth.verifyEmail.meta.title') },
        { name: "description", content: i18n.t('auth.verifyEmail.meta.description') },
    ];
}

export function links() {
    return [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
        {
            rel: "stylesheet",
            href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400&family=Lora:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
        },
    ];
}

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
        return {
            success: false,
            error: 'No verification token provided',
            email: null,
        };
    }

    try {
        await api.post('/auth/verify-email', { token });
        return {
            success: true,
            error: null,
            email: null,
        };
    } catch (err: any) {
        return {
            success: false,
            error: err.response?.data?.error || 'Verification failed',
            email: err.response?.data?.email || null,
        };
    }
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function Alert({ color, children }: { color: 'red' | 'amber' | 'green'; children: React.ReactNode }) {
    const cfg = {
        red:   { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.22)',   text: '#c41a1a' },
        amber: { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  text: '#92400e' },
        green: { bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.22)',   text: '#15803d' },
    }[color];
    return (
        <div style={{
            padding: '11px 15px', borderRadius: '8px',
            backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`,
            color: cfg.text, fontSize: '14px', lineHeight: 1.5,
        }}>
            {children}
        </div>
    );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function VerifyEmail() {
    const { t } = useTranslation();
    const { success, error, email } = useLoaderData<typeof loader>();

    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

            {/* ── Left: branding panel ─────────────────────────────────── */}
            <div
                className="hidden lg:flex"
                style={{
                    width: '42%', flexDirection: 'column',
                    backgroundColor: '#09090b',
                    backgroundImage:
                        'radial-gradient(ellipse at 20% 80%, rgba(37,99,235,0.15) 0%, transparent 55%), radial-gradient(ellipse at 80% 15%, rgba(124,58,237,0.1) 0%, transparent 50%)',
                    padding: '48px',
                    position: 'relative', overflow: 'hidden',
                }}
            >
                {/* Grid overlay */}
                <div style={{
                    position: 'absolute', inset: 0, opacity: 0.025,
                    backgroundImage:
                        'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                }} />

                {/* Logo */}
                <Link to="/" style={{ position: 'relative', zIndex: 1, display: 'inline-block' }}>
                    <img src="/logo.svg" style={{ height: '30px', filter: 'brightness(0) invert(1)' }} alt="Editex" />
                </Link>

                {/* Headline */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                    <h2 style={{
                        fontFamily: "'Lora', serif",
                        fontSize: '38px', fontWeight: 700,
                        color: '#f0ede6', letterSpacing: '-0.025em',
                        lineHeight: 1.18, margin: '0 0 18px',
                    }}>
                        Your research,<br />
                        <em style={{ fontStyle: 'italic', color: '#93c5fd' }}>version controlled.</em>
                    </h2>
                    <p style={{ fontSize: '15px', color: 'rgba(240,237,230,0.48)', lineHeight: 1.72, margin: 0, maxWidth: '300px' }}>
                        Collaborate on LaTeX documents with your team in real time.
                    </p>
                </div>

                {/* Decorative code block */}
                <div style={{
                    position: 'relative', zIndex: 1,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px', padding: '20px 24px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '12.5px', lineHeight: 2,
                }}>
                    <div>
                        <span style={{ color: '#60a5fa' }}>\begin</span>
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>{'{'}</span>
                        <span style={{ color: '#a5f3fc' }}>collaboration</span>
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>{'}'}</span>
                    </div>
                    <div style={{ paddingLeft: 18, color: 'rgba(255,255,255,0.4)' }}>  Write together, commit</div>
                    <div style={{ paddingLeft: 18, color: 'rgba(255,255,255,0.4)' }}>  track every change</div>
                    <div>
                        <span style={{ color: '#60a5fa' }}>\end</span>
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>{'{'}</span>
                        <span style={{ color: '#a5f3fc' }}>collaboration</span>
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>{'}'}</span>
                    </div>
                </div>
            </div>

            {/* ── Right: status panel ────────────────────────────────── */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#faf9f6', padding: '48px 32px',
            }}>
                {/* Mobile logo */}
                <div className="flex lg:hidden" style={{ marginBottom: '32px' }}>
                    <Link to="/">
                        <img src="/logo.svg" style={{ height: '34px' }} alt="Editex" />
                    </Link>
                </div>

                <div style={{ width: '100%', maxWidth: '380px' }}>

                    {/* Status icon */}
                    <div style={{
                        width: 56, height: 56, borderRadius: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 20,
                        backgroundColor: success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${success ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)'}`,
                    }}>
                        {success ? (
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        ) : (
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c41a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        )}
                    </div>

                    <div style={{ marginBottom: '28px' }}>
                        <h1 style={{
                            fontFamily: "'Lora', serif",
                            fontSize: '28px', fontWeight: 700,
                            color: '#0c0c0e', letterSpacing: '-0.02em',
                            margin: '0 0 7px',
                        }}>
                            {success ? t('auth.verifyEmail.successMessage') : t('auth.verifyEmail.failureHeading')}
                        </h1>
                        <p style={{ fontSize: '15px', color: '#999', margin: 0, lineHeight: 1.5 }}>
                            {success
                                ? t('auth.verifyEmail.successSubtext')
                                : (email && error?.includes('expired')
                                    ? t('auth.verifyEmail.expiredMessage')
                                    : t('auth.verifyEmail.failureSubtext'))}
                        </p>
                    </div>

                    {!success && error && (
                        <div style={{ marginBottom: 20 }}>
                            <Alert color="red">{error}</Alert>
                        </div>
                    )}

                    <Link
                        to="/auth/login"
                        style={{
                            display: 'block',
                            textAlign: 'center',
                            padding: '12px',
                            borderRadius: '10px',
                            backgroundColor: '#09090b',
                            color: 'white',
                            textDecoration: 'none',
                            fontSize: '15px', fontWeight: 700,
                            fontFamily: 'inherit',
                            transition: 'opacity 0.15s',
                        }}
                    >
                        {t('auth.verifyEmail.goToLogin')}
                    </Link>

                    {/* Footer links */}
                    <div style={{ marginTop: 22, textAlign: 'center' }}>
                        <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
                            {t('auth.verifyEmail.noAccount')}{' '}
                            <Link to="/auth/register" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 700 }}>
                                {t('auth.verifyEmail.createAccount')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
