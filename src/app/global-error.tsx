"use client";

export default function ErroGlobal({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          background: "#f1f5f9",
          color: "#0f172a",
          margin: 0,
          padding: "48px 24px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>SICED — falha ao iniciar a página</h1>
          <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.6 }}>
            O servidor encontrou um erro ao montar a aplicação. Em produção, quase sempre é a variável{" "}
            <code>DATABASE_URL</code> ausente ou o banco inacessível.
          </p>
          <pre
            style={{
              marginTop: 16,
              padding: 12,
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 12,
              overflowX: "auto",
            }}
          >
            {error.message}
            {error.digest ? `\n[dígito: ${error.digest}]` : ""}
          </pre>
          <p style={{ fontSize: 13, color: "#475569" }}>
            Verifique o diagnóstico em <a href="/diagnostico">/diagnostico</a> e o retorno de{" "}
            <a href="/api/health">/api/health</a>. Passo a passo em <code>DEPLOY.md</code>.
          </p>
        </div>
      </body>
    </html>
  );
}
