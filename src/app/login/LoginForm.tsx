"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * LoginForm — gate editorial BlackPrint × Mirando por México.
 * POST /api/login con el password; 200 → router.replace(next); 401 → error inline.
 * Diseño: tarjeta blanca centrada (réplica del patrón "Módulo de Vivienda"):
 * wordmark BLACKPRINT (imagen) × pill Mirando por México, eyebrow, título display,
 * input, botón azul, footer "Gated Edge Middleware".
 */
interface Props {
  readonly nextUrl: string;
}

export function LoginForm({ nextUrl }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length === 0 || isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        const resp = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (resp.ok) {
          router.replace(safeRedirect(nextUrl));
          router.refresh();
          return;
        }
        setError(
          resp.status === 401
            ? "Contraseña incorrecta. Verifica con tu contacto de BlackPrint."
            : "No se pudo validar el acceso. Intenta de nuevo en un momento.",
        );
      } catch {
        setError("Sin conexión. Revisa tu red e intenta otra vez.");
      }
    });
  }

  return (
    <section
      aria-label="Acceso al reporte"
      className="page-enter"
      style={{
        width: "100%",
        maxWidth: 460,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 22,
        boxShadow: "var(--shadow-4)",
        padding: "40px 38px 30px",
        display: "flex",
        flexDirection: "column",
        gap: 22,
      }}
    >
      {/* Header — wordmark BLACKPRINT (imagen) × pill Mirando por México */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/blackprint-dark.png" alt="BlackPrint" style={{ height: 26, width: "auto" }} />
        <span aria-hidden="true" style={{ color: "var(--depth-3)", fontSize: 16, fontWeight: 300 }}>×</span>
        <span
          aria-label="Mirando por México"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 12px",
            background: "rgba(6,17,75,0.07)",
            border: "1px solid rgba(6,17,75,0.22)",
            borderRadius: "var(--r-pill)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/mpm-navy.svg" alt="" style={{ height: 14, width: "auto" }} />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "var(--mpm-navy)" }}>
            Mirando por México
          </span>
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, textAlign: "center" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--blue-p)",
            fontWeight: 600,
          }}
        >
          Plataforma de inteligencia territorial
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 30,
            lineHeight: 1.1,
            letterSpacing: "-0.025em",
            color: "var(--ink)",
          }}
        >
          Cirugía de catarata
          <br />
          <em style={{ fontStyle: "normal", color: "var(--blue-p)" }}>México · 2026</em>
        </h1>
        <p style={{ margin: "6px 0 0", fontFamily: "var(--font-body)", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-soft)" }}>
          Una colaboración de BlackPrint para{" "}
          <strong style={{ color: "var(--mpm-navy)", fontWeight: 700 }}>Mirando por México</strong>. Ingresa la
          contraseña de acceso para abrir el reporte editorial.
        </p>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label
          htmlFor="bp-pass"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--ink-soft)",
            fontWeight: 600,
          }}
        >
          Contraseña de acceso
        </label>
        <input
          id="bp-pass"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          spellCheck={false}
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? "bp-pass-error" : undefined}
          style={{
            padding: "13px 15px",
            background: "var(--surface)",
            border: `1px solid ${error ? "var(--coral)" : "var(--blue-p)"}`,
            borderRadius: "var(--r-md)",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            color: "var(--ink)",
            letterSpacing: "0.18em",
            outline: "none",
            transition: "var(--transition)",
            boxShadow: error ? "0 0 0 3px rgba(255,111,97,0.18)" : "0 0 0 3px rgba(8,117,227,0.10)",
          }}
        />
        {error ? (
          <span id="bp-pass-error" role="alert" style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--coral)", lineHeight: 1.4 }}>
            {error}
          </span>
        ) : null}
        <button
          type="submit"
          disabled={isPending || password.length === 0}
          className="press"
          style={{
            marginTop: 4,
            padding: "13px 16px",
            background: isPending || password.length === 0 ? "var(--surface-2)" : "var(--blue-p)",
            color: isPending || password.length === 0 ? "var(--ink-mute)" : "var(--on-primary)",
            border: "none",
            borderRadius: "var(--r-md)",
            fontFamily: "var(--font-ui)",
            fontSize: 14.5,
            fontWeight: 600,
            letterSpacing: "0.01em",
            cursor: isPending || password.length === 0 ? "not-allowed" : "pointer",
            transition: "var(--transition)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: isPending || password.length === 0 ? "none" : "0 2px 10px rgba(8,117,227,0.28)",
          }}
        >
          {isPending ? "Verificando…" : "Ingresar al dashboard"}
          {!isPending ? <span aria-hidden>→</span> : null}
        </button>
      </form>

      <div
        style={{
          paddingTop: 18,
          borderTop: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          fontWeight: 600,
        }}
      >
        <span>Conexión segura · Gated Edge Middleware</span>
        <span>© 2026 BlackPrint</span>
      </div>
    </section>
  );
}

function safeRedirect(target: string): string {
  if (!target.startsWith("/") || target.startsWith("//")) return "/";
  return target;
}
