import GalleryManagerClient from "./GalleryManagerClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Gallery | PhotoClubClickQ Admin",
};

export default function GalleryManagerPage() {
  return <GalleryManagerClient />;
}
