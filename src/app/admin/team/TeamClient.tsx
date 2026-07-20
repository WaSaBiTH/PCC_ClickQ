"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Pencil, Trash2, Upload, ArrowLeft, Users } from "lucide-react";
import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";
import Link from "next/link";

interface TeamMember {
  rowIndex: number;
  teamType: string;
  memberName: string;
  role: string;
  imageUrl: string;
  contactLink: string;
  status: string;
}

export default function TeamClient() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [navigatingAction, setNavigatingAction] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<TeamMember>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Image Cropping State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/team");
      const data = await res.json();
      if (data.success) {
        setMembers(data.members || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
    }
  };

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result as string), false);
      reader.readAsDataURL(file);
    });
  };

  const getCroppedImg = async (imageSrc: string, pixelCrop: any, rotation = 0): Promise<File> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2d context");

    const safeArea = Math.max(image.width, image.height) * 2;
    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    );

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
        resolve(new File([blob], "profile.webp", { type: "image/webp" }));
      }, "image/webp", 0.9);
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalImageUrl = formData.imageUrl;

      if (imageSrc && croppedAreaPixels) {
        const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
        const compressedFile = await imageCompression(croppedFile, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 800,
          useWebWorker: true,
          fileType: "image/webp"
        });

        const uploadForm = new FormData();
        uploadForm.append("file", compressedFile, `profile_${Date.now()}.jpg`);
        uploadForm.append("uploadType", "team");
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadForm
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.url) {
          finalImageUrl = uploadData.url;
        } else {
          throw new Error("Upload failed");
        }
      }

      const payload = {
        ...formData,
        imageUrl: finalImageUrl,
      };

      const method = payload.rowIndex ? "PUT" : "POST";
      const saveRes = await fetch("/api/admin/team", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const saveData = await saveRes.json();

      if (saveData.success) {
        setIsEditing(false);
        setImageSrc(null);
        setFormData({});
        fetchMembers();
      } else {
        alert("Failed to save: " + saveData.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (rowIndex: number) => {
    if (!confirm("Are you sure you want to delete this member?")) return;
    try {
      const res = await fetch(`/api/admin/team?rowIndex=${rowIndex}`, { method: "DELETE" });
      if (res.ok) fetchMembers();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b shadow-sm sticky top-0 z-40 mb-4 md:mb-8">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/admin/dashboard" onClick={() => setNavigatingAction('back')} className={`font-bold text-lg md:text-xl hover:opacity-80 flex items-center gap-1 md:gap-2 truncate ${navigatingAction === 'back' ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="hidden sm:inline text-orange-500">PhotoClubClickQ</span>
            <span className="sm:hidden text-orange-500">PCC</span>
            <span className="text-slate-500 text-sm font-normal truncate">| Team</span>
          </Link>
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <Link href="/admin/dashboard" onClick={() => setNavigatingAction('back')}>
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 md:px-4" disabled={navigatingAction === 'back'}>
                {navigatingAction === 'back' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ArrowLeft className="w-5 h-5 md:mr-2" />
                    <span className="hidden md:inline">Back to Dashboard</span>
                  </>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="p-4 md:p-8 max-w-5xl mx-auto pt-0 w-full flex-1">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-8">
          {isEditing ? (
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-4">
                <h2 className="text-xl font-bold text-slate-800">{formData.rowIndex ? "Edit Member" : "Add New Member"}</h2>
                <Button variant="ghost" size="sm" className="text-slate-500 hover:bg-slate-100 rounded-full" onClick={() => { setIsEditing(false); setImageSrc(null); }}>
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-slate-700">Name (ชื่อ) *</label>
                  <input type="text" className="w-full border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 p-2.5 rounded-lg outline-none transition-all text-slate-900 shadow-sm" value={formData.memberName || ""} onChange={(e) => setFormData({...formData, memberName: e.target.value})} placeholder="ชื่อ-สกุล" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-slate-700">Role (ตำแหน่ง) *</label>
                  <input type="text" className="w-full border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 p-2.5 rounded-lg outline-none transition-all text-slate-900 shadow-sm" value={formData.role || ""} onChange={(e) => setFormData({...formData, role: e.target.value})} placeholder="ชื่อย่อสาขาเเละรุ่น" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-slate-700">Status (สถานะ) *</label>
                  <select className="w-full border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 p-2.5 rounded-lg outline-none transition-all text-slate-900 shadow-sm bg-white" value={formData.status || "Active"} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                    <option value="Active">ปัจจุบัน (Active)</option>
                    <option value="Alumni">ศิษย์เก่า/อดีตทีม (Alumni)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-slate-700">Team/Tag</label>
                  <div className="flex flex-wrap gap-2">
                    {["Photographer", "Videographer", "LiveStream"].map(tag => {
                      const isChecked = (formData.teamType || "").includes(tag);
                      return (
                        <label key={tag} className={`flex items-center justify-center px-3 py-1.5 border rounded-lg cursor-pointer transition-all select-none text-sm font-medium ${isChecked ? 'border-orange-500 bg-orange-500 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={isChecked}
                            onChange={(e) => {
                              const currentTags = formData.teamType ? formData.teamType.split(',').map(t => t.trim()).filter(t => t) : [];
                              if (e.target.checked) {
                                if (!currentTags.includes(tag)) currentTags.push(tag);
                              } else {
                                const index = currentTags.indexOf(tag);
                                if (index > -1) currentTags.splice(index, 1);
                              }
                              setFormData({ ...formData, teamType: currentTags.join(', ') });
                            }} 
                          />
                          <span>{tag}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1.5 text-slate-700">Contact Link (IG/FB)</label>
                  <input type="text" className="w-full border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 p-2.5 rounded-lg outline-none transition-all text-slate-900 shadow-sm" value={formData.contactLink || ""} onChange={(e) => setFormData({...formData, contactLink: e.target.value})} placeholder="ลิ้งค์ IG,Facebook" />
                </div>
              </div>

              <div className="mt-2">
                <label className="block text-sm font-semibold mb-2 text-slate-700">Profile Image *</label>
                {!imageSrc && !formData.imageUrl && (
                  <div className="border-2 border-dashed border-slate-200 hover:border-orange-400 rounded-xl p-10 text-center bg-slate-50 relative cursor-pointer transition-all group">
                    <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5 text-slate-400 group-hover:text-orange-500 transition-colors" />
                    </div>
                    <p className="text-slate-700 font-medium text-sm">Click to upload and crop image</p>
                    <p className="text-slate-400 text-xs mt-1">Recommended: 1:1 Square</p>
                  </div>
                )}
                
                {imageSrc && (
                  <div className="mt-3 border rounded-xl p-4 bg-slate-50">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-semibold text-slate-700">Crop Image</span>
                      <Button variant="outline" size="sm" onClick={() => setImageSrc(null)} className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200">
                        ยกเลิกรูปที่เลือก
                      </Button>
                    </div>
                    <div className="relative h-[300px] sm:h-[400px] w-full bg-slate-900 rounded-xl overflow-hidden shadow-inner">
                      <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={1}
                        onCropChange={setCrop}
                        onRotationChange={setRotation}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                      />
                    </div>
                    <div className="mt-4 px-2">
                      <label className="text-xs font-semibold text-slate-500 mb-2 flex items-center justify-between">
                        <span>หมุนรูปภาพ (Rotation)</span>
                        <span>{rotation}°</span>
                      </label>
                      <input
                        type="range"
                        value={rotation}
                        min={0}
                        max={360}
                        step={1}
                        onChange={(e) => setRotation(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                  </div>
                )}

                {formData.imageUrl && !imageSrc && (
                  <div className="mt-3 flex flex-col items-center sm:flex-row sm:items-center gap-5 bg-slate-50 p-5 rounded-xl border border-slate-200">
                    {(() => {
                      let currentDisplayUrl = formData.imageUrl;
                      if (currentDisplayUrl && currentDisplayUrl.includes("drive.google.com")) {
                        const idMatch = currentDisplayUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || currentDisplayUrl.match(/id=([a-zA-Z0-9_-]+)/);
                        if (idMatch && idMatch[1]) {
                          currentDisplayUrl = `/api/image-proxy?id=${idMatch[1]}`;
                        }
                      }
                      return (
                        <img 
                          src={currentDisplayUrl || "/PCC Photo Club.webp"} 
                          onError={(e) => { e.currentTarget.src = "/PCC Photo Club.webp"; }}
                          className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-sm" 
                          alt="Current" 
                          referrerPolicy="no-referrer"
                        />
                      );
                    })()}
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm mb-2">Current Image</h4>
                      <Button variant="outline" size="sm" className="relative cursor-pointer bg-white hover:bg-slate-50 text-slate-600 border-slate-300">
                        <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        Upload New Image
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-8">
                <Button variant="ghost" onClick={() => { setIsEditing(false); setImageSrc(null); }}>Cancel</Button>
                <Button className="bg-slate-900 text-white hover:bg-slate-800 px-6 shadow-sm" onClick={handleSave} disabled={isSaving || !formData.memberName}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isSaving ? "Saving..." : "Save Member"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Team Members</h2>
                  <p className="text-slate-500 mt-1">Manage your active team members and alumni.</p>
                </div>
                <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full shadow-sm" onClick={() => { setFormData({ status: "Active" }); setIsEditing(true); setImageSrc(null); }}>
                  <Plus className="w-5 h-5 mr-2" /> Add New Member
                </Button>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>
              ) : members.length === 0 ? (
                <div className="text-center p-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-700 mb-1">No Team Members Found</h3>
                  <p className="text-slate-500 mb-6">Start by adding your first team member.</p>
                  <Button variant="outline" onClick={() => { setFormData({ status: "Active" }); setIsEditing(true); setImageSrc(null); }}>
                    <Plus className="w-4 h-4 mr-2" /> Add Member
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {members.map((m, i) => {
                    // Utility to fix Google Drive Links
                    let displayUrl = m.imageUrl || "/PCC%20Photo%20Club.webp";
                    if (displayUrl.includes("drive.google.com")) {
                      const idMatch = displayUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || displayUrl.match(/id=([a-zA-Z0-9_-]+)/);
                      if (idMatch && idMatch[1]) {
                        displayUrl = `/api/image-proxy?id=${idMatch[1]}`;
                      }
                    }

                    return (
                      <div key={i} className="group flex items-center gap-5 p-5 border border-slate-200 rounded-2xl hover:shadow-lg transition-all bg-white hover:border-orange-200">
                        <img 
                          src={displayUrl} 
                          alt={m.memberName} 
                          onError={(e) => { e.currentTarget.src = "/PCC Photo Club.webp"; }}
                          className="w-20 h-20 rounded-full object-cover bg-slate-100 shadow-sm border border-slate-200" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col gap-1 mb-1">
                            <h4 className="font-extrabold text-slate-900 truncate text-lg leading-tight">{m.memberName}</h4>
                            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold w-fit ${m.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                              {m.status}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-500 truncate">{m.role}</p>
                        </div>
                        <div className="flex flex-col gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-9 w-9 bg-slate-50 hover:bg-slate-200 rounded-full" onClick={() => { setFormData(m); setIsEditing(true); setImageSrc(null); }}>
                            <Pencil className="w-4 h-4 text-slate-700" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-full text-red-500" onClick={() => handleDelete(m.rowIndex)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
