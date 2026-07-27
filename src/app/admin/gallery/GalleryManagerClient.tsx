"use client";
import { useState, useEffect } from "react";
import { Loader2, AlertCircle, Edit, Trash2, Plus, Image as ImageIcon, Pencil, Check, ChevronDown } from "lucide-react";
import AdminNav from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { getThaiNow, formatThaiDate, diffDaysThai, parseThaiDateToIso } from "@/lib/date-utils";
import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";

type GalleryItem = {
  rowIndex: number;
  name: string;
  serviceType: string;
  dateStr: string;
  link: string;
  facebookLink: string;
  igLink: string;
};

export type SocialLink = {
  platform: "Facebook" | "Instagram" | "Google Drive" | "YouTube";
  type: string;
  url: string;
};

const getCroppedImg = async (imageSrc: string, pixelCrop: any, rotation = 0): Promise<File> => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");

  const safeArea = Math.max(image.width, image.height) * 2;
  canvas.width = safeArea;
  canvas.height = safeArea;
  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);
  ctx.drawImage(image, safeArea / 2 - image.width * 0.5, safeArea / 2 - image.height * 0.5);

  const data = ctx.getImageData(0, 0, safeArea, safeArea);
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas is empty"));
        return;
      }
      resolve(new File([blob], "cover.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  });
};

const isValidUrl = (url: string) => {
  if (!url || url.trim() === "") return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (e) {
    return false;
  }
};

export default function GalleryManagerClient() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isEditingLink, setIsEditingLink] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [navigatingAction, setNavigatingAction] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{ show: boolean, item: GalleryItem | null, newLink: string, socialLinks: SocialLink[] }>({ show: false, item: null, newLink: '', socialLinks: [] });
  const [addModal, setAddModal] = useState<{ show: boolean, name: string, serviceType: string, dateStr: string, newLink: string, socialLinks: SocialLink[] }>({ show: false, name: '', serviceType: '', dateStr: new Date().toISOString().split('T')[0], newLink: '', socialLinks: [] });

  // Custom Toast Notification State
  const [toast, setToast] = useState<{ show: boolean, type: 'success' | 'error', message: string }>({ show: false, type: 'success', message: '' });

  // Upload Cover State for Add Modal
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/admin/gallery", { cache: 'no-store' });
      if (!res.ok) {
        throw new Error("Failed to fetch gallery items");
      }
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleDelete = async (rowIndex: number) => {
    setConfirmDelete(null);
    setIsDeleting(rowIndex);
    try {
      const res = await fetch(`/api/admin/gallery?rowIndex=${rowIndex}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Album deleted successfully.");
        await fetchItems();
      } else {
        const data = await res.json();
        showToast(`Failed to delete: ${data.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Error connecting to server`, 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  const openEditModal = (item: GalleryItem) => {
    const parsedLinks: SocialLink[] = [];
    
    const parseLinkStr = (str: string, defaultPlatform: "Facebook" | "Instagram") => {
      if (!str) return;
      str.split(',').forEach(l => {
        const trimmed = l.trim();
        if (!trimmed) return;
        const parts = trimmed.split('|');
        if (parts.length > 1) {
          const type = parts[0].trim();
          const url = parts.slice(1).join('|').trim();
          let platform: "Facebook" | "Instagram" | "Google Drive" | "YouTube" = defaultPlatform;
          if (type === "Google Drive") platform = "Google Drive";
          else if (type === "YouTube") platform = "YouTube";
          parsedLinks.push({ platform, type, url });
        } else {
          parsedLinks.push({ platform: defaultPlatform, type: "ลิงก์", url: trimmed });
        }
      });
    };
    
    parseLinkStr(item.facebookLink, "Facebook");
    parseLinkStr(item.igLink, "Instagram");
    
    setEditModal({ show: true, item, newLink: item.link, socialLinks: parsedLinks });
  };

  const saveEditedLink = async () => {
    if (!editModal.item) return;
    const { item, newLink, socialLinks } = editModal;
    
    const fbLinks = socialLinks.filter(l => (l.platform === "Facebook" || l.platform === "Google Drive" || l.platform === "YouTube") && l.url.trim() !== "");
    const igLinks = socialLinks.filter(l => l.platform === "Instagram" && l.url.trim() !== "");
    
    const facebookLink = fbLinks.map(l => `${l.type}|${l.url.trim()}`).join(",");
    const igLink = igLinks.map(l => `${l.type}|${l.url.trim()}`).join(",");
    
    setIsEditingLink(item.rowIndex);
    setEditModal({ show: false, item: null, newLink: '', socialLinks: [] });
    
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndex: item.rowIndex, link: newLink.trim(), facebookLink, igLink }),
      });
      if (res.ok) {
        setItems(prev => prev.map(i => i.rowIndex === item.rowIndex ? { ...i, link: newLink.trim(), facebookLink, igLink } : i));
        showToast("Link updated successfully.");
      } else {
        const data = await res.json();
        showToast(`Failed to update link: ${data.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Error connecting to server`, 'error');
    } finally {
      setIsEditingLink(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => setImageSrc(reader.result?.toString() || null));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleUploadCover = async () => {
    try {
      setIsUploadingCover(true);
      const croppedImage = await getCroppedImg(imageSrc!, croppedAreaPixels, rotation);
      const compressedFile = await imageCompression(croppedImage, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });
      const formData = new FormData();
      formData.append("file", compressedFile);
      formData.append("uploadType", "booking");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (result.success) {
        setAddModal(prev => ({ ...prev, newLink: result.url }));
        setImageSrc(null);
      } else {
        showToast("อัปโหลดไม่สำเร็จ: " + result.error, "error");
      }
    } catch (e) {
      console.error(e);
      showToast("เกิดข้อผิดพลาดในการอัปโหลดรูปปก", "error");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const openAddModal = () => {
    setAddModal({ 
      show: true, 
      name: '', 
      serviceType: '', 
      dateStr: new Date().toISOString().split('T')[0], 
      newLink: '', 
      socialLinks: [] 
    });
  };

  const saveNewAlbum = async () => {
    const { name, serviceType, dateStr, newLink, socialLinks } = addModal;
    if (!name.trim() || !dateStr || !serviceType.trim()) {
      showToast("กรุณากรอกข้อมูลบังคับให้ครบ (ชื่อ, ประเภทงาน, วันที่)", 'error');
      return;
    }
    
    setIsAdding(true);
    
    const fbLinks = socialLinks.filter(l => (l.platform === "Facebook" || l.platform === "Google Drive" || l.platform === "YouTube") && l.url.trim() !== "");
    const igLinks = socialLinks.filter(l => l.platform === "Instagram" && l.url.trim() !== "");
    
    const facebookLink = fbLinks.map(l => `${l.type}|${l.url.trim()}`).join(",");
    const igLink = igLinks.map(l => `${l.type}|${l.url.trim()}`).join(",");
    
    setAddModal({ show: false, name: '', serviceType: '', dateStr: new Date().toISOString().split('T')[0], newLink: '', socialLinks: [] });
    
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), serviceType, dateStr, link: newLink.trim(), facebookLink, igLink }),
      });
      if (res.ok) {
        showToast("Album added successfully.");
        await fetchItems();
      } else {
        const data = await res.json();
        showToast(`Failed to add album: ${data.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Error connecting to server`, 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const renderSocialLinks = (rawLinks: string, colorClass: string, platformName: string) => {
    if (!rawLinks || rawLinks === "-") return <span className="text-slate-400">-</span>;
    
    const links = rawLinks.split(',').map(l => {
      const trimmed = l.trim();
      if (!trimmed) return null;
      const parts = trimmed.split('|');
      if (parts.length > 1) {
        return { type: parts[0].trim(), url: parts.slice(1).join('|').trim() };
      }
      return { type: 'ลิงก์', url: trimmed };
    }).filter(Boolean) as { type: string, url: string }[];
  
    if (links.length === 0) return <span className="text-slate-400">-</span>;
  
    if (links.length === 1) {
      return (
        <a 
          href={links[0].url} 
          target="_blank" 
          rel="noreferrer"
          className={`${colorClass} hover:underline text-sm truncate block max-w-[150px] sm:max-w-[200px]`}
          title={links[0].url}
        >
          {links[0].type !== 'ลิงก์' ? `${links[0].type}` : platformName}
        </a>
      );
    }
  
    return (
      <div className="relative group">
        <button className={`${colorClass} hover:underline text-sm flex items-center gap-1`}>
          {links.length} Links <ChevronDown className="w-3 h-3" />
        </button>
        <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
          {links.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className={`block px-4 py-2 text-sm ${colorClass} hover:bg-slate-50 border-b border-slate-50 last:border-0 truncate`}
              title={l.url}
            >
              {l.type}
            </a>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <AdminNav activePage="gallery" />
      <div className="p-4 sm:p-8 pt-0 max-w-[1400px] mx-auto space-y-6 w-full flex-1 min-w-0">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Manage Gallery</h1>
            <p className="text-slate-500 mt-1">Remove old or broken albums from the public gallery</p>
          </div>
          <button 
            onClick={openAddModal}
            disabled={isAdding}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap w-fit disabled:opacity-50"
          >
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Add New Album</span>
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Loading gallery items...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-500">
              <AlertCircle className="w-8 h-8 mb-4" />
              <p>Error: {error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <p>No albums found in the Gallery sheet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar pb-1 w-full">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 sm:px-6 py-4 font-semibold text-slate-700">Name</th>
                    <th className="px-4 sm:px-6 py-4 font-semibold text-slate-700">Type</th>
                    <th className="px-4 sm:px-6 py-4 font-semibold text-slate-700">Date</th>
                    <th className="px-4 sm:px-6 py-4 font-semibold text-slate-700">Link</th>
                    <th className="px-4 sm:px-6 py-4 font-semibold text-slate-700">Facebook</th>
                    <th className="px-4 sm:px-6 py-4 font-semibold text-slate-700">Instagram</th>
                    <th className="px-4 sm:px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const itemDate = new Date(item.dateStr);
                    const isOld = !isNaN(itemDate.getTime()) && (Date.now() - itemDate.getTime() > 365 * 24 * 60 * 60 * 1000);
                    
                    return (
                      <tr key={item.rowIndex} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 sm:px-6 py-4">
                          <div className="font-medium text-slate-900 flex items-center gap-2">
                            {item.name}
                            {isOld && (
                              <div className="text-red-500" title="This album is older than 1 year and might be deleted.">
                                <AlertCircle className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className="text-xs font-bold px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full tracking-wider uppercase inline-block">
                            {item.serviceType || "N/A"}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-slate-600 text-sm">
                          {item.dateStr && !isNaN(new Date(item.dateStr).getTime()) 
                            ? `${format(new Date(item.dateStr), 'dd MMM ', { locale: th })}${new Date(item.dateStr).getFullYear() + 543}`
                            : item.dateStr || "Unknown Date"}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <a 
                            href={item.link} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-orange-600 hover:text-orange-700 hover:underline text-sm truncate block max-w-[150px] sm:max-w-[200px]"
                            title={item.link}
                          >
                            {item.link || "No Link"}
                          </a>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          {renderSocialLinks(item.facebookLink, "text-blue-600", "Facebook")}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          {renderSocialLinks(item.igLink, "text-pink-600", "Instagram")}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(item)}
                              disabled={isEditingLink === item.rowIndex || isDeleting === item.rowIndex}
                              className={`inline-flex items-center justify-center p-2 rounded-lg transition-colors ${
                                isEditingLink === item.rowIndex
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'text-blue-500 hover:bg-blue-50'
                              }`}
                              title="Edit Link"
                            >
                              {isEditingLink === item.rowIndex ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => {
                                if (confirmDelete === item.rowIndex) {
                                  handleDelete(item.rowIndex);
                                } else {
                                  setConfirmDelete(item.rowIndex);
                                  setTimeout(() => {
                                    setConfirmDelete((prev) => prev === item.rowIndex ? null : prev);
                                  }, 3000);
                                }
                              }}
                              disabled={isDeleting === item.rowIndex || isEditingLink === item.rowIndex}
                              className={`inline-flex items-center justify-center p-2 rounded-lg transition-colors ${
                                isDeleting === item.rowIndex 
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                  : confirmDelete === item.rowIndex
                                    ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                                    : 'text-red-500 hover:bg-red-50'
                              }`}
                              title={confirmDelete === item.rowIndex ? "Click again to confirm delete" : "Delete Album"}
                            >
                              {isDeleting === item.rowIndex ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Global Toast Notification */}
        {toast.show && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border ${
              toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className={`p-1 rounded-full ${toast.type === 'success' ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                {toast.type === 'success' ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <p className="font-semibold">{toast.message}</p>
            </div>
          </div>
        )}

        {/* Edit Link Modal */}
        {editModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Edit Link</h3>
                <p className="text-sm text-slate-500 mt-1">Update the public gallery link for <span className="font-semibold text-slate-700">{editModal.item?.name}</span></p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Google Photos link</label>
                    <input
                      type="text"
                      value={editModal.newLink}
                      onChange={(e) => setEditModal(prev => ({ ...prev, newLink: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEditModal({ show: false, item: null, newLink: '', socialLinks: [] });
                      }}
                      placeholder="https://photos.app.goo.gl/..."
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-shadow text-slate-900 placeholder:text-slate-400 ${editModal.newLink && !isValidUrl(editModal.newLink) ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                    />
                    {editModal.newLink && !isValidUrl(editModal.newLink) && (
                      <p className="text-xs text-red-500 mt-1">กรุณากรอกลิงก์ที่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)</p>
                    )}
                  </div>
                  
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-700">ลิงก์ Social Media</label>
                      <button 
                        onClick={() => {
                          setEditModal(prev => ({
                            ...prev,
                            socialLinks: [...prev.socialLinks, { platform: "Facebook", type: "รูปถ่าย", url: "" }]
                          }));
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Link
                      </button>
                    </div>
                    
                    <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                      {editModal.socialLinks.map((link, idx) => (
                        <div key={idx} className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg relative group">
                          <div className="flex items-center gap-2">
                            <select 
                              value={link.platform}
                              onChange={(e) => {
                                const newLinks = [...editModal.socialLinks];
                                newLinks[idx].platform = e.target.value as "Facebook" | "Instagram" | "Google Drive" | "YouTube";
                                if (newLinks[idx].platform === "Google Drive" || newLinks[idx].platform === "YouTube") {
                                  newLinks[idx].type = newLinks[idx].platform;
                                } else if (newLinks[idx].type === "Google Drive" || newLinks[idx].type === "YouTube") {
                                  newLinks[idx].type = "รูปถ่าย";
                                }
                                setEditModal(prev => ({ ...prev, socialLinks: newLinks }));
                              }}
                              className={`${(link.platform === 'Google Drive' || link.platform === 'YouTube') ? 'w-full' : 'w-1/2'} p-2 text-xs border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                            >
                              <option value="Facebook">Facebook</option>
                              <option value="Instagram">Instagram</option>
                              <option value="Google Drive">Google Drive</option>
                              <option value="YouTube">YouTube</option>
                            </select>
                            
                            {(link.platform !== "Google Drive" && link.platform !== "YouTube") && (
                              <select 
                                value={link.type}
                                onChange={(e) => {
                                  const newLinks = [...editModal.socialLinks];
                                  newLinks[idx].type = e.target.value;
                                  setEditModal(prev => ({ ...prev, socialLinks: newLinks }));
                                }}
                                className="w-1/2 p-2 text-xs border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                              >
                                <option value="รูปถ่าย">รูปถ่าย (Photo)</option>
                                <option value="วิดีโอ">วิดีโอ (Video)</option>
                                <option value="ไลฟ์">ไลฟ์ (Live)</option>
                                <option value="อัลบั้มรวม">อัลบั้มรวม</option>
                                <option value="อื่นๆ">อื่นๆ</option>
                              </select>
                            )}
                            
                            <button 
                              onClick={() => {
                                const newLinks = editModal.socialLinks.filter((_, i) => i !== idx);
                                setEditModal(prev => ({ ...prev, socialLinks: newLinks }));
                              }}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div>
                            <input 
                              type="url" 
                              value={link.url}
                              onChange={(e) => {
                                const newLinks = [...editModal.socialLinks];
                                newLinks[idx].url = e.target.value;
                                setEditModal(prev => ({ ...prev, socialLinks: newLinks }));
                              }}
                              placeholder={
                                link.platform === "YouTube" ? "https://www.youtube.com/watch?v=..." :
                                link.platform === "Google Drive" ? "https://drive.google.com/..." :
                                `วางลิงก์โพสต์ ${link.platform} ที่นี่...`
                              }
                              className={`w-full p-2 text-xs border rounded-md focus:ring-2 focus:ring-blue-500 outline-none ${link.url && !isValidUrl(link.url) ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-white'}`}
                            />
                            {link.url && !isValidUrl(link.url) && (
                              <p className="text-[10px] text-red-500 mt-1">กรุณากรอกลิงก์ที่ถูกต้อง (http:// หรือ https://)</p>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {editModal.socialLinks.length === 0 && (
                        <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 border border-slate-100 border-dashed rounded-lg">
                          ไม่มีลิงก์ Social Media
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setEditModal({ show: false, item: null, newLink: '', socialLinks: [] })}
                  className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditedLink}
                  disabled={
                    (editModal.newLink !== "" && !isValidUrl(editModal.newLink)) ||
                    editModal.socialLinks.some(l => !isValidUrl(l.url))
                  }
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-sm transition-colors flex items-center justify-center"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Album Modal */}
        {addModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 shrink-0">
                <h3 className="text-lg font-bold text-slate-900">Add New Album</h3>
                <p className="text-sm text-slate-500 mt-1">Add a new album directly to the public gallery</p>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={addModal.name}
                      onChange={(e) => setAddModal(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="ชื่ออัลบั้ม"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-shadow text-slate-900"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Service Type <span className="text-red-500">*</span></label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {["ถ่ายรูป", "วิดีโอ", "ไลฟ์สตรีม"].map(service => {
                          const isSelected = addModal.serviceType.includes(service);
                          return (
                            <button
                              key={service}
                              type="button"
                              onClick={() => {
                                let currentServices = addModal.serviceType ? addModal.serviceType.split(', ').filter(s => s) : [];
                                if (isSelected) {
                                  currentServices = currentServices.filter(s => s !== service);
                                } else {
                                  currentServices.push(service);
                                }
                                setAddModal(prev => ({ ...prev, serviceType: currentServices.join(', ') }));
                              }}
                              className={`px-3 py-1.5 text-xs rounded-full border transition-colors flex items-center ${
                                isSelected 
                                  ? 'bg-orange-100 border-orange-200 text-orange-700 font-medium' 
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 mr-1" />}
                              {service}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Date <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        value={addModal.dateStr}
                        onChange={(e) => setAddModal(prev => ({ ...prev, dateStr: e.target.value }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="mb-6 p-4 bg-orange-50 border border-orange-100 rounded-xl">
                    <h4 className="text-sm font-bold text-orange-800 mb-2">Gallery cover (เลือกอย่างใดอย่างหนึ่ง)</h4>
                    <p className="text-xs text-orange-600 mb-3">หากไม่มีลิงก์ Google Photos สามารถอัปโหลดรูปปกแทนได้ (ถ้าอัปโหลด ระบบจะใช้รูปนี้แทนลิงก์อัลบั้ม)</p>
                    
                    {addModal.newLink && addModal.newLink.includes("drive.google.com") ? (
                      <div className="relative w-full aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 mb-3 max-w-[250px] mx-auto">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={addModal.newLink} alt="Cover" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => setAddModal(prev => ({ ...prev, newLink: "" }))}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 shadow-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : imageSrc ? (
                      <div className="flex flex-col gap-4 mb-4">
                        <div className="relative w-full h-64 bg-slate-900 rounded-lg overflow-hidden">
                          <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            rotation={rotation}
                            aspect={3 / 4}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                            onRotationChange={setRotation}
                          />
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1 block">Zoom</label>
                            <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1 block">Rotate</label>
                            <input type="range" value={rotation} min={0} max={360} step={1} onChange={(e) => setRotation(Number(e.target.value))} className="w-full" />
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setImageSrc(null)} className="w-1/2 rounded-xl">ยกเลิก</Button>
                            <Button size="sm" onClick={handleUploadCover} disabled={isUploadingCover} className="w-1/2 bg-orange-600 hover:bg-orange-700 rounded-xl text-white">
                              {isUploadingCover ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                              บันทึกรูปปก
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-xl file:border-0
                            file:text-sm file:font-semibold
                            file:bg-orange-100 file:text-orange-700
                            hover:file:bg-orange-200 transition-colors"
                        />
                      </div>
                    )}
                    
                    <label className="block text-sm font-medium text-slate-700 mb-2">หรือใช้ Google Photos link</label>
                    <input
                      type="text"
                      value={addModal.newLink}
                      onChange={(e) => setAddModal(prev => ({ ...prev, newLink: e.target.value }))}
                      placeholder="https://photos.app.goo.gl/..."
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-shadow text-slate-900 placeholder:text-slate-400 ${addModal.newLink && !isValidUrl(addModal.newLink) ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                    />
                    {addModal.newLink && !isValidUrl(addModal.newLink) && (
                      <p className="text-xs text-red-500 mt-1">กรุณากรอกลิงก์ที่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)</p>
                    )}
                  </div>
                  
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-700">ลิงก์ Social Media</label>
                      <button 
                        onClick={() => {
                          setAddModal(prev => ({
                            ...prev,
                            socialLinks: [...prev.socialLinks, { platform: "Facebook", type: "รูปถ่าย", url: "" }]
                          }));
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Link
                      </button>
                    </div>
                    
                    <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                      {addModal.socialLinks.map((link, idx) => (
                        <div key={idx} className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg relative group">
                          <div className="flex items-center gap-2">
                            <select 
                              value={link.platform}
                              onChange={(e) => {
                                const newLinks = [...addModal.socialLinks];
                                newLinks[idx].platform = e.target.value as "Facebook" | "Instagram" | "Google Drive" | "YouTube";
                                if (newLinks[idx].platform === "Google Drive" || newLinks[idx].platform === "YouTube") {
                                  newLinks[idx].type = newLinks[idx].platform;
                                } else if (newLinks[idx].type === "Google Drive" || newLinks[idx].type === "YouTube") {
                                  newLinks[idx].type = "รูปถ่าย";
                                }
                                setAddModal(prev => ({ ...prev, socialLinks: newLinks }));
                              }}
                              className={`${(link.platform === 'Google Drive' || link.platform === 'YouTube') ? 'w-full' : 'w-1/2'} p-2 text-xs border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                            >
                              <option value="Facebook">Facebook</option>
                              <option value="Instagram">Instagram</option>
                              <option value="Google Drive">Google Drive</option>
                              <option value="YouTube">YouTube</option>
                            </select>
                            
                            {(link.platform !== "Google Drive" && link.platform !== "YouTube") && (
                              <select 
                                value={link.type}
                                onChange={(e) => {
                                  const newLinks = [...addModal.socialLinks];
                                  newLinks[idx].type = e.target.value;
                                  setAddModal(prev => ({ ...prev, socialLinks: newLinks }));
                                }}
                                className="w-1/2 p-2 text-xs border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                              >
                                <option value="รูปถ่าย">รูปถ่าย (Photo)</option>
                                <option value="วิดีโอ">วิดีโอ (Video)</option>
                                <option value="ไลฟ์">ไลฟ์ (Live)</option>
                                <option value="อัลบั้มรวม">อัลบั้มรวม</option>
                                <option value="อื่นๆ">อื่นๆ</option>
                              </select>
                            )}
                            
                            <button 
                              onClick={() => {
                                const newLinks = addModal.socialLinks.filter((_, i) => i !== idx);
                                setAddModal(prev => ({ ...prev, socialLinks: newLinks }));
                              }}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div>
                            <input 
                              type="url" 
                              value={link.url}
                              onChange={(e) => {
                                const newLinks = [...addModal.socialLinks];
                                newLinks[idx].url = e.target.value;
                                setAddModal(prev => ({ ...prev, socialLinks: newLinks }));
                              }}
                              placeholder={
                                link.platform === "YouTube" ? "https://www.youtube.com/watch?v=..." :
                                link.platform === "Google Drive" ? "https://drive.google.com/..." :
                                `วางลิงก์โพสต์ ${link.platform} ที่นี่...`
                              }
                              className={`w-full p-2 text-xs border rounded-md focus:ring-2 focus:ring-blue-500 outline-none ${link.url && !isValidUrl(link.url) ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-white'}`}
                            />
                            {link.url && !isValidUrl(link.url) && (
                              <p className="text-[10px] text-red-500 mt-1">กรุณากรอกลิงก์ที่ถูกต้อง (http:// หรือ https://)</p>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {addModal.socialLinks.length === 0 && (
                        <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 border border-slate-100 border-dashed rounded-lg">
                          ไม่มีลิงก์ Social Media
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setAddModal({ show: false, name: '', serviceType: '', dateStr: new Date().toISOString().split('T')[0], newLink: '', socialLinks: [] })}
                  className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveNewAlbum}
                  disabled={
                    !addModal.name.trim() || !addModal.dateStr || !addModal.serviceType.trim() ||
                    (addModal.newLink !== "" && !isValidUrl(addModal.newLink)) ||
                    addModal.socialLinks.some(l => !isValidUrl(l.url))
                  }
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-sm transition-colors flex items-center justify-center"
                >
                  Save Album
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
