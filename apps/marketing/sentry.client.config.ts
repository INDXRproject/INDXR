import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@indxr/shared/lib/sentry-scrub";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // Privacy hardening (roadmap 1.31): errors stay, PII does not.
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
  // Session Replay OFF for launch — replay can capture sensitive on-screen content.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  integrations: [
    Sentry.feedbackIntegration({
      autoInject: false,
      showBranding: false,
      colorScheme: "system",
    }),
  ],
});
