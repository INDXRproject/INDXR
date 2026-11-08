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
      <p className="font-mono text-xs uppercase tracking-[0.08em] text-fg-muted">Connect an app</p>
      <h1 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-fg-strong">{clientName}</h1>
      <p className="mt-1 text-sm text-fg-muted">wants to connect to your INDXR.AI account.</p>

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

      <p className="mt-4 text-xs text-fg-muted">You will be sent back to {redirectHost}.</p>

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
