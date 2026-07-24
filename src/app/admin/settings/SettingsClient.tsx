"use client";
import AdminNav from "@/components/admin/admin-nav";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Save, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";

export default function SettingsClient() {
  const [customUrls, setCustomUrls] = useState<string[]>([""]);
  const [fbLink, setFbLink] = useState("");
  const [igLink, setIgLink] = useState("");
  const [enableCalendar, setEnableCalendar] = useState(false);
  const [activeLinkIndex, setActiveLinkIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingCalendar, setIsSavingCalendar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [navigatingAction, setNavigatingAction] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Custom Toast Notification State
  const [toast, setToast] = useState<{ show: boolean, type: 'success' | 'error', message: string }>({ show: false, type: 'success', message: '' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // Prune Data state
  const [showPruneDialog, setShowPruneDialog] = useState(false);
  const [pruneConfirmText, setPruneConfirmText] = useState("");
  const [isPruning, setIsPruning] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const t = Date.now();
        const [resBg, resFb, resIg, resCal] = await Promise.all([
          fetch(`/api/admin/settings?key=custom_background_urls&t=${t}`),
          fetch(`/api/admin/settings?key=fb_link&t=${t}`),
          fetch(`/api/admin/settings?key=ig_link&t=${t}`),
          fetch(`/api/admin/settings?key=enable_calendar_invites&t=${t}`),
        ]);
        const dataBg = await resBg.json();
        const dataFb = await resFb.json();
        const dataIg = await resIg.json();
        const dataCal = await resCal.json();

        if (dataBg.value) {
          const urls = dataBg.value.split(",").map((u: string) => u.trim()).filter((u: string) => u);
          if (urls.length > 0) {
            setCustomUrls(urls);
          }
        }
        if (dataFb.value) setFbLink(dataFb.value);
        if (dataIg.value) setIgLink(dataIg.value);
        if (dataCal.value) setEnableCalendar(dataCal.value === "on");
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleToggleCalendar = async (checked: boolean) => {
    setIsSavingCalendar(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "enable_calendar_invites", value: checked ? "on" : "off" })
      });
      if (!res.ok) {
        showToast("Failed to update calendar settings", "error");
      } else {
        setEnableCalendar(checked);
        showToast(checked ? "เปิดใช้งาน Calendar Invites แล้ว" : "ปิดใช้งาน Calendar Invites แล้ว");
      }
    } catch (e) {
      showToast("Error updating settings", "error");
    } finally {
      setIsSavingCalendar(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const bgValue = customUrls.map(u => u.trim()).filter(u => u).join(",");
      const results = await Promise.all([
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "custom_background_urls", value: bgValue })
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "fb_link", value: fbLink })
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "ig_link", value: igLink })
        })
      ]);
      
      const allOk = results.every(res => res.ok);
      
      if (allOk) {
        setSaveMessage({ type: 'success', text: 'Settings saved successfully.' });
        setActiveLinkIndex(null);
      } else {
        setSaveMessage({ type: 'error', text: 'Failed to save settings.' });
      }
    } catch (e) {
      console.error(e);
      setSaveMessage({ type: 'error', text: 'An error occurred while saving.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...customUrls];
    newUrls[index] = value;
    setCustomUrls(newUrls);
    setActiveLinkIndex(index);
  };

  const addUrlField = () => {
    setCustomUrls([...customUrls, ""]);
    setActiveLinkIndex(customUrls.length);
  };

  const removeUrlField = (index: number) => {
    if (customUrls.length === 1) {
      setCustomUrls([""]);
    } else {
      setCustomUrls(customUrls.filter((_, i) => i !== index));
    }
    setActiveLinkIndex(null);
  };

  const moveUrlUp = (index: number) => {
    if (index === 0) return;
    const newUrls = [...customUrls];
    const temp = newUrls[index - 1];
    newUrls[index - 1] = newUrls[index];
    newUrls[index] = temp;
    setCustomUrls(newUrls);
    setActiveLinkIndex(index - 1);
  };

  const moveUrlDown = (index: number) => {
    if (index === customUrls.length - 1) return;
    const newUrls = [...customUrls];
    const temp = newUrls[index + 1];
    newUrls[index + 1] = newUrls[index];
    newUrls[index] = temp;
    setCustomUrls(newUrls);
    setActiveLinkIndex(index + 1);
  };

  const handlePruneData = async () => {
    if (pruneConfirmText !== "CONFIRM") return;
    setIsPruning(true);
    try {
      const res = await fetch("/api/admin/prune", { method: "POST" });
      if (res.ok) {
        showToast("ล้างข้อมูลสำเร็จแล้วครับ! (Data Pruned Successfully)");
        setShowPruneDialog(false);
        setPruneConfirmText("");
      } else {
        const data = await res.json();
        showToast(`เกิดข้อผิดพลาด: ${data.error || 'Failed to prune data'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ (Connection error)", 'error');
    } finally {
      setIsPruning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminNav activePage="settings" />
      
      <div className="p-4 md:p-8 max-w-4xl mx-auto pt-0 w-full flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-slate-600 mt-2">Manage fallback URLs and other system configurations.</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Fallback Google Photos URLs</h2>
          <p className="text-sm text-slate-600 mb-4">
            These albums will be used as a fallback for the homepage background if no photos can be loaded from the approved submitted work.
            Enter one URL per line.
          </p>
          
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {customUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-1 sm:gap-2">
                    <input 
                      type="text"
                      value={url}
                      onChange={(e) => handleUrlChange(index, e.target.value)}
                      className={`flex-1 min-w-0 border p-2 sm:p-3 text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-colors ${
                        activeLinkIndex === index
                          ? "border-orange-300 bg-orange-50 text-orange-900"
                          : "border-slate-300 bg-white"
                      }`}
                      placeholder="https://photos.app.goo.gl/..."
                    />
                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        onClick={() => moveUrlUp(index)}
                        disabled={index === 0}
                        className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 sm:p-2 h-auto disabled:opacity-30"
                        title="Move up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => moveUrlDown(index)}
                        disabled={index === customUrls.length - 1}
                        className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 sm:p-2 h-auto disabled:opacity-30"
                        title="Move down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => removeUrlField(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 sm:p-2 h-auto ml-0 sm:ml-1"
                        title="Remove link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mb-6">
                <Button 
                  variant="outline" 
                  onClick={addUrlField}
                  className="text-orange-600 border-orange-200 hover:bg-orange-50 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Link
                </Button>
              </div>

              <div className="border-t pt-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Social Media Links</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Facebook Page URL</label>
                    <input 
                      type="text"
                      value={fbLink}
                      onChange={(e) => setFbLink(e.target.value)}
                      className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-colors"
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Instagram Profile URL</label>
                    <input 
                      type="text"
                      value={igLink}
                      onChange={(e) => setIgLink(e.target.value)}
                      className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-colors"
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  {saveMessage && (
                    <span className={`text-sm font-medium ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {saveMessage.text}
                    </span>
                  )}
                </div>
                <Button 
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="bg-orange-600 hover:bg-orange-700 text-white flex items-center px-6"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Calendar Invites Box */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Calendar Invites</h2>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg gap-4">
            <div>
              <h3 className="font-semibold text-blue-900">เปิด/ปิด การส่ง Calendar Invite อัตโนมัติ</h3>
              <p className="text-sm text-blue-700 mt-1">หากเปิดใช้งาน ระบบจะส่งปฏิทินเชิญให้ลูกค้าและทีมงานอัตโนมัติทันทีที่กด "Accept (รับงาน)"</p>
            </div>
            
            {isLoading || isSavingCalendar ? (
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            ) : (
              <button
                onClick={() => handleToggleCalendar(!enableCalendar)}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  enableCalendar ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span className="sr-only">Toggle Calendar</span>
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    enableCalendar ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            )}
          </div>
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

        {/* Danger Zone */}
        <div className="bg-red-50 border border-red-200 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-red-700 flex items-center gap-2 mb-2">
            <Trash2 className="w-5 h-5" /> Danger Zone
          </h2>
          <p className="text-sm text-red-600 mb-4">
            ล้างข้อมูลทั้งหมดในระบบ (Bookings) เพื่อเตรียมพร้อมสำหรับเปิดเทอมใหม่ ข้อมูลในหน้า Team, Settings และ Gallery จะไม่ถูกลบ
          </p>
          <Button 
            onClick={() => setShowPruneDialog(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold"
          >
            ล้างข้อมูลทั้งหมด (Prune Data)
          </Button>
        </div>

        {/* Prune Confirmation Dialog */}
        {showPruneDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-[400px]">
              <h3 className="text-xl font-bold text-red-600 mb-2">ยืนยันการล้างข้อมูล</h3>
              <p className="text-sm text-slate-600 mb-4">
                การกระทำนี้จะลบข้อมูลคิวงานทั้งหมดและไม่สามารถกู้คืนได้ (ยกเว้น Team, Settings, Gallery)<br/><br/>
                กรุณาพิมพ์คำว่า <strong>CONFIRM</strong> เพื่อยืนยัน
              </p>
              <input 
                type="text" 
                value={pruneConfirmText}
                onChange={(e) => setPruneConfirmText(e.target.value)}
                className="w-full border border-red-300 p-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="พิมพ์ CONFIRM"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setShowPruneDialog(false);
                  setPruneConfirmText("");
                }} disabled={isPruning}>Cancel</Button>
                <Button 
                  onClick={handlePruneData}
                  disabled={pruneConfirmText !== "CONFIRM" || isPruning}
                  className="bg-red-600 hover:bg-red-700 text-white flex items-center"
                >
                  {isPruning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isPruning ? "กำลังลบข้อมูล..." : "ยืนยันลบข้อมูล"}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
