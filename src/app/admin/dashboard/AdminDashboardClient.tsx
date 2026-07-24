"use client";
import AdminNav from "@/components/admin/admin-nav";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Settings, LogOut, Image as ImageIcon, Search } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface Props {
  initialBookings: any[];
  spreadsheetId: string;
}

export default function AdminDashboardClient({ initialBookings, spreadsheetId }: Props) {
  const [bookings, setBookings] = useState(initialBookings);
  const [updatingAction, setUpdatingAction] = useState<{ rowIndex: number, action: string } | null>(null);
  
  // State for bulk actions
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  
  // State for active filter tab
  const [activeTab, setActiveTab] = useState<string>("Pending");
  
  // State for the Google Photos/Drive Link prompt
  const [promptLink, setPromptLink] = useState<{ rowIndices: number[], link: string, facebookLink: string, igLink: string } | null>(null);
  
  // State for expanded row details
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  
  // State for navigation loading
  const [navigatingAction, setNavigatingAction] = useState<string | null>(null);

  // State for search query
  const [searchQuery, setSearchQuery] = useState("");

  // State for Edit Before Accept Modal
  const [acceptModalData, setAcceptModalData] = useState<{
    rowIndex: number;
    name: string;
    date: string;
    timeSlot: string;
    serviceType: string;
    email: string;
  } | null>(null);

  const handleStatusUpdate = async (rowIndex: number, status: string, googlePhotosLink?: string, facebookLink?: string, igLink?: string, editedData?: any) => {
    setUpdatingAction({ rowIndex, action: status });
    try {
      const rowData = bookings[rowIndex]; 
      const bookingDetails = editedData || {
        name: rowData[0],
        serviceType: rowData[5],
        date: rowData[3],
        timeSlot: rowData[4],
        email: rowData[11]
      };

      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndex, status, googlePhotosLink, facebookLink, igLink, bookingDetails }),
      });
      
      if (res.ok) {
        // Optimistic update
        const updatedBookings = [...bookings];
        updatedBookings[rowIndex][7] = status;
        if (googlePhotosLink !== undefined) {
          updatedBookings[rowIndex][9] = googlePhotosLink;
        }
        if (editedData) {
          updatedBookings[rowIndex][0] = editedData.name;
          updatedBookings[rowIndex][3] = editedData.date;
          updatedBookings[rowIndex][4] = editedData.timeSlot;
          updatedBookings[rowIndex][5] = editedData.serviceType;
          updatedBookings[rowIndex][11] = editedData.email;
        }
        setBookings(updatedBookings);
      } else {
        const err = await res.json();
        alert("Error: " + err.error);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update status");
    } finally {
      setUpdatingAction(null);
    }
  };

  const handleBulkStatusUpdate = async (status: string, googlePhotosLink?: string, facebookLink?: string, igLink?: string) => {
    if (selectedRows.length === 0) return;
    
    setIsBulkUpdating(true);
    setBulkProgress({ current: 0, total: selectedRows.length });
    
    const updatedBookings = [...bookings];
    let hasError = false;

    for (let i = 0; i < selectedRows.length; i++) {
      const rowIndex = selectedRows[i];
      const rowData = bookings[rowIndex];
      
      const bookingDetails = {
        name: rowData[0],
        serviceType: rowData[5],
        date: rowData[3],
        timeSlot: rowData[4],
        email: rowData[11]
      };

      try {
        const res = await fetch("/api/admin/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rowIndex, status, googlePhotosLink, facebookLink, igLink, bookingDetails }),
        });
        
        if (res.ok) {
          updatedBookings[rowIndex][7] = status;
          if (googlePhotosLink !== undefined) {
            updatedBookings[rowIndex][9] = googlePhotosLink;
          }
        } else {
          hasError = true;
        }
      } catch (error) {
        hasError = true;
        console.error(error);
      }
      
      setBulkProgress({ current: i + 1, total: selectedRows.length });
    }
    
    setBookings(updatedBookings);
    setIsBulkUpdating(false);
    setPromptLink(null);
    if (!hasError) setSelectedRows([]); // Clear selection on complete success
    else alert("Some updates failed. Please check the queue.");
  };

  const toggleRowSelection = (rowIndex: number) => {
    setSelectedRows(prev => 
      prev.includes(rowIndex) 
        ? prev.filter(id => id !== rowIndex)
        : [...prev, rowIndex]
    );
  };

  const toggleSelectAll = () => {
    const validRows = bookings
      .map((row, i) => ({ row, rowIndex: i }))
      .slice(1) // Skip header
      .filter(({ row }) => {
        if (!row[0] || String(row[0]).trim() === "") return false;
        const status = row[7] || "Pending";
        
        // Exclude old rejected from select all
        if (status === "Rejected") {
          const diffDays = (new Date().getTime() - new Date(row[3]).getTime()) / (1000 * 3600 * 24);
          if (diffDays > 3) return false;
        }

        if (status !== activeTab) return false;
        
        if (searchQuery.trim() !== "") {
          const query = searchQuery.toLowerCase();
          const matchName = String(row[0] || "").toLowerCase().includes(query);
          const matchPhone = String(row[1] || "").toLowerCase().includes(query);
          const matchService = String(row[5] || "").toLowerCase().includes(query);
          if (!matchName && !matchPhone && !matchService) return false;
        }
        
        return true;
      })
      .map(({ rowIndex }) => rowIndex);
      
    // Check if all currently visible valid rows are selected
    const allVisibleSelected = validRows.every(r => selectedRows.includes(r));
    
    if (allVisibleSelected) {
      // Deselect all visible
      setSelectedRows(selectedRows.filter(r => !validRows.includes(r)));
    } else {
      // Select all visible
      const newSelections = new Set([...selectedRows, ...validRows]);
      setSelectedRows(Array.from(newSelections));
    }
  };

  // Change tab and clear selection
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedRows([]); // Clear selection when switching tabs to prevent accidental bulk actions
  };


  // Queue Status State
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(true);
  const [loadingQueueStatus, setLoadingQueueStatus] = useState<boolean>(true);

  useEffect(() => {
    // Silently trigger cleanup of old rejected bookings in the background
    fetch("/api/admin/clean-rejected", { method: "POST" }).catch(e => console.error("Auto-cleanup failed:", e));

    fetch(`/api/admin/settings?key=booking_status&t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.value === "closed") setIsQueueOpen(false);
        else setIsQueueOpen(true);
      })
      .catch(err => console.error(err))
      .finally(() => setLoadingQueueStatus(false));
  }, []);

  const handleToggleQueue = async () => {
    const newStatus = isQueueOpen ? "closed" : "open";
    setLoadingQueueStatus(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "booking_status", value: newStatus })
      });
      if (res.ok) {
        setIsQueueOpen(newStatus === "open");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to update queue status");
    } finally {
      setLoadingQueueStatus(false);
    }
  };

  // Calculate stats
  const stats = {
    Pending: 0,
    Accepted: 0,
    Completed: 0,
    Rejected: 0
  };

  bookings.slice(1).forEach(row => {
    if (!row[0] || String(row[0]).trim() === "") return;
    const status = row[7] || "Pending";
    
    // Skip old rejected
    if (status === "Rejected") {
      const diffDays = (new Date().getTime() - new Date(row[3]).getTime()) / (1000 * 3600 * 24);
      if (diffDays > 3) return;
    }

    if (stats[status as keyof typeof stats] !== undefined) {
      stats[status as keyof typeof stats]++;
    }
  });


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminNav activePage="dashboard" />
      <div className="p-4 md:p-8 max-w-6xl mx-auto pt-0 w-full flex-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-4">
          <div className="flex items-center gap-2 sm:gap-4 justify-between w-full sm:w-auto">
            <h1 className="text-2xl sm:text-3xl font-bold">Management Queue</h1>
            <div className="flex items-center gap-2 sm:gap-3 bg-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-slate-200 shadow-sm shrink-0">
              <span className={`text-xs sm:text-sm font-bold ${loadingQueueStatus ? "text-slate-400" : isQueueOpen ? "text-green-600" : "text-red-600"}`}>
                {loadingQueueStatus ? "กำลังโหลด..." : isQueueOpen ? "เปิดรับคิว" : "ปิดรับคิว"}
              </span>
              <button
                onClick={handleToggleQueue}
                disabled={loadingQueueStatus}
                className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                  isQueueOpen ? "bg-green-500" : "bg-slate-300"
                }`}
              >
                <span className="sr-only">Toggle Queue</span>
                <span
                  className={`inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                    isQueueOpen ? "translate-x-5 sm:translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 4 Summary Boxes / Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { id: "Pending", label: "รอการยืนยัน", count: stats.Pending, color: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100", activeColor: "ring-2 ring-yellow-500 shadow-md" },
            { id: "Accepted", label: "รับงานแล้ว", count: stats.Accepted, color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100", activeColor: "ring-2 ring-blue-500 shadow-md" },
            { id: "Completed", label: "จบงานแล้ว", count: stats.Completed, color: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100", activeColor: "ring-2 ring-green-500 shadow-md" },
            { id: "Rejected", label: "ปฏิเสธรับงาน", count: stats.Rejected, color: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100", activeColor: "ring-2 ring-red-500 shadow-md" }
          ].map(tab => (
            <div 
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`cursor-pointer border rounded-xl p-5 flex flex-col items-center justify-center transition-all ${tab.color} ${activeTab === tab.id ? tab.activeColor : 'opacity-70 hover:opacity-100'}`}
            >
              <span className="text-3xl font-bold mb-1">{tab.count}</span>
              <span className="text-sm font-semibold">{tab.id}</span>
              <span className="text-xs opacity-80 mt-1">({tab.label})</span>
            </div>
          ))}
        </div>
        
        {promptLink && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-[400px]">
              <h3 className="text-lg font-bold mb-4">Submit Work</h3>
              <p className="text-sm text-slate-600 mb-2">Google Drive / Google Photos link (Required):</p>
              <input 
                type="text" 
                value={promptLink.link}
                onChange={(e) => setPromptLink({ ...promptLink, link: e.target.value })}
                className="w-full border p-2 rounded mb-4"
                placeholder="https://drive.google.com/..."
              />
              <p className="text-sm text-slate-600 mb-2">Facebook Post link (Optional):</p>
              <input 
                type="text" 
                value={promptLink.facebookLink}
                onChange={(e) => setPromptLink({ ...promptLink, facebookLink: e.target.value })}
                className="w-full border p-2 rounded mb-4"
                placeholder="https://facebook.com/..."
              />
              <p className="text-sm text-slate-600 mb-2">Instagram Post link (Optional):</p>
              <input 
                type="text" 
                value={promptLink.igLink}
                onChange={(e) => setPromptLink({ ...promptLink, igLink: e.target.value })}
                className="w-full border p-2 rounded mb-4"
                placeholder="https://instagram.com/..."
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPromptLink(null)}>Cancel</Button>
                <Button 
                  onClick={() => {
                    if (promptLink.rowIndices.length === 1) {
                      const rowIndex = promptLink.rowIndices[0];
                      handleStatusUpdate(rowIndex, "Completed", promptLink.link, promptLink.facebookLink, promptLink.igLink);
                      setPromptLink(null);
                    } else {
                      handleBulkStatusUpdate("Completed", promptLink.link, promptLink.facebookLink, promptLink.igLink);
                    }
                  }}
                  disabled={updatingAction !== null || isBulkUpdating}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center"
                >
                  {(updatingAction !== null || isBulkUpdating) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {(updatingAction !== null || isBulkUpdating) ? "Saving..." : "Submit"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Accept Booking Modal */}
        {acceptModalData && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold text-slate-800 mb-2">ตรวจสอบและแก้ไขข้อมูลก่อนรับงาน</h3>
              <p className="text-sm text-slate-500 mb-6">ข้อมูลนี้จะถูกบันทึกลงใน Google Sheets ทับของเดิม และใช้สำหรับสร้างปฏิทินส่งให้ทีมงาน</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่องาน (จะปรากฏในปฏิทิน)</label>
                  <input 
                    type="text" 
                    value={acceptModalData.name}
                    onChange={(e) => setAcceptModalData({ ...acceptModalData, name: e.target.value })}
                    className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ประเภทงาน (เช่น ถ่ายรูป, ไลฟ์สตรีม)</label>
                  <input 
                    type="text" 
                    value={acceptModalData.serviceType}
                    onChange={(e) => setAcceptModalData({ ...acceptModalData, serviceType: e.target.value })}
                    className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">วันที่ (YYYY-MM-DD)</label>
                    <input 
                      type="text" 
                      value={acceptModalData.date}
                      onChange={(e) => setAcceptModalData({ ...acceptModalData, date: e.target.value })}
                      className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">เวลา (เช่น 09:00-17:00)</label>
                    <input 
                      type="text" 
                      value={acceptModalData.timeSlot}
                      onChange={(e) => setAcceptModalData({ ...acceptModalData, timeSlot: e.target.value })}
                      className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">อีเมลผู้จอง</label>
                  <input 
                    type="email" 
                    value={acceptModalData.email}
                    onChange={(e) => setAcceptModalData({ ...acceptModalData, email: e.target.value })}
                    className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="ปล่อยว่างได้หากไม่มี"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <Button variant="outline" className="rounded-xl" onClick={() => setAcceptModalData(null)}>ยกเลิก</Button>
                <Button 
                  onClick={() => {
                    handleStatusUpdate(acceptModalData.rowIndex, "Accepted", undefined, undefined, undefined, acceptModalData);
                    setAcceptModalData(null);
                  }}
                  disabled={updatingAction !== null}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md flex items-center"
                >
                  {updatingAction !== null && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {updatingAction !== null ? "กำลังบันทึก..." : "ยืนยันรับงาน & สร้าง Calendar"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Action Toolbar */}
        {selectedRows.length > 0 && (
          <div className="bg-white p-4 rounded-xl shadow-md border border-blue-100 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                {selectedRows.length} selected
              </span>
              <span className="text-slate-600 text-sm font-medium">Bulk Actions:</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {selectedRows.some(idx => !bookings[idx][7] || bookings[idx][7] === "Pending") && (
                <>
                  <Button 
                    variant="outline" 
                    className="text-blue-600 border-blue-600 hover:bg-blue-50 bg-white"
                    onClick={() => handleBulkStatusUpdate("Accepted")}
                    disabled={isBulkUpdating}
                  >
                    Accept All
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-red-600 border-red-600 hover:bg-red-50 bg-white"
                    onClick={() => handleBulkStatusUpdate("Rejected")}
                    disabled={isBulkUpdating}
                  >
                    Reject All
                  </Button>
                </>
              )}
              {selectedRows.some(idx => bookings[idx][7] === "Accepted") && (
                <Button 
                  variant="outline" 
                  className="text-green-600 border-green-600 hover:bg-green-50 bg-white"
                  onClick={() => {
                    // Only submit links for items that are actually accepted
                    const acceptedRows = selectedRows.filter(idx => bookings[idx][7] === "Accepted");
                    setPromptLink({ rowIndices: acceptedRows, link: "", facebookLink: "", igLink: "" });
                  }}
                  disabled={isBulkUpdating}
                >
                  Submit Work for All
                </Button>
              )}
            </div>
            
            {isBulkUpdating && (
              <div className="w-full sm:w-auto flex items-center gap-2 text-sm font-medium text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                Updating {bulkProgress.current} / {bulkProgress.total}
              </div>
            )}
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6 relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
            placeholder="ค้นหาด้วยชื่อ, เบอร์โทร, หรืองาน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="bg-transparent md:bg-white rounded-none md:rounded-lg md:shadow overflow-hidden md:overflow-x-auto">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      onChange={toggleSelectAll}
                      checked={
                        bookings.slice(1).filter(row => {
                          if (!row[0] || String(row[0]).trim() === "") return false;
                          const status = row[7] || "Pending";
                          if (status === "Rejected" && (new Date().getTime() - new Date(row[3]).getTime()) / (1000 * 3600 * 24) > 3) return false;
                          if (status !== activeTab) return false;
                          if (searchQuery.trim() !== "") {
                            const query = searchQuery.toLowerCase();
                            const matchName = String(row[0] || "").toLowerCase().includes(query);
                            const matchPhone = String(row[1] || "").toLowerCase().includes(query);
                            const matchService = String(row[5] || "").toLowerCase().includes(query);
                            if (!matchName && !matchPhone && !matchService) return false;
                          }
                          return true;
                        }).length > 0 &&
                        bookings.slice(1).filter(row => {
                          if (!row[0] || String(row[0]).trim() === "") return false;
                          const status = row[7] || "Pending";
                          if (status === "Rejected" && (new Date().getTime() - new Date(row[3]).getTime()) / (1000 * 3600 * 24) > 3) return false;
                          if (status !== activeTab) return false;
                          if (searchQuery.trim() !== "") {
                            const query = searchQuery.toLowerCase();
                            const matchName = String(row[0] || "").toLowerCase().includes(query);
                            const matchPhone = String(row[1] || "").toLowerCase().includes(query);
                            const matchService = String(row[5] || "").toLowerCase().includes(query);
                            if (!matchName && !matchPhone && !matchService) return false;
                          }
                          return true;
                        }).every((_, idx) => {
                          // Find the real index in the original bookings array
                          const realIndex = bookings.findIndex((r, i) => i > 0 && r === bookings.slice(1).filter(row => {
                              if (!row[0] || String(row[0]).trim() === "") return false;
                              const status = row[7] || "Pending";
                              if (status === "Rejected" && (new Date().getTime() - new Date(row[3]).getTime()) / (1000 * 3600 * 24) > 3) return false;
                              if (status !== activeTab) return false;
                              if (searchQuery.trim() !== "") {
                                const query = searchQuery.toLowerCase();
                                const matchName = String(row[0] || "").toLowerCase().includes(query);
                                const matchPhone = String(row[1] || "").toLowerCase().includes(query);
                                const matchService = String(row[5] || "").toLowerCase().includes(query);
                                if (!matchName && !matchPhone && !matchService) return false;
                              }
                              return true;
                            })[idx]);
                          return selectedRows.includes(realIndex);
                        })
                      }
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Work Link</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.slice(1).map((row: any[], i: number) => {
                  const rowIndex = i + 1; // 1-indexed for the data row
                  
                  // Hide empty rows (e.g., if there's no name)
                  if (!row[0] || String(row[0]).trim() === "") return null;

                  // Auto-hide (delete) rejected bookings older than 3 days
                  if (row[7] === "Rejected") {
                    const referenceDate = new Date(row[10] || row[3]);
                    const today = new Date();
                    const diffTime = today.getTime() - referenceDate.getTime();
                    const diffDays = diffTime / (1000 * 3600 * 24);
                    if (diffDays > 3) return null;
                  }

                  // Filter by active tab
                  const status = row[7] || "Pending";
                  if (status !== activeTab) return null;

                  // Filter by search query
                  if (searchQuery.trim() !== "") {
                    const query = searchQuery.toLowerCase();
                    const matchName = String(row[0] || "").toLowerCase().includes(query);
                    const matchPhone = String(row[1] || "").toLowerCase().includes(query);
                    const matchService = String(row[5] || "").toLowerCase().includes(query);
                    if (!matchName && !matchPhone && !matchService) return null;
                  }

                  return (
                    <React.Fragment key={i}>
                      <TableRow 
                        className={`cursor-pointer hover:bg-slate-50 transition-colors ${selectedRows.includes(rowIndex) ? 'bg-blue-50/50' : ''}`}
                        onClick={() => setExpandedRow(expandedRow === rowIndex ? null : rowIndex)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            checked={selectedRows.includes(rowIndex)}
                            onChange={() => toggleRowSelection(rowIndex)}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">{row[0]}</TableCell>
                        <TableCell>{row[1]}</TableCell>
                        <TableCell>
                          {(() => {
                            try {
                              const d = new Date(row[3]);
                              if (!isNaN(d.getTime())) {
                                return format(d, "dd MMM yyyy", { locale: th });
                              }
                              return row[3];
                            } catch(e) {
                              return row[3];
                            }
                          })()}
                        </TableCell>
                        <TableCell>{row[5]}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              row[7] === "Completed" || row[7] === "Approved"
                                ? "bg-green-100 text-green-800"
                                : row[7] === "Rejected"
                                ? "bg-red-100 text-red-800"
                                : row[7] === "Accepted"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {row[7] || "Pending"}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={row[9]}>
                          {row[9] ? (
                            <a href={row[9]} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                              View Work
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            {(!row[7] || row[7] === "Pending") && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-blue-600 border-blue-600 hover:bg-blue-50 bg-white flex items-center"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const d = new Date(row[3]);
                                    const formattedDate = !isNaN(d.getTime()) ? format(d, "yyyy-MM-dd") : (row[3] || "");
                                    setAcceptModalData({
                                      rowIndex: rowIndex,
                                      name: row[0] || "",
                                      date: formattedDate,
                                      timeSlot: row[4] || "",
                                      serviceType: row[5] || "",
                                      email: row[11] || ""
                                    });
                                  }}
                                  disabled={updatingAction !== null}
                                >
                                  {updatingAction?.rowIndex === rowIndex && updatingAction?.action === "Accepted" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                                  Accept
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-600 border-red-600 hover:bg-red-50 bg-white flex items-center"
                                  onClick={() => handleStatusUpdate(rowIndex, "Rejected")}
                                  disabled={updatingAction !== null}
                                >
                                  {updatingAction?.rowIndex === rowIndex && updatingAction?.action === "Rejected" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                                  Reject
                                </Button>
                              </>
                            )}
                            {row[7] === "Accepted" && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-green-600 border-green-600 hover:bg-green-50 bg-white flex items-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPromptLink({ rowIndices: [rowIndex], link: "", facebookLink: "", igLink: "" });
                                }}
                                disabled={updatingAction !== null}
                              >
                                Submit Work
                              </Button>
                            )}
                            {row[7] === "Rejected" && (() => {
                              const diffDays = (new Date().getTime() - new Date(row[10] || row[3]).getTime()) / (1000 * 3600 * 24);
                              const daysLeft = Math.max(0, Math.ceil(3 - diffDays));
                              return (
                                <div className="flex items-center text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200" title="This row will be deleted from the sheet automatically">
                                  <Loader2 className="w-4 h-4 mr-2 text-slate-400" style={{ animation: 'spin 3s linear infinite reverse' }} />
                                  ลบอัตโนมัติใน {daysLeft} วัน
                                </div>
                              );
                            })()}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedRow === rowIndex && (
                        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                          <TableCell colSpan={8} className="p-0 border-b">
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 text-sm animate-in slide-in-from-top-1 duration-200">
                              <div>
                                <p className="font-semibold text-slate-700 mb-1">ช่องทางติดต่ออื่น (Contact):</p>
                                <p className="text-slate-600">{row[2] || "-"}</p>
                              </div>
                              <div>
                                <p className="font-semibold text-slate-700 mb-1">ไฟล์อ้างอิง:</p>
                                {row[6] ? (
                                  <div className="flex flex-wrap gap-2">
                                    {String(row[6]).split(',').map((link, idx) => (
                                      <a key={idx} href={link.trim()} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all bg-blue-50 px-3 py-1 rounded font-medium">
                                        ไฟล์อ้างอิง {idx + 1}
                                      </a>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-slate-600">-</p>
                                )}
                              </div>
                              <div className="md:col-span-2">
                                <p className="font-semibold text-slate-700 mb-1">รายละเอียดคิวงานเพิ่มเติม (Details & Notes):</p>
                                <div className="text-slate-600 whitespace-pre-wrap bg-white p-4 rounded-xl border border-slate-200 shadow-sm leading-relaxed">{row[8] || "-"}</div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
                {bookings.length <= 1 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No bookings found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden flex flex-col gap-4">
            {bookings.slice(1).map((row: any[], i: number) => {
              const rowIndex = i + 1;
              if (!row[0] || String(row[0]).trim() === "") return null;

              if (row[7] === "Rejected") {
                const bookingDate = new Date(row[3]);
                const diffDays = (new Date().getTime() - bookingDate.getTime()) / (1000 * 3600 * 24);
                if (diffDays > 3) return null;
              }

              const status = row[7] || "Pending";
              if (status !== activeTab) return null;

              // Filter by search query
              if (searchQuery.trim() !== "") {
                const query = searchQuery.toLowerCase();
                const matchName = String(row[0] || "").toLowerCase().includes(query);
                const matchPhone = String(row[1] || "").toLowerCase().includes(query);
                const matchService = String(row[5] || "").toLowerCase().includes(query);
                if (!matchName && !matchPhone && !matchService) return null;
              }

              const isExpanded = expandedRow === rowIndex;
              const isSelected = selectedRows.includes(rowIndex);

              return (
                <div 
                  key={i} 
                  className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${isSelected ? 'border-blue-400 ring-1 ring-blue-400' : 'border-slate-200'}`}
                >
                  <div className="p-4" onClick={() => setExpandedRow(isExpanded ? null : rowIndex)}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => { e.stopPropagation(); toggleRowSelection(rowIndex); }}
                        />
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg leading-none">{row[0]}</h3>
                          <p className="text-xs text-slate-500 mt-1">{row[5]}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        status === "Completed" || status === "Approved" ? "bg-green-100 text-green-800" :
                        status === "Rejected" ? "bg-red-100 text-red-800" :
                        status === "Accepted" ? "bg-blue-100 text-blue-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {status}
                      </span>
                    </div>

                    <div className="flex items-center text-sm text-slate-600 mb-1 mt-3">
                      <span className="font-medium w-16">Date:</span>
                      {(() => {
                        try {
                          const d = new Date(row[3]);
                          return !isNaN(d.getTime()) ? format(d, "dd MMM yyyy", { locale: th }) : row[3];
                        } catch(e) { return row[3]; }
                      })()}
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <span className="font-medium w-16">Phone:</span>
                      {row[1]}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100 text-sm animate-in slide-in-from-top-2 pt-3">
                      <div className="mb-3">
                        <p className="font-semibold text-slate-700 mb-1">Contact:</p>
                        <p className="text-slate-600">{row[2] || "-"}</p>
                      </div>
                      <div className="mb-3">
                        <p className="font-semibold text-slate-700 mb-1">Reference Files:</p>
                        {row[6] ? (
                          <div className="flex flex-wrap gap-2">
                            {String(row[6]).split(',').map((link, idx) => (
                              <a key={idx} href={link.trim()} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all bg-blue-50 px-2 py-1 rounded text-xs">
                                File {idx + 1}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-600">-</p>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700 mb-1">Details & Notes:</p>
                        <div className="text-slate-600 whitespace-pre-wrap bg-white p-3 rounded-lg border border-slate-200 shadow-sm leading-relaxed">{row[8] || "-"}</div>
                      </div>
                      {row[9] && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="font-semibold text-slate-700 mb-1">Work Link:</p>
                          <a href={row[9]} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                            {row[9]}
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="flex border-t border-slate-100 divide-x divide-slate-100">
                    {(!row[7] || row[7] === "Pending") && (
                      <>
                        <button 
                          className="w-1/2 h-12 flex items-center justify-center font-bold text-green-600 bg-white hover:bg-green-50 active:bg-green-100 transition-colors disabled:opacity-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            const d = new Date(row[3]);
                            const formattedDate = !isNaN(d.getTime()) ? format(d, "yyyy-MM-dd") : (row[3] || "");
                            setAcceptModalData({
                              rowIndex: rowIndex,
                              name: row[0] || "",
                              date: formattedDate,
                              timeSlot: row[4] || "",
                              serviceType: row[5] || "",
                              email: row[11] || ""
                            });
                          }}
                          disabled={updatingAction !== null}
                        >
                          {updatingAction?.rowIndex === rowIndex && updatingAction?.action === "Accepted" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Accept
                        </button>
                        <button 
                          className="w-1/2 h-12 flex items-center justify-center font-bold text-red-600 bg-white hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-50"
                          onClick={() => handleStatusUpdate(rowIndex, "Rejected")}
                          disabled={updatingAction !== null}
                        >
                          {updatingAction?.rowIndex === rowIndex && updatingAction?.action === "Rejected" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Reject
                        </button>
                      </>
                    )}
                    {row[7] === "Accepted" && (
                      <button 
                        className="w-full h-12 flex items-center justify-center font-bold text-blue-600 bg-white hover:bg-blue-50 active:bg-blue-100 transition-colors disabled:opacity-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPromptLink({ rowIndices: [rowIndex], link: "", facebookLink: "", igLink: "" });
                        }}
                        disabled={updatingAction !== null}
                      >
                        Submit Work
                      </button>
                    )}
                    {row[7] === "Rejected" && (() => {
                      const diffDays = (new Date().getTime() - new Date(row[10] || row[3]).getTime()) / (1000 * 3600 * 24);
                      const daysLeft = Math.max(0, Math.ceil(3 - diffDays));
                      return (
                        <div className="w-full h-12 flex items-center justify-center font-medium text-slate-500 bg-slate-50/50 text-sm">
                          <Loader2 className="w-4 h-4 mr-2 text-slate-400" style={{ animation: 'spin 3s linear infinite reverse' }} />
                          ลบอัตโนมัติจากชีตในอีก {daysLeft} วัน
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
            {bookings.length <= 1 && (
              <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-slate-200">
                No bookings found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
