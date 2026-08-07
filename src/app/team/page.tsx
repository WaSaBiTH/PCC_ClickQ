import { getSheetData, getSetting } from "@/lib/google-sheets-api";
import MainNav from "@/components/main-nav";
import TeamSection from "@/components/team-section";

export const revalidate = 3600; // Revalidate every 3600 seconds

async function fetchTeamMembers() {
  try {
    const rawData = await getSheetData("Team_Members");
    const dataRows = rawData.slice(1);
    return dataRows.map((row: any[]) => ({
      teamType: row[0] || "",
      memberName: row[1] || "",
      role: row[2] || "",
      imageUrl: row[3] || "",
      contactLink: row[4] || "",
      status: row[5] || "Active",
    }));
  } catch (error) {
    console.error("Failed to fetch team members:", error);
    return [];
  }
}

export default async function TeamPage() {
  const [teamMembers, fbLink, igLink] = await Promise.all([
    fetchTeamMembers(),
    getSetting("fb_link"),
    getSetting("ig_link"),
  ]);

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 font-sans selection:bg-orange-500/30 flex flex-col">
      {/* Navbar/Header */}
      <MainNav fbLink={fbLink} igLink={igLink} />

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-24 pb-8 md:pt-32 md:pb-24 flex-1 flex flex-col justify-center">
        <TeamSection teamMembers={teamMembers} />
      </main>
    </div>
  );
}
