"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useAuthUser } from "@/lib/useAuthUser";

import HarvestForm from "@/components/forms/HarvestForm";
import IrrigationForm from "@/components/forms/IrrigationForm";
import ProductionChart from "@/components/charts/ProductionChart";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ErrorModal from "@/components/ui/ErrorModal";
import Toast from "@/components/ui/Toast";
import FormDialog from "@/components/ui/FormDialog";
import ZoneMap from "@/components/maps/ZoneMap";
import ZoneDrawMap from "@/components/maps/ZoneDrawMap";
import {
  calculateYieldPerTree,
  groupHarvestByMonth,
  sumHarvestQuantity,
} from "@/lib/helpers";

import { 
  ChevronLeft, 
  Sprout, 
  Droplets, 
  Grape, 
  Activity, 
  Calendar, 
  Info,
  History,
  TrendingUp,
  PlusCircle
} from "lucide-react";

export default function ZoneDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [zone, setZone] = useState<any>(null);
  const [farm, setFarm] = useState<any>(null);
  const [harvests, setHarvests] = useState<any[]>([]);
  const [irrigations, setIrrigations] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuthUser();
  const [batchForm, setBatchForm] = useState({ planting_year: "", variety: "", tree_count: "", notes: "" });
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);
  const [batchToast, setBatchToast] = useState({ open: false, message: "" });
  const [batchError, setBatchError] = useState({
    open: false,
    message: "",
  });
  const [batchFormOpen, setBatchFormOpen] = useState(false);
  const [harvestFormOpen, setHarvestFormOpen] = useState(false);
  const [irrigationFormOpen, setIrrigationFormOpen] = useState(false);
  const lastBatchSync = useRef<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteToast, setDeleteToast] = useState({ open: false, message: "" });
  const [deleteError, setDeleteError] = useState({
    open: false,
    message: "",
  });
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editToast, setEditToast] = useState({ open: false, message: "" });
  const [editError, setEditError] = useState({
    open: false,
    message: "",
  });
  const [editBoundary, setEditBoundary] = useState<[number, number][]>([]);
  const [occupiedBoundaries, setOccupiedBoundaries] = useState<
    [number, number][][]
  >([]);
  const [editForm, setEditForm] = useState({
    name: "",
    area_ha: "",
    tree_count: "",
    avg_tree_age_years: "",
    variety: "",
  });

  // --- DATA FETCHING ---
  const fetchData = async () => {
    if (!id || !user) return;
    try {
      const { data: zoneData, error: zoneError } = await supabase
        .from("zones")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (zoneError) throw zoneError;

      const [h, i, b, f, z] = await Promise.all([
        supabase
          .from("harvests")
          .select("*")
          .eq("zone_id", id)
          .eq("user_id", user.id)
          .order("harvest_date", { ascending: false }),
        supabase
          .from("irrigation_logs")
          .select("*")
          .eq("zone_id", id)
          .eq("user_id", user.id)
          .order("irrigation_date", { ascending: false }),
        supabase
          .from("plantation_batches")
          .select("*")
          .eq("zone_id", id)
          .eq("user_id", user.id)
          .order("planting_year", { ascending: false }),
        supabase
          .from("farms")
          .select("id, name, boundary")
          .eq("id", zoneData.farm_id)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("zones")
          .select("id, boundary")
          .eq("farm_id", zoneData.farm_id)
          .eq("user_id", user.id),
      ]);

      setZone(zoneData);
      setHarvests(h.data || []);
      setIrrigations(i.data || []);
      setBatches(b.data || []);
      setFarm(f.data || null);
      const boundaries =
        z.data
          ?.filter((item) => item.id !== zoneData.id)
          .map((item) => item.boundary)
          .filter(
            (bnd): bnd is [number, number][] =>
              Array.isArray(bnd) && bnd.length > 2
          ) || [];
      setOccupiedBoundaries(boundaries);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!authLoading) fetchData(); }, [authLoading, id, user]);

  // --- CALCULATIONS ---
  const chartData = useMemo(() => groupHarvestByMonth(harvests), [harvests]);
  const totalHarvestQuantity = useMemo(() => sumHarvestQuantity(harvests), [harvests]);
  
  const derivedZone = useMemo(() => {
    if (!zone) return null;
    if (batches.length === 0) return zone;
    const totalTrees = batches.reduce((sum, b) => sum + Number(b.tree_count || 0), 0);
    const latestVariety = batches.find(b => b.variety)?.variety;
    return { ...zone, tree_count: totalTrees || zone.tree_count, variety: latestVariety || zone.variety };
  }, [zone, batches]);

  const displayZone = derivedZone ?? zone;
  const yieldPerTree = calculateYieldPerTree(totalHarvestQuantity, displayZone?.tree_count ?? null);

  const handleBatchChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setBatchForm((prev) => ({ ...prev, [name]: value }));
  };

  const fetchHarvests = async (zoneId: string, userId: string) => {
    const { data, error } = await supabase
      .from("harvests")
      .select("*")
      .eq("zone_id", zoneId)
      .eq("user_id", userId)
      .order("harvest_date", { ascending: false });
    if (!error) setHarvests(data || []);
  };

  const fetchIrrigations = async (zoneId: string, userId: string) => {
    const { data, error } = await supabase
      .from("irrigation_logs")
      .select("*")
      .eq("zone_id", zoneId)
      .eq("user_id", userId)
      .order("irrigation_date", { ascending: false });
    if (!error) setIrrigations(data || []);
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (batchSaving) return;
    setBatchConfirmOpen(true);
  };

  const handleBatchConfirm = async () => {
    setBatchConfirmOpen(false);
    setBatchSaving(true);
    const { error } = await supabase.from("plantation_batches").insert({
      user_id: user?.id, zone_id: id,
      planting_year: Number(batchForm.planting_year),
      variety: batchForm.variety,
      tree_count: Number(batchForm.tree_count),
      notes: batchForm.notes
    });
    if (!error) {
      setBatchToast({
        open: true,
        message: "Planting batch saved."
      });
      setBatchForm({ planting_year: "", variety: "", tree_count: "", notes: "" });
      fetchData();
      setBatchFormOpen(false);
    } else {
      setBatchError({
        open: true,
        message: error.message
      });
    }
    setBatchSaving(false);
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditAreaChange = useCallback((areaHa: number) => {
    const next = Number.isFinite(areaHa) ? areaHa.toFixed(2) : "";
    setEditForm((prev) => ({ ...prev, area_ha: next }));
  }, []);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || editSaving) return;
    if (!editBoundary.length) {
      setEditError({
        open: true,
        message: "Draw zone boundary before saving.",
      });
      return;
    }

    setEditSaving(true);
    const { error: updateError } = await supabase
      .from("zones")
      .update({
        name: editForm.name,
        area_ha: editForm.area_ha ? Number(editForm.area_ha) : null,
        tree_count: editForm.tree_count ? Number(editForm.tree_count) : null,
        avg_tree_age_years: editForm.avg_tree_age_years
          ? Number(editForm.avg_tree_age_years)
          : null,
        variety: editForm.variety || null,
        boundary: editBoundary,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      setEditError({
        open: true,
        message: updateError.message,
      });
      setEditSaving(false);
      return;
    }

    setEditToast({ open: true, message: "Zone updated." });
    setEditFormOpen(false);
    fetchData();
    setEditSaving(false);
  };

  useEffect(() => {
    if (!editFormOpen || !displayZone) return;
    setEditForm({
      name: displayZone.name ?? "",
      area_ha: displayZone.area_ha != null ? String(displayZone.area_ha) : "",
      tree_count: displayZone.tree_count != null ? String(displayZone.tree_count) : "",
      avg_tree_age_years:
        displayZone.avg_tree_age_years != null
          ? String(displayZone.avg_tree_age_years)
          : "",
      variety: displayZone.variety ?? "",
    });
    setEditBoundary(
      Array.isArray(displayZone.boundary) ? displayZone.boundary : []
    );
  }, [displayZone, editFormOpen]);

  const handleConfirmDelete = async () => {
    if (!user || !id || deleteLoading) return;
    setDeleteConfirmOpen(false);
    setDeleteLoading(true);
    const { error: deleteError } = await supabase
      .from("zones")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (deleteError) {
      setDeleteError({
        open: true,
        message: deleteError.message,
      });
      setDeleteLoading(false);
      return;
    }
    setDeleteToast({ open: true, message: "Zone deleted." });
    router.push("/dashboard/zones");
  };

  if (loading || authLoading) return <div className="p-10 text-center animate-pulse text-slate-500">Loading Zone Data...</div>;
  if (error) return <div className="p-10 text-red-500 text-center bg-red-50 rounded-xl m-4">Error: {error}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header & Breadcrumb */}
      <nav className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <Link href="/dashboard/zones" className="group flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-green-600 transition-colors">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 group-hover:border-green-200 group-hover:bg-green-50">
            <ChevronLeft className="w-4 h-4" />
          </div>
          Back to All Zones
        </Link>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-tighter">Zone Active</span>
          <button
            type="button"
            onClick={() => setEditFormOpen(true)}
            className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold uppercase tracking-tighter hover:bg-slate-200"
          >
            Edit Zone
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold uppercase tracking-tighter hover:bg-red-100"
          >
            Delete Zone
          </button>
        </div>
      </nav>

      {/* Main Stats Hero */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-4">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Zone {displayZone.name}</h1>
              <p className="text-slate-500 mt-1 flex items-center gap-2">
                <Sprout className="w-4 h-4 text-green-500" />
                Variety: <span className="font-semibold text-slate-700">{displayZone.variety || "Mixed"}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Area</p>
                <p className="text-lg font-bold text-slate-900">{displayZone.area_ha ?? "-"} ha</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Tree Age</p>
                <p className="text-lg font-bold text-slate-900">{displayZone.avg_tree_age_years ?? "-"} yrs</p>
              </div>
            </div>
          </div>

          {/* Efficiency Card */}
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-3xl p-6 text-white shadow-lg shadow-green-200 flex flex-col justify-between min-w-[280px]">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-white/10 rounded-lg"><TrendingUp className="w-5 h-5 text-white" /></div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Efficiency Rating</p>
            </div>
            <div className="my-4">
              <h2 className="text-5xl font-black tracking-tighter">{displayZone.tree_count ? yieldPerTree.toFixed(2) : "0.00"}</h2>
              <p className="text-sm font-medium opacity-90">units per tree</p>
            </div>
            <div className="pt-4 border-t border-white/10 text-xs">
              Total Production: <span className="font-bold">{totalHarvestQuantity.toLocaleString()} {harvests[0]?.unit || "units"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex gap-1 bg-slate-200/50 p-1 rounded-xl w-full md:w-fit mx-2">
        {[
          { id: "overview", label: "Analysis", icon: Activity },
          { id: "harvest", label: "Harvest", icon: Grape },
          { id: "irrigation", label: "Irrigation", icon: Droplets },
          { id: "batches", label: "Batches", icon: Calendar }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === tab.id ? "bg-white text-green-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* --- TAB CONTENT --- */}
      <div className="mt-4 px-2">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" /> Production Trend
              </h3>
              <div className="h-[300px] w-full">
                {chartData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                    <Info className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm">No harvest data recorded yet for this zone.</p>
                  </div>
                ) : (
                  <ProductionChart data={chartData} />
                )}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-500" /> Zone Map
              </h3>
              <div className="h-[360px] w-full">
                {Array.isArray(displayZone?.boundary) &&
                displayZone.boundary.length ? (
                  <ZoneMap boundary={displayZone.boundary} />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    No boundary data available for this zone.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* HARVEST TAB */}
        {activeTab === "harvest" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in duration-300">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><PlusCircle className="w-5 h-5 text-green-600" /> New Harvest</h3>
                <button
                  type="button"
                  onClick={() => setHarvestFormOpen(true)}
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg"
                >
                  Add Harvest
                </button>
              </div>
            </div>
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest">Harvest History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="p-4 font-bold text-slate-500">Date</th>
                      <th className="p-4 font-bold text-slate-500">Yield</th>
                      <th className="p-4 font-bold text-slate-500">Grade</th>
                      <th className="p-4 font-bold text-slate-500">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {harvests.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-semibold text-slate-700">{h.harvest_date}</td>
                        <td className="p-4">{h.quantity} {h.unit}</td>
                        <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter">{h.quality_grade || "N/A"}</span></td>
                        <td className="p-4 text-slate-400 text-xs italic truncate max-w-[150px]">{h.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <FormDialog
              open={harvestFormOpen}
              title="New Harvest"
              onClose={() => setHarvestFormOpen(false)}
            >
              <HarvestForm
                zoneId={id!}
                onSuccess={() => {
                  if (user) fetchHarvests(id!, user.id);
                  setHarvestFormOpen(false);
                }}
              />
            </FormDialog>
          </div>
        )}

        {/* IRRIGATION TAB */}
        {activeTab === "irrigation" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in duration-300">
               <div className="lg:col-span-2">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Droplets className="w-5 h-5 text-blue-500" /> Log Irrigation</h3>
                  <button
                    type="button"
                    onClick={() => setIrrigationFormOpen(true)}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg"
                  >
                    Add Irrigation
                  </button>
                </div>
              </div>
              <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-bold text-xs uppercase tracking-widest text-slate-500">Irrigation Logs</div>
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/50">
                    <tr><th className="p-4 font-bold">Date</th><th className="p-4 font-bold">Method</th><th className="p-4 font-bold">Notes</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {irrigations.map(i => (
                      <tr key={i.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-medium">{i.irrigation_date}</td>
                        <td className="p-4 text-slate-600 font-semibold">{i.method || "-"}</td>
                        <td className="p-4 text-slate-400 italic text-xs">{i.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <FormDialog
              open={irrigationFormOpen}
              title="Log Irrigation"
              onClose={() => setIrrigationFormOpen(false)}
            >
              <IrrigationForm
                zoneId={id!}
                onSuccess={() => {
                  if (user) fetchIrrigations(id!, user.id);
                  setIrrigationFormOpen(false);
                }}
              />
            </FormDialog>
          </>
        )}

        {/* BATCHES TAB */}
        {activeTab === "batches" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in duration-300">
            <div className="lg:col-span-2">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><PlusCircle className="w-5 h-5 text-green-600" /> New Planting Batch</h3>
                <button
                  type="button"
                  onClick={() => setBatchFormOpen(true)}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                >
                  Add Planting Batch
                </button>
              </div>
            </div>
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
               <div className="p-4 border-b border-slate-100 font-bold text-xs uppercase tracking-widest text-slate-500">Planting Batches History</div>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50/50">
                     <tr><th className="p-4 font-bold">Year</th><th className="p-4 font-bold">Variety</th><th className="p-4 font-bold">Trees</th><th className="p-4 font-bold">Notes</th></tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {batches.map(b => (
                       <tr key={b.id} className="hover:bg-slate-50/50">
                         <td className="p-4 font-black text-slate-700">{b.planting_year}</td>
                         <td className="p-4"><span className="font-semibold text-green-700">{b.variety || "-"}</span></td>
                         <td className="p-4 font-bold">{b.tree_count}</td>
                         <td className="p-4 text-xs text-slate-400 max-w-[120px] truncate">{b.notes || "-"}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
            <FormDialog
              open={batchFormOpen}
              title="New Planting Batch"
              onClose={() => setBatchFormOpen(false)}
            >
              <form onSubmit={handleBatchSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input name="planting_year" value={batchForm.planting_year} onChange={handleBatchChange} placeholder="Year" type="number" className="w-full border-slate-200 p-3 rounded-xl focus:ring-green-500 focus:border-green-500 transition-all text-sm" required />
                  <input name="tree_count" value={batchForm.tree_count} onChange={handleBatchChange} placeholder="Count" type="number" className="w-full border-slate-200 p-3 rounded-xl focus:ring-green-500 focus:border-green-500 transition-all text-sm" required />
                </div>
                <input name="variety" value={batchForm.variety} onChange={handleBatchChange} placeholder="Variety Name" className="w-full border-slate-200 p-3 rounded-xl focus:ring-green-500 focus:border-green-500 transition-all text-sm" />
                <textarea name="notes" value={batchForm.notes} onChange={handleBatchChange} placeholder="Observations..." rows={3} className="w-full border-slate-200 p-3 rounded-xl focus:ring-green-500 focus:border-green-500 transition-all text-sm" />
                <button type="submit" disabled={batchSaving} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50">
                  {batchSaving ? "Registering..." : "Save Planting Batch"}
                </button>
              </form>
            </FormDialog>
            <ConfirmModal
              open={batchConfirmOpen}
              title="Add planting batch?"
              message="This will save the batch to the current zone."
              confirmLabel="Save"
              onCancel={() => setBatchConfirmOpen(false)}
              onConfirm={handleBatchConfirm}
            />
            <ErrorModal
              open={batchError.open}
              title="Unable to save"
              message={batchError.message}
              onClose={() =>
                setBatchError((prev) => ({ ...prev, open: false }))
              }
            />
            <Toast
              open={batchToast.open}
              message={batchToast.message}
              onClose={() =>
                setBatchToast((prev) => ({ ...prev, open: false }))
              }
            />
          </div>
        )}
      </div>
      <FormDialog
        open={editFormOpen}
        title="Edit Zone"
        onClose={() => setEditFormOpen(false)}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Zone Name
            </label>
            <input
              name="name"
              value={editForm.name}
              onChange={handleEditChange}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Area (ha)
              </label>
              <input
                name="area_ha"
                type="number"
                step="0.01"
                value={editForm.area_ha}
                onChange={handleEditChange}
                readOnly
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Tree Count
              </label>
              <input
                name="tree_count"
                type="number"
                value={editForm.tree_count}
                onChange={handleEditChange}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Avg Tree Age (years)
              </label>
              <input
                name="avg_tree_age_years"
                type="number"
                step="0.1"
                value={editForm.avg_tree_age_years}
                onChange={handleEditChange}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Variety
              </label>
              <input
                name="variety"
                value={editForm.variety}
                onChange={handleEditChange}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>
          </div>
          <div className="h-[320px] w-full rounded-2xl border border-slate-200 overflow-hidden">
            <ZoneDrawMap
              boundary={editBoundary}
              onBoundaryChange={setEditBoundary}
              onAreaChange={handleEditAreaChange}
              limitBoundary={
                Array.isArray(farm?.boundary) ? farm.boundary : []
              }
              occupiedBoundaries={occupiedBoundaries}
              showLocate={false}
              zoom={16}
            />
          </div>
          <button
            type="submit"
            disabled={editSaving}
            className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {editSaving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </FormDialog>
      <ErrorModal
        open={editError.open}
        title="Unable to update"
        message={editError.message}
        onClose={() =>
          setEditError((prev) => ({ ...prev, open: false }))
        }
      />
      <Toast
        open={editToast.open}
        message={editToast.message}
        onClose={() =>
          setEditToast((prev) => ({ ...prev, open: false }))
        }
      />
      <ConfirmModal
        open={deleteConfirmOpen}
        title="Delete this zone?"
        message="This will permanently delete the zone and cannot be undone."
        confirmLabel={deleteLoading ? "Deleting..." : "Delete"}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
      <ErrorModal
        open={deleteError.open}
        title="Unable to delete"
        message={deleteError.message}
        onClose={() =>
          setDeleteError((prev) => ({ ...prev, open: false }))
        }
      />
      <Toast
        open={deleteToast.open}
        message={deleteToast.message}
        onClose={() =>
          setDeleteToast((prev) => ({ ...prev, open: false }))
        }
      />
    </div>
  );
}
