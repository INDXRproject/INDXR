export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md text-center space-y-4 p-8">
        <div className="text-4xl">🚫</div>
        <h1 className="text-2xl font-bold text-foreground">Account Suspended</h1>
        <p className="text-muted-foreground">
          Your account has been suspended. Contact{" "}
          <a
            href="mailto:support@indxr.ai"
            className="text-primary underline underline-offset-4"
          >
            support@indxr.ai
          </a>{" "}
          to resolve this.
        </p>
      </div>
    </div>
  )
}
