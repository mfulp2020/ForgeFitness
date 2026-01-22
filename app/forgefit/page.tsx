import ForgeFit from "../components/ForgeFit";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Page() {
  const devBypassAuth =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_FORGEFIT_DEV_BYPASS_AUTH === "1";

  if (devBypassAuth) {
    return <ForgeFit userId="dev" userFullName="Dev Preview" />;
  }

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await currentUser();
  const userFullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return <ForgeFit userId={userId} userFullName={userFullName} />;
}