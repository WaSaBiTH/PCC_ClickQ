"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Save, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";

export default function SettingsClient() {
  const [customUrls, setCustomUrls] = useState<string[]>([""]);
  const [fbLink, setFbLink] = useState("");
  const [igLink, setIgLink] = useState("");
  const [activeLinkIndex, setActiveLinkIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [resBg, resFb, resIg] = await Promise.all([
          fetch("/api/admin/settings?key=custom_background_urls"),
          fetch("/api/admin/settings?key=fb_link"),
          fetch("/api/admin/settings?key=ig_link"),
        ]);
        const dataBg = await resBg.json();
        const dataFb = await resFb.json();
        const dataIg = await resIg.json();

        if (dataBg.value) {
          const urls = dataBg.value.split(",").map((u: string) => u.trim()).filter((u: string) => u);
          if (urls.length > 0) {
            setCustomUrls(urls);
          }
        }
        if (dataFb.value) setFbLink(dataFb.value);
        if (dataIg.value) setIgLink(dataIg.value);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b shadow-sm sticky top-0 z-40 mb-8">
        <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
          <Link href="/admin/dashboard" className="font-bold text-xl hover:opacity-80 flex items-center gap-2">
            <ArrowLeft className="w-5 h-5 mr-1" />
            <span className="text-orange-500">Back to Dashboard</span>
          </Link>
        </div>
      </nav>
      
      <div className="p-8 max-w-4xl mx-auto pt-0 w-full flex-1">
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
                  <div key={index} className="flex items-center gap-2">
                    <input 
                      type="text"
                      value={url}
                      onChange={(e) => handleUrlChange(index, e.target.value)}
                      className={`flex-1 border p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-colors ${
                        activeLinkIndex === index
                          ? "border-orange-300 bg-orange-50 text-orange-900"
                          : "border-slate-300 bg-white"
                      }`}
                      placeholder="https://photos.app.goo.gl/..."
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        onClick={() => moveUrlUp(index)}
                        disabled={index === 0}
                        className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 h-auto disabled:opacity-30"
                        title="Move up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => moveUrlDown(index)}
                        disabled={index === customUrls.length - 1}
                        className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 h-auto disabled:opacity-30"
                        title="Move down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => removeUrlField(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 h-auto ml-1"
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
      </div>
    </div>
  );
}
