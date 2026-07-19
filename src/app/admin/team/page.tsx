import TeamClient from "./TeamClient";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminTeamPage() {
  const cookieStore = await cookies();
  const auth = cookieStore.get("admin_auth");

  if (auth?.value !== "authenticated") {
    redirect("/admin/login");
  }

  return <TeamClient />;
}
