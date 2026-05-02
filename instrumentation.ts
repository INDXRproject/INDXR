export async function register() {
  console.log('[INDXR-INSTRUMENTATION] register() called, runtime:', process.env.NEXT_RUNTIME);

  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log('[INDXR-INSTRUMENTATION] importing sentry.server.config');
    await import("./sentry.server.config");
    console.log('[INDXR-INSTRUMENTATION] sentry.server.config imported');
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
