import { useState } from 'react';
import { Link, type ActionFunctionArgs, Form, useActionData, useNavigation } from 'react-router';
import api from '../lib/axios.server';
import delay from "~/lib/delay";
import { useTranslation } from 'react-i18next';
import i18n from '~/i18n';

export function meta() {
  return [
    { title: i18n.t('auth.register.meta.title') },
    { name: "description", content: i18n.t('auth.register.meta.description') },
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

export async function action({ request }: ActionFunctionArgs) {
  await delay(1000);
  try {
    const formData = await request.formData();
    if (formData.get("password") !== formData.get("confirm_password")) {
      return { success: false, error: 'Passwords do not match.' };
    }
    const response = await api.post<{ message: string }>('/auth/register', formData);
    return {
      success: true,
      message: response.data?.message,
      email: formData.get("email") as string,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.error || 'Registration failed. Please try again.',
    };
  }
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function Alert({ color, children }: { color: 'red' | 'green'; children: React.ReactNode }) {
  const cfg = {
    red:   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.22)',  text: '#c41a1a' },
    green: { bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.22)',  text: '#15803d' },
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

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{
        fontSize: '11.5px', fontWeight: 700, color: '#777',
        letterSpacing: '0.07em', textTransform: 'uppercase',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {label}
      </label>
      <input
        {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setFocused(false); props.onBlur?.(e); }}
        style={{
          padding: '11px 14px',
          borderRadius: '8px',
          border: `1.5px solid ${focused ? '#2563eb' : '#e0ddd7'}`,
          fontSize: '15px', color: '#1a1a1a',
          backgroundColor: '#fff', outline: 'none',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          width: '100%', boxSizing: 'border-box' as const,
        }}
      />
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function Register() {
  const { t } = useTranslation();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const loading = navigation.state !== "idle";

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Left: branding panel ─────────────────────────────────── */}
      <div
        className="hidden lg:flex"
        style={{
          width: '42%', flexDirection: 'column',
          backgroundColor: '#09090b',
          backgroundImage:
            'radial-gradient(ellipse at 80% 20%, rgba(37,99,235,0.15) 0%, transparent 55%), radial-gradient(ellipse at 20% 85%, rgba(124,58,237,0.1) 0%, transparent 50%)',
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
            {t('auth.register.panel.headingLine1')}<br />
            <em style={{ fontStyle: 'italic', color: '#93c5fd' }}>{t('auth.register.panel.headingEmphasis')}</em>
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(240,237,230,0.48)', lineHeight: 1.72, margin: 0, maxWidth: '300px' }}>
            {t('auth.register.panel.subheading')}
          </p>
        </div>

        {/* Feature list */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            t('auth.register.panel.feature1'),
            t('auth.register.panel.feature2'),
            t('auth.register.panel.feature3'),
          ].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                backgroundColor: 'rgba(37,99,235,0.25)',
                border: '1px solid rgba(37,99,235,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ fontSize: '13.5px', color: 'rgba(240,237,230,0.6)' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: form panel ────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#faf9f6', padding: '48px 32px',
        overflowY: 'auto',
      }}>
        {/* Mobile logo */}
        <div className="flex lg:hidden" style={{ marginBottom: '32px' }}>
          <Link to="/">
            <img src="/logo.svg" style={{ height: '34px' }} alt="Editex" />
          </Link>
        </div>

        <div style={{ width: '100%', maxWidth: '400px' }}>

          {actionData?.success ? (
            /* ── Success state ── */
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                backgroundColor: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
                  <path d="M2 10L8.5 16.5L22 2" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h1 style={{
                  fontFamily: "'Lora', serif",
                  fontSize: '26px', fontWeight: 700,
                  color: '#0c0c0e', letterSpacing: '-0.02em',
                  margin: '0 0 10px',
                }}>
                  {t('auth.register.success.heading')}
                </h1>
                <p style={{ fontSize: '15px', color: '#888', margin: 0, lineHeight: 1.65 }}>
                  {t('auth.register.success.message', { email: actionData?.email })}
                </p>
              </div>
              <Link to="/auth/login" style={{ textDecoration: 'none', width: '100%' }}>
                <button style={{
                  width: '100%', padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: '#09090b', color: 'white',
                  border: 'none', cursor: 'pointer',
                  fontSize: '15px', fontWeight: 700, fontFamily: 'inherit',
                }}>
                  {t('auth.register.success.signInButton')}
                </button>
              </Link>
            </div>
          ) : (
            /* ── Registration form ── */
            <>
              <div style={{ marginBottom: '28px' }}>
                <h1 style={{
                  fontFamily: "'Lora', serif",
                  fontSize: '28px', fontWeight: 700,
                  color: '#0c0c0e', letterSpacing: '-0.02em',
                  margin: '0 0 7px',
                }}>
                  {t('auth.register.heading')}
                </h1>
                <p style={{ fontSize: '15px', color: '#999', margin: 0, lineHeight: 1.5 }}>
                  {t('auth.register.subheading')}
                </p>
              </div>

              {actionData?.error && (
                <div style={{ marginBottom: 20 }}>
                  <Alert color="red">{actionData.error}</Alert>
                </div>
              )}

              <Form method="post">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  <Field label={t('auth.register.nameLabel')} type="text" name="name" placeholder={t('auth.register.namePlaceholder')} required autoComplete="name" />
                  <Field label={t('auth.register.emailLabel')} type="email" name="email" placeholder={t('auth.register.emailPlaceholder')} required autoComplete="email" />
                  <Field label={t('auth.register.passwordLabel')} type="password" name="password" placeholder="••••••••" required autoComplete="new-password" />
                  <Field label={t('auth.register.confirmPasswordLabel')} type="password" name="confirm_password" placeholder="••••••••" required autoComplete="new-password" />
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      marginTop: 4, padding: '12px',
                      borderRadius: '10px',
                      backgroundColor: '#09090b', color: 'white',
                      border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '15px', fontWeight: 700, fontFamily: 'inherit',
                      opacity: loading ? 0.65 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {loading ? t('auth.register.submitting') : t('auth.register.submit')}
                  </button>
                </div>
              </Form>

              <p style={{ marginTop: 22, fontSize: '14px', color: '#999', textAlign: 'center', margin: '22px 0 0' }}>
                {t('auth.register.haveAccount')}{' '}
                <Link to="/auth/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 700 }}>
                  {t('auth.register.signIn')}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
