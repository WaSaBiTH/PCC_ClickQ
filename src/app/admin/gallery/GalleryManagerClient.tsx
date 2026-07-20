"use client";

import { useState, useEffect } from "react";
import { Trash2, AlertCircle, Loader2, ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";

type GalleryItem = {
  rowIndex: number;
  name: string;
  serviceType: string;
  dateStr: string;
  link: string;
};

export default function GalleryManagerClient() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isEditingLink, setIsEditingLink] = useState<number | null>(null);
  const [navigatingAction, setNavigatingAction] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{ show: boolean, item: GalleryItem | null, newLink: string }>({ show: false, item: null, newLink: '' });

  // Custom Toast Notification State
  const [toast, setToast] = useState<{ show: boolean, type: 'success' | 'error', message: string }>({ show: false, type: 'success', message: '' });

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
    if (!confirm("Are you sure you want to delete this album? This action cannot be undone.")) return;
    
    setIsDeleting(rowIndex);
    try {
      const res = await fetch(`/api/admin/gallery?rowIndex=${rowIndex}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems(prev => prev.filter(item => item.rowIndex !== rowIndex));
        showToast("Album deleted successfully.");
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
    setEditModal({ show: true, item, newLink: item.link });
  };

  const saveEditedLink = async () => {
    if (!editModal.item) return;
    const { item, newLink } = editModal;
    
    setIsEditingLink(item.rowIndex);
    setEditModal({ show: false, item: null, newLink: '' });
    
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndex: item.rowIndex, link: newLink.trim() }),
      });
      if (res.ok) {
        setItems(prev => prev.map(i => i.rowIndex === item.rowIndex ? { ...i, link: newLink.trim() } : i));
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Manage Gallery</h1>
            <p className="text-slate-500 mt-1">Remove old or broken albums from the public gallery</p>
          </div>
          <Link 
            href="/admin/dashboard" 
            onClick={() => setNavigatingAction('back')}
            className={`flex items-center justify-center px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors ${navigatingAction === 'back' ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {navigatingAction === 'back' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowLeft className="w-4 h-4 mr-2" />}
            Back to Dashboard
          </Link>
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 font-semibold text-slate-700">Name</th>
                    <th className="px-6 py-4 font-semibold text-slate-700">Type</th>
                    <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                    <th className="px-6 py-4 font-semibold text-slate-700">Link</th>
                    <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const itemDate = new Date(item.dateStr);
                    const isOld = !isNaN(itemDate.getTime()) && (Date.now() - itemDate.getTime() > 365 * 24 * 60 * 60 * 1000);
                    
                    return (
                      <tr key={item.rowIndex} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900 flex items-center gap-2">
                            {item.name}
                            {isOld && (
                              <div className="text-red-500" title="This album is older than 1 year and might be deleted.">
                                <AlertCircle className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full tracking-wider uppercase">
                            {item.serviceType || "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm">
                          {item.dateStr && !isNaN(new Date(item.dateStr).getTime()) 
                            ? `${format(new Date(item.dateStr), 'dd MMM ', { locale: th })}${new Date(item.dateStr).getFullYear() + 543}`
                            : item.dateStr || "Unknown Date"}
                        </td>
                        <td className="px-6 py-4">
                          <a 
                            href={item.link} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-orange-600 hover:text-orange-700 hover:underline text-sm truncate block max-w-[200px]"
                            title={item.link}
                          >
                            {item.link || "No Link"}
                          </a>
                        </td>
                        <td className="px-6 py-4 text-right">
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
                              onClick={() => handleDelete(item.rowIndex)}
                              disabled={isDeleting === item.rowIndex || isEditingLink === item.rowIndex}
                              className={`inline-flex items-center justify-center p-2 rounded-lg transition-colors ${
                                isDeleting === item.rowIndex 
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                  : 'text-red-500 hover:bg-red-50'
                              }`}
                              title="Delete Album"
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">Google Photos URL</label>
                    <input
                      type="url"
                      value={editModal.newLink}
                      onChange={(e) => setEditModal(prev => ({ ...prev, newLink: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditedLink();
                        if (e.key === 'Escape') setEditModal({ show: false, item: null, newLink: '' });
                      }}
                      placeholder="https://photos.app.goo.gl/..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-shadow text-slate-900 placeholder:text-slate-400"
                      autoFocus
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setEditModal({ show: false, item: null, newLink: '' })}
                  className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditedLink}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center justify-center"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
