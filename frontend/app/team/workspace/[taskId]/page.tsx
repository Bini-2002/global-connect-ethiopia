"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  Lock,
  MessageSquare,
  Send,
  Sparkles,
  TrendingUp,
  Unlock,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { eventsService } from "@/app/services/eventsService";
import { marketplaceService } from "@/app/services/marketplaceService";
import { EventTaskRecord } from "@/app/types/event";
import {
  MarketplaceRequestRecord,
  MarketplaceVendorRecord,
} from "@/app/types/marketplace";

interface WorkspacePageProps {
  params: {
    taskId: string;
  };
}

export default function ScopedWorkspacePage({ params }: WorkspacePageProps) {
  const { taskId } = params;
  const router = useRouter();

  // Core State
  const [task, setTask] = useState<EventTaskRecord | null>(null);
  const [eventData, setEventData] = useState<any | null>(null);
  const [scheduleItems, setScheduleItems] = useState<any[]>([]);
  const [vipReservations, setVipReservations] = useState<any[]>([]);
  const [venueReservations, setVenueReservations] = useState<any[]>([]);
  const [vendors, setVendors] = useState<MarketplaceVendorRecord[]>([]);
  const [requests, setRequests] = useState<MarketplaceRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active UI States
  const [activeTab, setActiveTab] = useState<"negotiations" | "opportunities">("negotiations");
  const [selectedVendor, setSelectedVendor] = useState<MarketplaceVendorRecord | null>(null);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Form States for Negotiation
  const [initiationDescription, setInitiationDescription] = useState("");
  const [negotiationAmount, setNegotiationAmount] = useState("");
  const [negotiationMessage, setNegotiationMessage] = useState("");
  const [isProcessingNegotiation, setIsProcessingNegotiation] = useState(false);

  // Fetch Workspace Data
  const loadWorkspaceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch all assigned tasks to find this specific one
      const myTasks = await eventsService.getMyTasks();
      const currentTask = myTasks.find((t) => t.id === taskId);
      if (!currentTask) {
        throw new Error("Task not found or you are not assigned to it.");
      }
      setTask(currentTask);

      // 2. Fetch associated Event and relevant read-only data
      const eventDetails = await eventsService.getEventById(currentTask.event_id);
      setEventData(eventDetails);

      const [schedule, vips, venues, allVendors, allRequests] = await Promise.all([
        eventsService.getEventSchedule(currentTask.event_id).catch(() => []),
        eventsService.listVipReservations(currentTask.event_id).catch(() => []),
        eventsService.getVenueReservations(currentTask.event_id).catch(() => []),
        marketplaceService.listVendors().catch(() => []),
        marketplaceService.listRequests().catch(() => []),
      ]);

      setScheduleItems(schedule);
      setVipReservations(vips);
      setVenueReservations(venues);
      setVendors(allVendors);

      // Only show requests scoped to this task's event_id
      const scopedRequests = allRequests.filter(
        (r) => r.event_id === currentTask.event_id
      );
      setRequests(scopedRequests);

      // Set default selected vendor if available
      if (allVendors.length > 0 && !selectedVendor) {
        setSelectedVendor(allVendors[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspaceData();
  }, [taskId]);

  // Handlers
  const handleInitiateNegotiation = async (vendorId: string) => {
    if (!task || !initiationDescription.trim()) return;
    try {
      setIsProcessingNegotiation(true);
      const payload = {
        vendor_id: vendorId,
        event_id: task.event_id,
        description: initiationDescription,
      };
      const newRequest = await marketplaceService.createRequest(payload);
      setRequests((prev) => [newRequest, ...prev]);
      setInitiationDescription("");
      alert("Negotiation successfully initiated with the vendor!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to initiate negotiation.");
    } finally {
      setIsProcessingNegotiation(false);
    }
  };

  const handleSendOffer = async (
    requestId: string,
    type: "quote" | "counter"
  ) => {
    const amountNum = parseFloat(negotiationAmount);
    if (!negotiationAmount || isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      setIsProcessingNegotiation(true);
      const payload = {
        amount: amountNum,
        message: negotiationMessage,
      };

      const updatedRequest =
        type === "quote"
          ? await marketplaceService.sendQuote(requestId, payload)
          : await marketplaceService.sendCounter(requestId, payload);

      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? updatedRequest : r))
      );
      setNegotiationAmount("");
      setNegotiationMessage("");
      alert("Negotiation message sent to vendor.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send offer.");
    } finally {
      setIsProcessingNegotiation(false);
    }
  };

  const handleFinishTask = async () => {
    if (!task) return;
    try {
      setIsSubmittingTask(true);
      const updated = await eventsService.submitTaskForApproval(
        task.event_id,
        task.id
      );
      setTask(updated);
      alert("Task submitted for approval. Great job!");
      router.push("/team/dashboard");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit task.");
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const formatCurrency = (amount: number = 0) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Loading and Error Views
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#062E22] font-semibold animate-pulse">
          Opening Workspace...
        </p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-3xl p-8 border border-slate-100 shadow-xl text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-850 mb-2">Access Error</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            {error || "We could not find the task details or you do not have permission."}
          </p>
          <Link
            href="/team/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#062E22] hover:bg-[#0a4030] text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Active Request for Selected Vendor
  const activeRequest = requests.find((r) => r.vendor_id === selectedVendor?.id);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      {/* Upper Premium Workspace Header */}
      <header className="bg-[#062E22] text-white py-8 px-4 sm:px-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 transition-transform duration-700" />
        <div className="max-w-7xl mx-auto flex flex-col gap-6 relative z-10">
          <div className="flex items-center justify-between">
            <Link
              href="/team/dashboard"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#8CB988] hover:text-white transition-colors uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Portal Dashboard
            </Link>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <Unlock className="w-3.5 h-3.5" /> Scoped Workspace
              </span>
              {task.negotiation_phase_locked && (
                <span className="px-3 py-1 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Lock className="w-3.5 h-3.5" /> Negotiation Locked
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-[10px] text-[#8CB988] uppercase tracking-widest font-black mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> TASK {taskId.slice(-6).toUpperCase()} WORKSPACE
              </p>
              <h1 className="text-3xl font-black tracking-tight">{task.title}</h1>
              <p className="text-white/60 text-sm font-medium mt-1">
                Event: {eventData?.title || "Loading event..."} • Status:{" "}
                <span className="font-bold text-[#8CB988] uppercase">
                  {task.status.replace("_", " ")}
                </span>
              </p>
            </div>
            {task.payout_amount && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md flex items-center gap-4">
                <div>
                  <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">
                    Escrow Payout
                  </p>
                  <p className="text-2xl font-black text-[#8CB988] mt-0.5">
                    {formatCurrency(task.payout_amount)}
                  </p>
                </div>
                {task.escrow_locked && (
                  <div className="px-3 py-1.5 bg-emerald-500/10 text-[#8CB988] rounded-xl text-[9px] font-black uppercase border border-[#8CB988]/20 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#8CB988] animate-pulse" />
                    Locked in Escrow
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-8">
        {/* Workspace Tab Bar */}
        <div className="flex gap-2 mb-8 bg-slate-100 p-1 rounded-2xl max-w-sm">
          <button
            onClick={() => setActiveTab("negotiations")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === "negotiations"
                ? "bg-white text-[#062E22] shadow-md"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Negotiations
          </button>
          <button
            onClick={() => setActiveTab("opportunities")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === "opportunities"
                ? "bg-white text-[#062E22] shadow-md"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Opportunities
          </button>
        </div>

        {activeTab === "negotiations" ? (
          /* negotiations Tab View */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Vendors List Column */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                <h2 className="text-md font-black text-[#062E22] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Building className="w-5 h-5 text-emerald-600" /> Available Vendors
                </h2>
                <p className="text-xs text-slate-400 font-medium mb-4 leading-relaxed">
                  Only negotiate with vendors relevant to the task event.
                </p>
                <div className="space-y-3">
                  {vendors.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-2xl">
                      No verified vendors found
                    </div>
                  ) : (
                    vendors.map((v) => {
                      const reqForThis = requests.find((r) => r.vendor_id === v.id);
                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVendor(v)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex flex-col gap-2 ${
                            selectedVendor?.id === v.id
                              ? "bg-[#062E22]/5 border-[#062E22]/20 shadow-sm"
                              : "bg-white border-slate-100 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-slate-800 text-sm truncate">
                              {v.business_name}
                            </h3>
                            {reqForThis && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-150 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                {reqForThis.status}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                            <span>{v.business_category || "General service"}</span>
                            <span>★ {v.rating?.toFixed(1) || "5.0"}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Negotiation Details/Chat Panel */}
            <div className="lg:col-span-8">
              {selectedVendor ? (
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                  {/* Panel Header */}
                  <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                    <div>
                      <h3 className="font-black text-slate-850 text-md uppercase tracking-wider">
                        {selectedVendor.business_name}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">
                        Category: {selectedVendor.business_category || "General"}
                      </p>
                    </div>
                    {activeRequest && (
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-emerald-600 animate-pulse" />
                        <span className="text-xs font-bold text-slate-600 bg-white border border-slate-100 px-3 py-1.5 rounded-xl shadow-xs">
                          Current Offer:{" "}
                          <span className="font-black text-emerald-600">
                            {formatCurrency(activeRequest.current_amount || 0)}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Negotiation Body / Message History */}
                  <div className="flex-1 p-6 overflow-y-auto space-y-4 max-h-[400px]">
                    {task.negotiation_phase_locked && (
                      <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-2xl flex items-start gap-3 mb-4">
                        <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-black text-amber-800 uppercase tracking-wider">
                            Negotiation Locked by Organizer
                          </p>
                          <p className="text-xs text-amber-700 font-medium mt-0.5 leading-relaxed">
                            The event organizer has locked vendor negotiations and is now preparing
                            contracts. You can review the thread history but cannot submit new
                            offers.
                          </p>
                        </div>
                      </div>
                    )}

                    {!activeRequest ? (
                      /* Initiation Form */
                      <div className="p-8 text-center max-w-md mx-auto my-10 space-y-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4">
                          <MessageSquare className="w-8 h-8 text-slate-300" />
                        </div>
                        <h4 className="font-black text-slate-800">No Current Active Thread</h4>
                        <p className="text-slate-400 text-xs leading-relaxed font-medium">
                          You haven't initiated a negotiation thread with {selectedVendor.business_name} yet. Write an initial request to start the negotiation.
                        </p>
                        <div className="space-y-3 pt-2 text-left">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                            Describe Service Needed
                          </label>
                          <textarea
                            value={initiationDescription}
                            onChange={(e) => setInitiationDescription(e.target.value)}
                            disabled={task.negotiation_phase_locked}
                            placeholder="State exactly what vendor service, volume, and specifications you require..."
                            className="w-full p-4 border border-slate-200 rounded-2xl text-sm outline-none focus:border-[#062E22] transition-colors resize-none h-24 disabled:bg-slate-50 disabled:cursor-not-allowed"
                          />
                          <button
                            onClick={() => handleInitiateNegotiation(selectedVendor.id)}
                            disabled={
                              isProcessingNegotiation ||
                              !initiationDescription.trim() ||
                              task.negotiation_phase_locked
                            }
                            className="w-full py-4 bg-[#062E22] hover:bg-[#0b3c2e] disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-md flex items-center justify-center gap-2"
                          >
                            {isProcessingNegotiation ? "Initiating..." : "Initiate Negotiation"}
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Chat message history bubble thread */
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-3">
                          <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Request Description
                            </p>
                            <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                              {activeRequest.description}
                            </p>
                          </div>
                        </div>

                        {activeRequest.messages.length === 0 ? (
                          <p className="text-xs text-center text-slate-400 py-10 font-bold">
                            Negotiation initiated. Awaiting vendor response...
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {activeRequest.messages.map((m, index) => {
                              // If sender_id === selectedVendor.id, it is vendor, else it is TM
                              const isVendor = m.sender_id === selectedVendor.id;
                              return (
                                <div
                                  key={index}
                                  className={`flex flex-col max-w-[80%] ${
                                    isVendor ? "mr-auto" : "ml-auto items-end"
                                  }`}
                                >
                                  <div
                                    className={`p-4 rounded-[2rem] ${
                                      isVendor
                                        ? "bg-slate-100 text-slate-800 rounded-tl-sm"
                                        : "bg-[#062E22] text-white rounded-tr-sm"
                                    }`}
                                  >
                                    <div className="flex justify-between items-center gap-4 mb-2">
                                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                        {isVendor ? "Vendor Quote" : "Your Counter"}
                                      </span>
                                      <span className="text-xs font-black">
                                        {formatCurrency(m.amount)}
                                      </span>
                                    </div>
                                    {m.message && (
                                      <p className="text-xs font-medium leading-relaxed">
                                        {m.message}
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-[9px] text-slate-400 mt-1 font-bold">
                                    {new Date(m.timestamp).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Panel Reply Form (Counter-offers) */}
                  {activeRequest && !task.negotiation_phase_locked && (
                    <div className="p-6 border-t border-slate-50 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                            Offer Payout Amount (ETB)
                          </label>
                          <input
                            type="number"
                            value={negotiationAmount}
                            onChange={(e) => setNegotiationAmount(e.target.value)}
                            disabled={isProcessingNegotiation}
                            placeholder="e.g. 50000"
                            className="w-full p-4 border border-slate-200 rounded-2xl text-sm outline-none focus:border-[#062E22] transition-colors outline-none disabled:bg-slate-50"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                            Optional Message
                          </label>
                          <input
                            type="text"
                            value={negotiationMessage}
                            onChange={(e) => setNegotiationMessage(e.target.value)}
                            disabled={isProcessingNegotiation}
                            placeholder="Provide details about volume/specifications..."
                            className="w-full p-4 border border-slate-200 rounded-2xl text-sm outline-none focus:border-[#062E22] transition-colors outline-none disabled:bg-slate-50"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleSendOffer(activeRequest.id, "counter")}
                          disabled={
                            isProcessingNegotiation || !negotiationAmount
                          }
                          className="px-6 py-4 bg-[#062E22] hover:bg-[#0b3c2e] disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-md flex items-center gap-2"
                        >
                          Send Counter-Offer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-12 text-center text-slate-400 flex flex-col justify-center items-center min-h-[500px]">
                  <Building className="w-12 h-12 text-slate-200 mb-4" />
                  <p className="text-sm font-bold">Select a vendor from the list to begin negotiating.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Opportunities Tab View (Read Only Event Workspace Info) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Hand: Event Details Summary */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-[#062E22] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" /> Event Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">
                      Event Name
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {eventData?.title || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">
                      Category
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {eventData?.category || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">
                      Location
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {eventData?.location || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">
                      Dates
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {eventData?.start_date
                        ? `${new Date(eventData.start_date).toLocaleDateString()} - ${
                            eventData.end_date
                              ? new Date(eventData.end_date).toLocaleDateString()
                              : ""
                          }`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Hand: Schedule, Venue Status, VIP list */}
            <div className="lg:col-span-8 space-y-8">
              {/* Venue Reservations section */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-[#062E22] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-600" /> Venue Bookings
                </h3>
                {venueReservations.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 font-bold text-center">
                    No venue reservations booked for this event.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {venueReservations.map((v) => (
                      <div key={v.id} className="py-3 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{v.venue_name}</p>
                          <p className="text-[10px] text-slate-400">{v.city}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            v.status === "confirmed"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              : "bg-amber-50 text-amber-600 border border-amber-100"
                          }`}
                        >
                          {v.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Event Itinerary / Schedule items */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-[#062E22] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" /> Schedule Itinerary
                </h3>
                {scheduleItems.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 font-bold text-center">
                    No scheduled sessions drafted yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {scheduleItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100"
                      >
                        <div className="text-center bg-white border border-slate-200 px-3 py-2 rounded-xl h-fit shrink-0">
                          <p className="text-xs font-black text-[#062E22]">
                            {new Date(item.start_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">
                            {item.session_title}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium mt-1">
                            {item.description || "No session description details."}
                          </p>
                          {item.room_location && (
                            <span className="inline-block mt-2 px-2.5 py-1 bg-slate-200/50 text-[10px] font-bold text-slate-600 rounded-lg">
                              📍 {item.room_location}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* VIP reservations list */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-[#062E22] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" /> VIP Hotel Reservations
                </h3>
                {vipReservations.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 font-bold text-center">
                    No VIP room reservations queued.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vipReservations.map((vip) => (
                      <div
                        key={vip.id}
                        className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50"
                      >
                        <h4 className="font-bold text-slate-800 text-sm">{vip.vip_name}</h4>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {vip.vip_email || "No email"}
                        </p>
                        <div className="mt-2 text-xs font-bold text-slate-600 bg-white px-2 py-1.5 border border-slate-100 rounded-lg">
                          🏨 {vip.hotel_name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Persistent Bottom Bar (I Have Finished flow gate) */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 py-5 px-6 shadow-2xl z-40 flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                task.status === "done"
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-amber-100 text-amber-600"
              }`}
            >
              {task.status === "done" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Current Task Phase
              </p>
              <h4 className="text-sm font-black text-slate-800 capitalize mt-0.5">
                {task.status.replace("_", " ")}
              </h4>
            </div>
          </div>

          <div className="flex gap-3">
            {task.status === "in_progress" && (
              <button
                onClick={handleFinishTask}
                disabled={isSubmittingTask}
                className="px-8 py-4 bg-[#8CB988] hover:bg-[#7aa976] text-[#062E22] rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-emerald-100/50 flex items-center gap-2"
              >
                {isSubmittingTask ? "Submitting..." : "I Have Finished"}
                <CheckCircle2 className="w-4.5 h-4.5" />
              </button>
            )}
            {task.status === "pending_approval" && (
              <div className="px-6 py-4 bg-amber-50 text-amber-600 rounded-2xl text-xs font-black uppercase tracking-widest border border-amber-100 flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 animate-spin" />
                Awaiting Organizer Approval
              </div>
            )}
            {task.status === "done" && (
              <div className="px-6 py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
                <CheckCircle2 className="w-4.5 h-4.5" />
                Task Paid & Completed
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
