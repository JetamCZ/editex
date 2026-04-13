import { useState } from 'react';
import { Link, redirect, useActionData, useNavigation, Form } from 'react-router';
import type { ActionFunctionArgs } from "react-router";
import api from '../lib/axios.server';
import delay from "~/lib/delay";
import { commitSession, getSession } from "~/lib/sessions.server";
import { useTranslation } from 'react-i18next';
import i18n from '~/i18n';

export function meta() {
  return [
    { title: i18n.t('auth.login.meta.title') },
    { name: "description", content: i18n.t('auth.login.meta.description') },
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
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'resend-verification') {
    try {
      const email = formData.get('email');
      await api.post('/auth/resend-verification', { email });
      return { verificationSent: true, email: email as string };
    } catch {
      return { error: 'Failed to resend verification email. Please try again.' };
    }
  }

  try {
    const response = await api.post<{ token: string }>('/auth/login', formData);
    const session = await getSession(request);
    session.set("token", response.data?.token);
    return redirect("/dashboard", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  } catch (err: any) {
    if (err.response?.status === 403 && err.response?.data?.error === 'Email not verified') {
      return {
        emailNotVerified: true,
        email: err.response?.data?.email,
        error: err.response?.data?.message,
      };
    }
    return {
      error: err.response?.data?.message || err.response?.data?.error || 'Login failed. Please try again.',
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

export default function Login() {
  const { t } = useTranslation();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const loading = navigation.state !== "idle";

  const error = actionData?.error;
  const emailNotVerified = actionData?.emailNotVerified;
  const verificationSent = actionData?.verificationSent;

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

      {/* ── Right: form panel ────────────────────────────────────── */}
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

          <div style={{ marginBottom: '28px' }}>
            <h1 style={{
              fontFamily: "'Lora', serif",
              fontSize: '28px', fontWeight: 700,
              color: '#0c0c0e', letterSpacing: '-0.02em',
              margin: '0 0 7px',
            }}>
              {t('auth.login.heading')}
            </h1>
            <p style={{ fontSize: '15px', color: '#999', margin: 0, lineHeight: 1.5 }}>
              {t('auth.login.subheading')}
            </p>
          </div>

          {/* Alerts */}
          {verificationSent && (
            <div style={{ marginBottom: 20 }}>
              <Alert color="green">
                {t('auth.login.verificationSent', { email: actionData?.email })}
              </Alert>
            </div>
          )}

          {emailNotVerified && !verificationSent && (
            <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Alert color="amber">{error}</Alert>
              <Form method="post">
                <input type="hidden" name="intent" value="resend-verification" />
                <input type="hidden" name="email" value={actionData?.email || ''} />
                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '10px',
                  borderRadius: '8px',
                  border: '1.5px solid #e0ddd7',
                  backgroundColor: 'white', color: '#444',
                  fontSize: '14px', fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: loading ? 0.7 : 1,
                }}>
                  {loading ? t('auth.login.resendSending') : t('auth.login.resendButton')}
                </button>
              </Form>
            </div>
          )}

          {error && !emailNotVerified && (
            <div style={{ marginBottom: 20 }}>
              <Alert color="red">{error}</Alert>
            </div>
          )}

          {/* Form */}
          <Form method="post">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <Field label={t('auth.login.emailLabel')} type="email" name="email" placeholder={t('auth.login.emailPlaceholder')} required autoComplete="email" />
              <Field label={t('auth.login.passwordLabel')} type="password" name="password" placeholder="••••••••" required autoComplete="current-password" />
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 4,
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: '#09090b',
                  color: 'white', border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '15px', fontWeight: 700,
                  fontFamily: 'inherit',
                  opacity: loading ? 0.65 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {loading ? t('auth.login.submitting') : t('auth.login.submit')}
              </button>
            </div>
          </Form>

          {/* Footer links */}
          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 11, textAlign: 'center' }}>
            <Link to="/auth/forgot-password" style={{ fontSize: '14px', color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
              {t('auth.login.forgotPassword')}
            </Link>
            <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
              {t('auth.login.noAccount')}{' '}
              <Link to="/auth/register" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 700 }}>
                {t('auth.login.createAccount')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
