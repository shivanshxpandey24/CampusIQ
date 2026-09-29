import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import Workspace from "@/components/workspace";

export default async function WorkspacePage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return <Workspace user={user} />;
}
