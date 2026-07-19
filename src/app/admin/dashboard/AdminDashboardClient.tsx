"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Settings } from "lucide-react";
import Link from "next/link";

interface Props {
  initialBookings: any[];
  spreadsheetId: string;
}

export default function AdminDashboardClient({ initialBookings, spreadsheetId }: Props) {
  const [bookings, setBookings] = useState(initialBookings);
  const [updatingAction, setUpdatingAction] = useState<{ rowIndex: number, action: string } | null>(null);
  
  // State for the Google Photos/Drive Link prompt
  const [promptLink, setPromptLink] = useState<{ rowIndex: number, link: string } | null>(null);
  
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
      setPromptLink(null);
    }
  };


  // Queue Status State
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(true);
  const [loadingQueueStatus, setLoadingQueueStatus] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/admin/settings?key=booking_status")
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


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b shadow-sm sticky top-0 z-40 mb-8">
        <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
          <a href="/" className="font-bold text-xl hover:opacity-80 flex items-center gap-2">
            <span className="text-orange-500">PhotoClubClickQ</span>
            <span className="text-slate-500 text-sm font-normal">| Admin</span>
          </a>
          <div className="flex items-center gap-2 md:gap-4">
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
          <a
            href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            Open Google Sheet
          </a>
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
                  onClick={() => handleStatusUpdate(promptLink.rowIndex, "Completed", promptLink.link)}
                  disabled={updatingAction !== null}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center"
                >
                  {updatingAction?.action === "Completed" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {updatingAction?.action === "Completed" ? "Saving..." : "Submit"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
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

                return (
                  <React.Fragment key={i}>
                    <TableRow 
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setExpandedRow(expandedRow === rowIndex ? null : rowIndex)}
                    >
                      <TableCell className="font-medium text-slate-900">{row[0]}</TableCell>
                      <TableCell>{row[1]}</TableCell>
                      <TableCell>{row[3]}</TableCell>
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
                              onClick={() => setPromptLink({ rowIndex, link: "" })}
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
                        <TableCell colSpan={7} className="p-0 border-b">
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
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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
