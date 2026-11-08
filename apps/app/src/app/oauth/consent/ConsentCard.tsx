"use client";

import { useState, useTransition } from "react";
import { Button } from "@indxr/shared/components/ui/button";
import { approveOAuthAuthorization, denyOAuthAuthorization } from "./actions";

export function ConsentCard({
  authorizationId,
  clientName,
  redirectHost,
}: {
  authorizationId: string;
  clientName: string;
  redirectHost: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [acting, setActing] = useState<"approve" | "deny" | null>(null);

  const approve = () => {
    setActing("approve");
    startTransition(() => {
      approveOAuthAuthorization(authorizationId);
    });
  };
  const deny = () => {
    setActing("deny");
    startTransition(() => {
      denyOAuthAuthorization(authorizationId);
    });
  };

  return (
    <div className="mx-auto mt-16 max-w-md border-2 border-fg-strong bg-bg p-6">
      {/* The redirect host is shown larger than the client name — the app's display name is
          whatever the app itself chose at registration (untrustworthy); the host you'll actually
          be sent back to is the one fact this screen can verify, so it leads. */}
      <p className="font-mono text-xs uppercase tracking-[0.08em] text-fg-muted">Connect to INDXR.AI</p>
      <h1 className="mt-2 text-3xl font-bold tracking-[-0.02em] text-fg-strong break-all">{redirectHost}</h1>
      <p className="mt-2 text-sm text-fg-muted">
        "<span className="font-medium text-fg">{clientName}</span>" is requesting access to your account.
      </p>

      <div className="mt-5 border-2 border-border-strong p-4 text-sm text-fg">
        <p className="font-bold text-fg-strong">It will be able to:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Read your library: titles, transcripts, summaries, and sources</li>
        </ul>
        <p className="mt-3 font-bold text-fg-strong">It cannot:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Change or delete anything in your library</li>
          <li>Generate new transcripts or summaries (spend credits)</li>
          <li>Change your account or password</li>
        </ul>
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={deny} disabled={isPending}>
          {isPending && acting === "deny" ? "Declining…" : "Decline"}
        </Button>
        <Button className="flex-1" onClick={approve} disabled={isPending}>
          {isPending && acting === "approve" ? "Connecting…" : "Connect"}
        </Button>
      </div>
    </div>
  );
}
