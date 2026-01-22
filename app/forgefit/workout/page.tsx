import ForgeFit from "../../components/ForgeFit";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Page() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await currentUser();
  const userFullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return <ForgeFit userId={userId} userFullName={userFullName} focusMode />;
}
