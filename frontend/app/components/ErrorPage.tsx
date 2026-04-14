import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Home, RefreshCw } from "lucide-react";

interface ErrorPageProps {
    status?: number;
    title?: string;
    description?: string;
}

type Palette = {
    accent: string;
    accentSoft: string;
    glowA: string;
    glowB: string;
};

const paletteFor = (status: number): Palette => {
    if (status === 404) {
        return {
            accent: "#2563eb",
            accentSoft: "#93c5fd",
            glowA: "rgba(37,99,235,0.18)",
            glowB: "rgba(124,58,237,0.12)",
        };
    }
    if (status === 403 || status === 401) {
        return {
            accent: "#d97706",
            accentSoft: "#fcd34d",
            glowA: "rgba(217,119,6,0.18)",
            glowB: "rgba(234,88,12,0.12)",
        };
    }
    if (status >= 500) {
        return {
            accent: "#dc2626",
            accentSoft: "#fca5a5",
            glowA: "rgba(220,38,38,0.18)",
            glowB: "rgba(124,58,237,0.1)",
        };
    }
    return {
        accent: "#475569",
        accentSoft: "#cbd5e1",
        glowA: "rgba(71,85,105,0.18)",
        glowB: "rgba(37,99,235,0.1)",
    };
};

export default function ErrorPage({ status = 500, title, description }: ErrorPageProps) {
    const { t } = useTranslation();

    const resolvedTitle =
        title ??
        (status === 404
            ? t("errors.notFoundTitle")
            : status === 403
                ? t("errors.forbiddenTitle")
                : status === 401
                    ? t("errors.unauthorizedTitle")
                    : status >= 500
                        ? t("errors.serverErrorTitle")
                        : t("errors.oops"));

    const resolvedDescription =
        description ??
        (status === 404
            ? t("errors.notFoundDescription")
            : status === 403
                ? t("errors.forbiddenDescription")
                : status === 401
                    ? t("errors.unauthorizedDescription")
                    : status >= 500
                        ? t("errors.serverErrorDescription")
                        : t("errors.unexpectedError"));

    const palette = paletteFor(status);

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "32px 24px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                backgroundColor: "#09090b",
                backgroundImage: `radial-gradient(ellipse at 20% 80%, ${palette.glowA} 0%, transparent 55%), radial-gradient(ellipse at 80% 15%, ${palette.glowB} 0%, transparent 50%)`,
                color: "#f0ede6",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Grid overlay */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.03,
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                    pointerEvents: "none",
                }}
            />

            {/* Top logo */}
            <Link
                to="/"
                style={{
                    position: "absolute",
                    top: 32,
                    left: 32,
                    zIndex: 2,
                    display: "inline-block",
                }}
            >
                <img
                    src="/logo.svg"
                    alt="Editex"
                    style={{ height: 28, filter: "brightness(0) invert(1)", opacity: 0.9 }}
                />
            </Link>

            <div
                style={{
                    position: "relative",
                    zIndex: 1,
                    maxWidth: 620,
                    width: "100%",
                    textAlign: "center",
                }}
            >
                {/* Status label */}
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 14px",
                        borderRadius: 999,
                        backgroundColor: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        fontSize: 11.5,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: palette.accentSoft,
                        marginBottom: 32,
                    }}
                >
                    <span
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            backgroundColor: palette.accent,
                            boxShadow: `0 0 12px ${palette.accent}`,
                        }}
                    />
                    {t("errors.errorCode", { status })}
                </div>

                {/* Big status number */}
                <h1
                    style={{
                        fontFamily: "'Lora', serif",
                        fontSize: "clamp(96px, 18vw, 180px)",
                        fontWeight: 700,
                        lineHeight: 0.95,
                        letterSpacing: "-0.04em",
                        margin: 0,
                        background: `linear-gradient(180deg, #f0ede6 0%, ${palette.accentSoft} 100%)`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                    }}
                >
                    {status}
                </h1>

                {/* Title */}
                <h2
                    style={{
                        fontFamily: "'Lora', serif",
                        fontSize: "clamp(26px, 4vw, 36px)",
                        fontWeight: 600,
                        margin: "24px 0 14px",
                        letterSpacing: "-0.02em",
                        color: "#f0ede6",
                    }}
                >
                    {resolvedTitle}
                </h2>

                {/* Description */}
                <p
                    style={{
                        fontSize: 16,
                        lineHeight: 1.65,
                        color: "rgba(240,237,230,0.6)",
                        margin: "0 auto 36px",
                        maxWidth: 460,
                    }}
                >
                    {resolvedDescription}
                </p>

                {/* Actions */}
                <div
                    style={{
                        display: "flex",
                        gap: 12,
                        justifyContent: "center",
                        flexWrap: "wrap",
                    }}
                >
                    <Link
                        to="/"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "12px 22px",
                            borderRadius: 10,
                            backgroundColor: palette.accent,
                            color: "#fff",
                            fontSize: 14.5,
                            fontWeight: 600,
                            textDecoration: "none",
                            boxShadow: `0 10px 30px -12px ${palette.accent}`,
                            transition: "transform 0.15s ease, box-shadow 0.15s ease",
                        }}
                    >
                        <Home size={16} />
                        {t("errors.backHome")}
                    </Link>

                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "12px 22px",
                            borderRadius: 10,
                            backgroundColor: "rgba(255,255,255,0.04)",
                            color: "#f0ede6",
                            border: "1px solid rgba(255,255,255,0.12)",
                            fontSize: 14.5,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "inherit",
                        }}
                    >
                        <ArrowLeft size={16} />
                        {t("errors.goBack")}
                    </button>

                    {status >= 500 && (
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "12px 22px",
                                borderRadius: 10,
                                backgroundColor: "rgba(255,255,255,0.04)",
                                color: "#f0ede6",
                                border: "1px solid rgba(255,255,255,0.12)",
                                fontSize: 14.5,
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                            }}
                        >
                            <RefreshCw size={16} />
                            {t("errors.tryAgain")}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
