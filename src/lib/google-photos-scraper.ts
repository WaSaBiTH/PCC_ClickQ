import { getApprovedGooglePhotosLinks } from "./google-sheets";
import { getSetting, getFallbackUrls } from "./google-sheets-api";

export async function scrapeSingleAlbum(albumUrl: string): Promise<any[]> {
  try {
    const response = await fetch(albumUrl, { 
      // Cache for 60 seconds
      next: { revalidate: 60 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch Google Photos Album URL: ${albumUrl}`);
      return [];
    }
    
    const html = await response.text();
    const regex = /(https:\/\/lh3\.googleusercontent\.com\/pw\/[a-zA-Z0-9\-_]+)/g;
    const matches = [...html.matchAll(regex)];
    
    if (matches.length > 0) {
      const uniqueUrls = Array.from(new Set(matches.map(m => m[1])));
      return uniqueUrls.map(url => ({
        id: url,
        name: 'scraped-photo',
        thumbnailLink: `${url}=w600-h800`,
        webContentLink: url
      }));
    }
  } catch (error) {
    console.error(`Error scraping Google Photos album ${albumUrl}:`, error);
  }
  return [];
}

export async function scrapeGooglePhotosAlbum(): Promise<any[]> {
  const fallbackEnvUrl = process.env.GOOGLE_PHOTOS_ALBUM_URL;
  let allImages: any[] = [];

  // 1. Try fetching from approved booking links first
  try {
    const approvedLinks = await getApprovedGooglePhotosLinks();
    if (approvedLinks.length > 0) {
      const urlsToScrape = approvedLinks.slice(0, 5); // Limit to 5
      for (const url of urlsToScrape) {
        const images = await scrapeSingleAlbum(url);
        allImages.push(...images);
      }
    }
  } catch (err) {
    console.error("Failed to get approved Google Photos links:", err);
  }

  // 2. If no images found from approved links, fallback to custom settings URLs
  if (allImages.length === 0) {
    try {
      // First try the new direct column B and E fallback
      const sheetUrls = await getFallbackUrls();
      let customUrls: string[] = [...sheetUrls];

      // Also support the old custom_background_urls setting just in case they used the UI
      const customUrlsStr = await getSetting("custom_background_urls");
      if (customUrlsStr) {
        const uiUrls = customUrlsStr.split(",").map(url => url.trim()).filter(url => url !== "");
        customUrls.push(...uiUrls);
      }

      customUrls = Array.from(new Set(customUrls)); // Deduplicate

      if (customUrls.length > 0) {
        const urlsToScrape = customUrls.slice(0, 5);
        for (const url of urlsToScrape) {
          const images = await scrapeSingleAlbum(url);
          allImages.push(...images);
        }
      }
    } catch (err) {
      console.error("Failed to get custom background URLs:", err);
    }
  }

  // 3. If still no images, fallback to .env URL
  if (allImages.length === 0 && fallbackEnvUrl) {
    try {
      const images = await scrapeSingleAlbum(fallbackEnvUrl);
      allImages.push(...images);
    } catch (err) {
      console.error("Failed to scrape fallback Env URL:", err);
    }
  }

  if (allImages.length === 0) {
    console.warn("No Google Photos Album URLs available or could be scraped. Falling back to default images.");
  }

  return allImages;
}
