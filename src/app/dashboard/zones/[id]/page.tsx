"use client";

import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useAuthUser } from "@/lib/useAuthUser";

import HarvestForm from "@/components/forms/HarvestForm";
import IrrigationForm from "@/components/forms/IrrigationForm";
import ProductionChart from "@/components/charts/ProductionChart";
import ForecastChart from "@/components/charts/ForecastChart";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ErrorModal from "@/components/ui/ErrorModal";
import Toast from "@/components/ui/Toast";
import FormDialog from "@/components/ui/FormDialog";
import ZoneMap from "@/components/maps/ZoneMap";
import ZoneDrawMap from "@/components/maps/ZoneDrawMap";
import {
  calculateYieldPerHectare,
  groupHarvestByMonth,
  sumHarvestQuantity,
  type Harvest,
} from "@/lib/helpers";
import { useTranslations } from "@/lib/useTranslations";
import { getCropIcon, type CropCategory } from "@/lib/cropIcon";
import type { CropType, Zone } from "@/types/db";

type ForecastRow = {
  forecast_month: string | null;
  expected_yield_kg_per_ha: number | null;
  confidence_score: number | null;
};

type ZoneHarvest = Harvest & { id: string };

type FarmBoundary = {
  id: string;
  name: string;
  boundary?: [number, number][] | null;
};

type IrrigationLog = {
  id: string;
  irrigation_date: string;
  method: string | null;
  notes: string | null;
};

type PlantationBatch = {
  id: string;
  planting_year: number | null;
  variety: string | null;
  tree_count: number | null;
  notes: string | null;
};

import {
  ChevronLeft,
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
  const [zone, setZone] = useState<Zone | null>(null);
  const [farm, setFarm] = useState<FarmBoundary | null>(null);
  const [harvests, setHarvests] = useState<ZoneHarvest[]>([]);
  const [irrigations, setIrrigations] = useState<IrrigationLog[]>([]);
  const [batches, setBatches] = useState<PlantationBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuthUser();
  const { t } = useTranslations();
  const [batchForm, setBatchForm] = useState({ planting_year: "", variety: "", tree_count: "", notes: "" });
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);
  const [batchToast, setBatchToast] = useState({ open: false, message: "" });
  const [batchError, setBatchError] = useState({
    open: false,
    message: "",
  });
  const [batchFormOpen, setBatchFormOpen] = useState(false);
  const [batchEditingId, setBatchEditingId] = useState<string | null>(null);
  const [batchDeleteId, setBatchDeleteId] = useState<string | null>(null);
  const [harvestFormOpen, setHarvestFormOpen] = useState(false);
  const [irrigationFormOpen, setIrrigationFormOpen] = useState(false);
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
  const [cropTypes, setCropTypes] = useState<CropType[]>([]);
  const [forecasts, setForecasts] = useState<ForecastRow[]>([]);
  const [editForm, setEditForm] = useState({
    name: "",
    area_ha: "",
    tree_count: "",
    avg_tree_age_years: "",
    variety: "",
    crop_type_id: "",
  });

  // --- DATA FETCHING ---
  const fetchData = useCallback(async () => {
    if (!id || !user) return;
    try {
      const { data: zoneData, error: zoneError } = await supabase
        .from("zones")
        .select("*, crop_type:crop_types(id, name_en, default_unit)")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (zoneError) throw zoneError;

      const [h, i, b, f, z, c, fc] = await Promise.all([
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
        fetch("/api/crop-types").then(async (res) => {
          if (!res.ok) return { data: [] as CropType[] }
          const payload = await res.json()
          return { data: (payload || []) as CropType[] }
        }),
        fetch(`/api/yield-forecasts?zone_id=${encodeURIComponent(id)}`).then(
          async (res) => {
            if (!res.ok) return { data: [] as ForecastRow[] }
            const payload = await res.json()
            return { data: (payload || []) as ForecastRow[] }
          }
        ),
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
      setCropTypes((c as { data?: CropType[] }).data || []);
      setForecasts((fc as { data?: ForecastRow[] }).data || []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load zone data."
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, fetchData]);

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
  const zoneArea = displayZone?.area_ha ?? null;
  const yieldPerHa = useMemo(
    () => calculateYieldPerHectare(totalHarvestQuantity, zoneArea),
    [totalHarvestQuantity, zoneArea],
  );
  const harvestUnit = harvests[0]?.unit || "kg";
  const forecastChartData = useMemo(
    () =>
      forecasts
        .filter((row) => row.forecast_month)
        .map((row) => ({
          month: format(new Date(row.forecast_month!), "MMM yyyy"),
          expectedYield: Number(row.expected_yield_kg_per_ha ?? 0),
          confidence: Number(row.confidence_score ?? 0),
        })),
    [forecasts],
  );
  const latestForecast = forecastChartData.at(-1);

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

    const body = {
      zone_id: id,
      planting_year: batchForm.planting_year ? Number(batchForm.planting_year) : null,
      variety: batchForm.variety || null,
      tree_count: batchForm.tree_count ? Number(batchForm.tree_count) : null,
      notes: batchForm.notes || null,
    };

    const res = batchEditingId
      ? await fetch(`/api/plantation-batches/${batchEditingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      : await fetch('/api/plantation-batches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

    const payload = await res.json()
    if (res.ok) {
      setBatchToast({
        open: true,
        message: batchEditingId
          ? t('zoneDetail.batchUpdatedToast')
          : 'Planting batch saved.',
      });
      setBatchForm({ planting_year: "", variety: "", tree_count: "", notes: "" });
      setBatchEditingId(null);
      fetchData();
      setBatchFormOpen(false);
    } else {
      setBatchError({
        open: true,
        message: payload?.error || 'Unable to save planting batch'
      });
    }
    setBatchSaving(false);
  };

  const openBatchEdit = (batch: PlantationBatch) => {
    setBatchForm({
      planting_year: batch.planting_year != null ? String(batch.planting_year) : '',
      variety: batch.variety ?? '',
      tree_count: batch.tree_count != null ? String(batch.tree_count) : '',
      notes: batch.notes ?? '',
    });
    setBatchEditingId(batch.id);
    setBatchFormOpen(true);
  };

  const handleBatchDeleteConfirm = async () => {
    if (!batchDeleteId) return;
    const deleteId = batchDeleteId;
    setBatchDeleteId(null);
    const res = await fetch(`/api/plantation-batches/${deleteId}`, { method: 'DELETE' });
    const payload = await res.json().catch(() => ({}));
    if (res.ok) {
      setBatchToast({ open: true, message: t('zoneDetail.batchDeletedToast') });
      fetchData();
    } else {
      setBatchError({
        open: true,
        message: payload?.error || 'Unable to delete planting batch',
      });
    }
  };

  const handleEditChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const selectedEditCropType = useMemo(
    () => cropTypes.find((crop) => crop.id === editForm.crop_type_id),
    [cropTypes, editForm.crop_type_id],
  );

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
    const res = await fetch(`/api/zones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name,
        area_ha: editForm.area_ha ? Number(editForm.area_ha) : null,
        tree_count: editForm.tree_count ? Number(editForm.tree_count) : null,
        avg_tree_age_years: editForm.avg_tree_age_years
          ? Number(editForm.avg_tree_age_years)
          : null,
        variety: editForm.variety || null,
        crop_type_id: editForm.crop_type_id || null,
        boundary: editBoundary,
      }),
    })

    const payload = await res.json()
    if (!res.ok) {
      setEditError({
        open: true,
        message: payload?.error || 'Unable to update zone',
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
      crop_type_id: displayZone.crop_type_id ?? "",
    });
    setEditBoundary(
      Array.isArray(displayZone.boundary) ? displayZone.boundary : []
    );
  }, [displayZone, editFormOpen]);

  const handleConfirmDelete = async () => {
    if (!user || !id || deleteLoading) return;
    setDeleteConfirmOpen(false);
    setDeleteLoading(true);
    const res = await fetch(`/api/zones/${id}`, { method: 'DELETE' })
    const payload = await res.json()
    if (!res.ok) {
      setDeleteError({
        open: true,
        message: payload?.error || 'Unable to delete zone',
      });
      setDeleteLoading(false);
      return;
    }
    setDeleteToast({ open: true, message: t("zoneDetail.deletedToast") });
    router.push("/dashboard/zones");
  };

  if (loading || authLoading) return <div className="p-10 text-center animate-pulse text-slate-500">{t("zoneDetail.loading")}</div>;
  if (error) return <div className="p-10 text-red-500 text-center bg-red-50 rounded-xl m-4">{t("common.error")}: {error}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header & Breadcrumb */}
      <nav className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <Link href="/dashboard/zones" className="group flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-green-600 transition-colors">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 group-hover:border-green-200 group-hover:bg-green-50">
            <ChevronLeft className="w-4 h-4" />
          </div>
          {t("zoneDetail.backAll")}
        </Link>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-tighter">{t("zoneDetail.active")}</span>
          <button
            type="button"
            onClick={() => setEditFormOpen(true)}
            className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold uppercase tracking-tighter hover:bg-slate-200"
          >
            {t("zoneDetail.edit")}
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold uppercase tracking-tighter hover:bg-red-100"
          >
            {t("zoneDetail.delete")}
          </button>
        </div>
      </nav>

      {/* Main Stats Hero */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-4">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                {t("zone.title")} {displayZone?.name}
              </h1>
              <p className="text-slate-500 mt-1 flex flex-col gap-2">
                <span className="flex items-center gap-2">
                  {(() => {
                    const cropIcon = getCropIcon(
                      displayZone?.crop_type?.category as CropCategory,
                    );
                    const CropIconComp = cropIcon.Icon;
                    return (
                      <CropIconComp className={`w-4 h-4 ${cropIcon.accentClass}`} />
                    );
                  })()}
                  {t("zone.variety")}:{" "}
                  <span className="font-semibold text-slate-700">
                    {displayZone?.variety ||
                      displayZone?.crop_type?.name_en ||
                      t("zoneDetail.mixedVariety")}
                  </span>
                </span>
                {displayZone?.crop_type?.name_en ? (
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {t("zone.cropType")}: {displayZone.crop_type.name_en}
                  </span>
                ) : null}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {t("zone.totalArea")}
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {displayZone?.area_ha ?? "-"} ha
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {t("zone.avgTreeAge")}
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {displayZone?.avg_tree_age_years ?? "-"} yrs
                </p>
              </div>
            </div>
          </div>

          {/* Efficiency Card */}
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-3xl p-6 text-white shadow-lg shadow-green-200 flex flex-col justify-between min-w-[280px]">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-white/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                {t("zone.efficiency")}
              </p>
            </div>
            <div className="my-4">
              <h2 className="text-5xl font-black tracking-tighter">
                {yieldPerHa ? yieldPerHa.toFixed(1) : "0.0"}
              </h2>
              <p className="text-sm font-medium opacity-90">
                {harvestUnit}/ha
              </p>
            </div>
            <div className="pt-4 border-t border-white/10 text-xs">
              {t("zoneDetail.totalProduction")}:{" "}
              <span className="font-bold">
                {totalHarvestQuantity.toLocaleString()} {harvestUnit}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex gap-1 bg-slate-200/50 p-1 rounded-xl w-full md:w-fit mx-2">
        {[
          { id: "overview", label: t("zone.tabs.analysis"), icon: Activity },
          { id: "harvest", label: t("zone.tabs.harvest"), icon: Grape },
          { id: "irrigation", label: t("zone.tabs.irrigation"), icon: Droplets },
          { id: "batches", label: t("zone.tabs.batches"), icon: Calendar },
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
                <Activity className="w-5 h-5 text-green-500" /> {t("zoneDetail.productionTrend")}
              </h3>
              <div className="h-[300px] w-full">
                {chartData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                    <Info className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm">{t("zoneDetail.noHarvestData")}</p>
                  </div>
                ) : (
                  <ProductionChart data={chartData} />
                )}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-fuchsia-500" />
                  {t("zoneDetail.forecast.title")}
                </h3>
                <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  SMA v1
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {t("zoneDetail.forecast.desc")}
              </p>
              <div className="h-[260px] w-full">
                {forecastChartData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                    <Info className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm">{t("zoneDetail.forecast.empty")}</p>
                  </div>
                ) : (
                  <ForecastChart data={forecastChartData} />
                )}
              </div>
              {latestForecast && (
                <p className="text-xs text-slate-500">
                  {t("zoneDetail.forecast.latest")
                    .replace("{month}", latestForecast.month)
                    .replace("{yield}", latestForecast.expectedYield.toFixed(1))
                    .replace(
                      "{confidence}",
                      (latestForecast.confidence * 100).toFixed(0),
                    )}
                </p>
              )}
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-500" /> {t("zoneDetail.mapTitle")}
              </h3>
              <div className="h-[360px] w-full">
                {Array.isArray(displayZone?.boundary) &&
                displayZone.boundary.length ? (
                  <ZoneMap boundary={displayZone.boundary} />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    {t("zoneDetail.noBoundary")}
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
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><PlusCircle className="w-5 h-5 text-green-600" /> {t("zoneDetail.newHarvest")}</h3>
                <button
                  type="button"
                  onClick={() => setHarvestFormOpen(true)}
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg"
                >
                  {t("zoneDetail.addHarvest")}
                </button>
              </div>
            </div>
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest">{t("zoneDetail.harvestHistory")}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="p-4 font-bold text-slate-500">{t("zoneDetail.col.date")}</th>
                      <th className="p-4 font-bold text-slate-500">{t("zoneDetail.col.yield")}</th>
                      <th className="p-4 font-bold text-slate-500">{t("zoneDetail.col.grade")}</th>
                      <th className="p-4 font-bold text-slate-500">{t("zoneDetail.col.notes")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {harvests.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-semibold text-slate-700">
                          {format(new Date(h.harvest_date), "PP")}
                        </td>
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
              title={t("zoneDetail.newHarvest")}
              onClose={() => setHarvestFormOpen(false)}
            >
              <HarvestForm
                zoneId={id!}
                farmId={farm?.id ?? undefined}
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
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Droplets className="w-5 h-5 text-blue-500" /> {t("zoneDetail.logIrrigation")}</h3>
                  <button
                    type="button"
                    onClick={() => setIrrigationFormOpen(true)}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg"
                  >
                    {t("zoneDetail.addIrrigation")}
                  </button>
                </div>
              </div>
              <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-bold text-xs uppercase tracking-widest text-slate-500">{t("zoneDetail.irrigationLogs")}</div>
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/50">
                    <tr><th className="p-4 font-bold">{t("zoneDetail.col.date")}</th><th className="p-4 font-bold">{t("zoneDetail.col.method")}</th><th className="p-4 font-bold">{t("zoneDetail.col.notes")}</th></tr>
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
              title={t("zoneDetail.logIrrigation")}
              onClose={() => setIrrigationFormOpen(false)}
            >
              <IrrigationForm
                zoneId={id!}
                farmId={farm?.id ?? undefined}
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
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-green-600" /> {t("zone.batch-action")}
                </h3>
                <button
                  type="button"
                  onClick={() => setBatchFormOpen(true)}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                >
                  {t("zone.batch-action")}
                </button>
              </div>
            </div>
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
               <div className="p-4 border-b border-slate-100 font-bold text-xs uppercase tracking-widest text-slate-500">
                 {t("zone.batch-title")}
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50/50">
                     <tr><th className="p-4 font-bold">{t("zoneDetail.col.year")}</th><th className="p-4 font-bold">{t("zoneDetail.col.variety")}</th><th className="p-4 font-bold">{t("zoneDetail.col.trees")}</th><th className="p-4 font-bold">{t("zoneDetail.col.notes")}</th><th className="p-4 font-bold text-right"></th></tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {batches.map(b => (
                       <tr key={b.id} className="hover:bg-slate-50/50">
                         <td className="p-4 font-black text-slate-700">{b.planting_year}</td>
                         <td className="p-4"><span className="font-semibold text-green-700">{b.variety || "-"}</span></td>
                         <td className="p-4 font-bold">{b.tree_count}</td>
                         <td className="p-4 text-xs text-slate-400 max-w-[120px] truncate">{b.notes || "-"}</td>
                         <td className="p-4 text-right whitespace-nowrap">
                           <button
                             type="button"
                             onClick={() => openBatchEdit(b)}
                             className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2"
                           >
                             {t('zoneDetail.batchEdit')}
                           </button>
                           <button
                             type="button"
                             onClick={() => setBatchDeleteId(b.id)}
                             className="text-xs font-semibold text-red-600 hover:text-red-800 px-2"
                           >
                             {t('zoneDetail.batchDelete')}
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
            <FormDialog
              open={batchFormOpen}
              title={batchEditingId ? t('zoneDetail.batchEditTitle') : t('zone.batch-action')}
              onClose={() => {
                setBatchFormOpen(false);
                setBatchEditingId(null);
                setBatchForm({ planting_year: "", variety: "", tree_count: "", notes: "" });
              }}
            >
              <form onSubmit={handleBatchSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input name="planting_year" value={batchForm.planting_year} onChange={handleBatchChange} placeholder={t("zoneDetail.batchPlaceholder.year")} type="number" className="w-full border-slate-200 p-3 rounded-xl focus:ring-green-500 focus:border-green-500 transition-all text-sm" required />
                  <input name="tree_count" value={batchForm.tree_count} onChange={handleBatchChange} placeholder={t("zoneDetail.batchPlaceholder.count")} type="number" className="w-full border-slate-200 p-3 rounded-xl focus:ring-green-500 focus:border-green-500 transition-all text-sm" required />
                </div>
                <input name="variety" value={batchForm.variety} onChange={handleBatchChange} placeholder={t("zoneDetail.batchPlaceholder.variety")} className="w-full border-slate-200 p-3 rounded-xl focus:ring-green-500 focus:border-green-500 transition-all text-sm" />
                <textarea name="notes" value={batchForm.notes} onChange={handleBatchChange} placeholder={t("zoneDetail.batchPlaceholder.observations")} rows={3} className="w-full border-slate-200 p-3 rounded-xl focus:ring-green-500 focus:border-green-500 transition-all text-sm" />
                <button type="submit" disabled={batchSaving} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50">
                  {batchSaving
                    ? t("zoneDetail.batchSubmitting")
                    : batchEditingId
                    ? t('zoneDetail.batchEditSubmit')
                    : t("zoneDetail.batchSubmit")}
                </button>
              </form>
            </FormDialog>
            <ConfirmModal
              open={batchConfirmOpen}
              title={t("zoneDetail.batchConfirmTitle")}
              message={t("zoneDetail.batchConfirmMsg")}
              confirmLabel={t("common.save")}
              onCancel={() => setBatchConfirmOpen(false)}
              onConfirm={handleBatchConfirm}
            />
            <ConfirmModal
              open={batchDeleteId !== null}
              title={t('zoneDetail.batchDeleteTitle')}
              message={t('zoneDetail.batchDeleteMsg')}
              confirmLabel={t('zoneDetail.batchDelete')}
              onCancel={() => setBatchDeleteId(null)}
              onConfirm={handleBatchDeleteConfirm}
            />
            <ErrorModal
              open={batchError.open}
              title={t("common.unableToSave")}
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
        title={t("zoneDetail.edit")}
        onClose={() => setEditFormOpen(false)}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              {t("zoneCreate.name")}
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
                {t("zoneCreate.area")}
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
                {t("zoneCreate.treeCount")}
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
                {t("zoneCreate.avgTreeAge")}
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
                {t("zoneCreate.variety")}
              </label>
              <input
                name="variety"
                value={editForm.variety}
                onChange={handleEditChange}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              {t("zoneCreate.cropType")}
            </label>
            <select
              name="crop_type_id"
              value={editForm.crop_type_id}
              onChange={handleEditChange}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
            >
              <option value="">{t("zoneCreate.cropTypeSelect")}</option>
              {cropTypes.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {crop.name_en ?? t("zoneCreate.cropTypeUnnamed")}
                </option>
              ))}
            </select>
            {selectedEditCropType?.default_unit ? (
              <p className="text-xs text-slate-400 mt-1">
                {t("zoneCreate.defaultUnit").replace("{unit}", selectedEditCropType.default_unit)}
              </p>
            ) : null}
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
            {editSaving ? t("zoneDetail.editSaving") : t("zoneDetail.editSave")}
          </button>
        </form>
      </FormDialog>
      <ErrorModal
        open={editError.open}
        title={t("zoneDetail.editErrorTitle")}
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
        title={t("zoneDetail.deleteTitle")}
        message={t("zoneDetail.deleteMsg")}
        confirmLabel={deleteLoading ? t("zoneDetail.deleting") : t("zoneDetail.deleteConfirm")}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
      <ErrorModal
        open={deleteError.open}
        title={t("zoneDetail.deleteErrorTitle")}
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
