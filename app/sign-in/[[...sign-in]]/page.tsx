import { SignIn } from "@clerk/nextjs";

export default function Page() {
  const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!clerkEnabled) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border p-5">
          <div className="text-lg font-semibold">Accounts not configured</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Set <span className="font-mono">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</span> and{' '}
            <span className="font-mono">CLERK_SECRET_KEY</span> in your environment, then restart the dev server.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-6">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/forgefit"
      />
    </main>
  );
}
