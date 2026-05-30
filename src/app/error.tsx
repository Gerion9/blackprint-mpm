"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container" style={{ padding: "80px 0", textAlign: "center" }}>
      <h2 style={{ marginBottom: 12 }}>Algo salió mal</h2>
      <button className="pill navy press" onClick={reset} style={{ cursor: "pointer", border: 0 }}>
        Reintentar
      </button>
    </div>
  );
}
