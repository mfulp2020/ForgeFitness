import ForgeFit from "@/app/components/ForgeFit";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const devBypassAuth =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_FORGEFIT_DEV_BYPASS_AUTH === "1";

  if (devBypassAuth) {
    redirect("/forgefit");
  }

  if (!clerkEnabled) {
    return (
      <main className="min-h-screen">
        <ForgeFit />
      </main>
    );
  }

  const { userId } = await auth();
  if (userId) redirect("/forgefit");
  redirect("/sign-in");
}
