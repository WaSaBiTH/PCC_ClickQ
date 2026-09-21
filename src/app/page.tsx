import { scrapeGooglePhotosAlbum } from "@/lib/google-photos-scraper";
import { getSheetData, getSettings } from "@/lib/google-sheets-api";
import IntroAnimation from "@/components/ui/scroll-morph-hero";
import HomeLayout from "@/components/home-layout";
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

export default async function Home() {
  const [images, teamMembers, settings] = await Promise.all([
    scrapeGooglePhotosAlbum(),
    fetchTeamMembers(),
    getSettings(["fb_link", "ig_link"]),
  ]);

  const fbLink = settings.fb_link;
  const igLink = settings.ig_link;

  const heroSection = (
    <div className="w-full h-full relative">
      <IntroAnimation images={images} />
    </div>
  );

  return (
    <HomeLayout 
      heroSection={heroSection} 
      teamSection={<TeamSection teamMembers={teamMembers} />}
      fbLink={fbLink}
      igLink={igLink}
    />
  );
}
