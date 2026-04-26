"use client";

export default function SentryTestPage() {
  return (
    <div style={{ padding: "2rem", fontFamily: "monospace" }}>
      <h1>Sentry Test</h1>
      <p style={{ marginBottom: "1rem", color: "#888" }}>
        Alleen voor verificatie — klik een knop en check het Sentry dashboard.
      </p>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <button
          onClick={() => {
            throw new Error("Sentry frontend test — client error");
          }}
          style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
        >
          Throw client error
        </button>
        <button
          onClick={async () => {
            const res = await fetch("/api/sentry-test");
            const data = await res.json();
            alert(JSON.stringify(data));
          }}
          style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
        >
          Trigger backend /sentry-test
        </button>
      </div>
    </div>
  );
}
