"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Settings } from "lucide-react";
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
  const [promptLink, setPromptLink] = useState<{ rowIndices: number[], link: string } | null>(null);
  
  // State for expanded row details
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const handleStatusUpdate = async (rowIndex: number, status: string, googlePhotosLink?: string) => {
    setUpdatingAction({ rowIndex, action: status });
    try {
      // Extract details for the Gallery sheet if it's Completed
      const rowData = bookings[rowIndex]; // rowIndex is 1-indexed for bookings array (0 is header, 1 is first row)
      const bookingDetails = {
        name: rowData[0],
        serviceType: rowData[5],
        date: rowData[3]
      };

      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndex, status, googlePhotosLink, bookingDetails }),
      });
      
      if (res.ok) {
        // Optimistic update
        const updatedBookings = [...bookings];
        updatedBookings[rowIndex][7] = status;
        if (googlePhotosLink !== undefined) {
          updatedBookings[rowIndex][9] = googlePhotosLink;
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

  const handleBulkStatusUpdate = async (status: string, googlePhotosLink?: string) => {
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
        date: rowData[3]
      };

      try {
        const res = await fetch("/api/admin/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rowIndex, status, googlePhotosLink, bookingDetails }),
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

        return status === activeTab;
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
      <nav className="bg-white border-b shadow-sm sticky top-0 z-40 mb-8">
        <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
          <a href="/" className="font-bold text-xl hover:opacity-80 flex items-center gap-2">
            <span className="text-orange-500">PhotoClubClickQ</span>
            <span className="text-slate-500 text-sm font-normal">| Admin</span>
          </a>
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/admin/gallery">
              <Button variant="ghost" className="text-slate-600 hover:text-slate-900" title="Manage Gallery">
                <span className="hidden md:inline">Gallery</span>
              </Button>
            </Link>
            <Link href="/admin/team">
              <Button variant="ghost" className="text-slate-600 hover:text-slate-900" title="Manage Team">
                <Users className="w-5 h-5 mr-0 md:mr-2" />
                <span className="hidden md:inline">Team</span>
              </Button>
            </Link>
            <Link href="/admin/settings">
              <Button variant="ghost" className="text-slate-600 hover:text-slate-900" title="Settings">
                <Settings className="w-5 h-5 mr-0 md:mr-2" />
                <span className="hidden md:inline">Settings</span>
              </Button>
            </Link>
            <Button variant="ghost" onClick={async () => {
              await fetch('/api/admin/logout', { method: 'POST' });
              window.location.href = '/';
            }}>
              ออกจากระบบ
            </Button>
          </div>
        </div>
      </nav>
      <div className="p-8 max-w-6xl mx-auto pt-0 w-full flex-1">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">Management Queue</h1>
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
              <span className={`text-sm font-bold ${loadingQueueStatus ? "text-slate-400" : isQueueOpen ? "text-green-600" : "text-red-600"}`}>
                {loadingQueueStatus ? "กำลังโหลด..." : isQueueOpen ? "เปิดรับคิว" : "ปิดรับคิวชั่วคราว"}
              </span>
              <button
                onClick={handleToggleQueue}
                disabled={loadingQueueStatus}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                  isQueueOpen ? "bg-green-500" : "bg-slate-300"
                }`}
              >
                <span className="sr-only">Toggle Queue</span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isQueueOpen ? "translate-x-6" : "translate-x-1"
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
              <p className="text-sm text-slate-600 mb-2">Please enter the Google Drive / Google Photos link for this job:</p>
              <input 
                type="text" 
                value={promptLink.link}
                onChange={(e) => setPromptLink({ ...promptLink, link: e.target.value })}
                className="w-full border p-2 rounded mb-4"
                placeholder="https://drive.google.com/..."
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPromptLink(null)}>Cancel</Button>
                <Button 
                  onClick={() => {
                    if (promptLink.rowIndices.length === 1) {
                      const rowIndex = promptLink.rowIndices[0];
                      handleStatusUpdate(rowIndex, "Completed", promptLink.link);
                      setPromptLink(null);
                    } else {
                      handleBulkStatusUpdate("Completed", promptLink.link);
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
                    setPromptLink({ rowIndices: acceptedRows, link: "" });
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

        <div className="bg-white rounded-lg shadow overflow-x-auto">
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
                        return status === activeTab;
                      }).length > 0 &&
                      bookings.slice(1).filter(row => {
                        if (!row[0] || String(row[0]).trim() === "") return false;
                        const status = row[7] || "Pending";
                        if (status === "Rejected" && (new Date().getTime() - new Date(row[3]).getTime()) / (1000 * 3600 * 24) > 3) return false;
                        return status === activeTab;
                      }).every((_, idx) => {
                        // Find the real index in the original bookings array
                        const realIndex = bookings.findIndex((r, i) => i > 0 && r === bookings.slice(1).filter(row => {
                            if (!row[0] || String(row[0]).trim() === "") return false;
                            const status = row[7] || "Pending";
                            if (status === "Rejected" && (new Date().getTime() - new Date(row[3]).getTime()) / (1000 * 3600 * 24) > 3) return false;
                            return status === activeTab;
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
                  const bookingDate = new Date(row[3]);
                  const today = new Date();
                  const diffTime = today.getTime() - bookingDate.getTime();
                  const diffDays = diffTime / (1000 * 3600 * 24);
                  if (diffDays > 3) return null;
                }

                // Filter by active tab
                const status = row[7] || "Pending";
                if (status !== activeTab) return null;

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
                                onClick={() => handleStatusUpdate(rowIndex, "Accepted")}
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
                                setPromptLink({ rowIndices: [rowIndex], link: "" });
                              }}
                              disabled={updatingAction !== null}
                            >
                              Submit Work
                            </Button>
                          )}
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
      </div>
    </div>
  );
}
