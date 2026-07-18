import { getGalleryImages } from "@/lib/google-drive";
import Image from "next/image";
import SocialCards from "@/components/ui/card-fan-carousel";
import IntroAnimation from "@/components/ui/scroll-morph-hero";
import HomeLayout from "@/components/home-layout";

export const revalidate = 60; // Revalidate every 60 seconds

const GAS_URL = process.env.GAS_URL || "";

async function fetchTeamMembers() {
  try {
    const res = await fetch(`${GAS_URL}?action=getTeamMembers`, { cache: 'no-store' });
    const result = await res.json();
    if (result.status === "success") {
      return result.data.map((row: any[]) => ({
        teamType: row[0] || "",
        memberName: row[1] || "",
        role: row[2] || "",
        bio: row[3] || "",
        imageUrl: row[4] || "",
        contactLink: row[5] || "",
      }));
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch team members:", error);
    return [];
  }
}

export default async function Home() {
  const [images, teamMembers] = await Promise.all([
    getGalleryImages(),
    fetchTeamMembers(),
  ]);

  const sheetCards = teamMembers.filter((m: any) => m.memberName).map((member: any) => ({
    imgUrl: member.imageUrl || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=700&fit=crop", 
    alt: member.memberName,
    title: member.memberName,
    description: member.role,
    linkUrl: member.contactLink || undefined,
    tags: member.teamType ? member.teamType.split(',').map((t: string) => t.trim()) : [],
  }));

  const DEMO_CARDS = [
    { imgUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=700&fit=crop", alt: "Mountain landscape", tags: ["ถ่ายรูป"], title: "น้องเอ", description: "CE03" },
    { imgUrl: "https://images.unsplash.com/photo-1511765224389-37f0e77cf0eb?w=400&h=700&fit=crop", alt: "City night", tags: ["วิดีโอ", "ตัดต่อ"], title: "พี่บี", description: "ITE01" },
    { imgUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=700&fit=crop", alt: "Foggy forest", tags: ["ไลฟ์", "ถ่ายรูป"], title: "อาจารย์ซี", description: "บุคลากร" },
    { imgUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=700&fit=crop", alt: "Sunlit woods", tags: ["วิดีโอ"], title: "น้องดี", description: "CPE02" },
    { imgUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=700&fit=crop", alt: "Tropical beach", tags: ["ถ่ายรูป"], title: "พี่อี", description: "MTA04" },
    { imgUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=700&fit=crop", alt: "Starry mountain", tags: ["ไลฟ์"], title: "น้องเอฟ", description: "CE03" },
    { imgUrl: "https://images.unsplash.com/photo-1476820865390-c52aeebb9891?w=400&h=700&fit=crop", alt: "Golden sunset", tags: ["วิดีโอ", "ถ่ายรูป"], title: "พี่จี", description: "ITE02" },
    { imgUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400&h=700&fit=crop", alt: "Lake reflection", tags: ["ถ่ายรูป"], title: "น้องเอช", description: "CPE01" },
    { imgUrl: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&h=700&fit=crop", alt: "Green valley", tags: ["วิดีโอ"], title: "เจ้าหน้าที่เจ", description: "บุคลากร" },
    { imgUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=700&fit=crop", alt: "Sunbeam nature", tags: ["ไลฟ์", "วิดีโอ"], title: "น้องเค", description: "CE04" },
  ];

  // Pad the team cards with demo cards so the carousel is always full and pagination works
  const displayCards: any[] = [...sheetCards];
  let demoIndex = 0;
  while (displayCards.length < 10) {
    displayCards.push(DEMO_CARDS[demoIndex % DEMO_CARDS.length]);
    demoIndex++;
  }

  const heroSection = (
    <div className="w-full h-full relative">
      <IntroAnimation images={images} />
    </div>
  );

  const teamSection = (
    <div className="w-full h-full flex flex-col justify-center">
      <div className="container mx-auto px-4 mb-4 text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-2 tracking-tight">ทำความรู้จักกับทีมงานของเรา</h2>
        <p className="text-slate-500 text-sm md:text-lg max-w-2xl mx-auto">
          พบกับทีมช่างภาพ วิดีโอ ครีเอทีฟ และผู้อยู่เบื้องหลังผลงานทั้งหมดของทีม
        </p>
      </div>
      <SocialCards cards={displayCards} />
    </div>
  );

  return (
    <HomeLayout heroSection={heroSection} teamSection={teamSection} />
  );
}
