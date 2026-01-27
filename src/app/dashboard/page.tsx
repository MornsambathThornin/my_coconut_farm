"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { useAuthUser } from "@/lib/useAuthUser";
import { calculateYieldPerTree, sumHarvestQuantity } from "@/lib/helpers";
import ZoneMap from "@/components/maps/ZoneMap";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ErrorModal from "@/components/ui/ErrorModal";
import Toast from "@/components/ui/Toast";
import type { Harvest } from "@/lib/helpers";

type Farm = {
  id: string;
  name: string;
  location: string | null;
  total_area_ha: number | null;
  notes: string | null;
  boundary?: [number, number][] | null;
};

type Profile = {
  id: string;
  full_name: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [zoneBoundaries, setZoneBoundaries] = useState<
    {
      id: string;
      name: string | null;
      area_ha: number | null;
      tree_count: number | null;
      boundary: [number, number][];
    }[]
  >([]);
  const [zonesCount, setZonesCount] = useState(0);
  const [totalTrees, setTotalTrees] = useState(0);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingFarm, setCreatingFarm] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "" });
  const [errorModal, setErrorModal] = useState({
    open: false,
    message: "",
  });
  const [farmForm, setFarmForm] = useState({
    name: "",
    location: "",
    total_area_ha: "",
    notes: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const loadOverview = async () => {
      if (!user) return;

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setErrorModal({ open: true, message: profileError.message });
        setLoading(false);
        return;
      }

      let resolvedProfile = profileData;
      if (!resolvedProfile) {
        const { data: newProfile, error: profileInsertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            full_name: user.email || "",
          })
          .select()
          .single();

        if (profileInsertError) {
          setErrorModal({
            open: true,
            message: profileInsertError.message,
          });
          setLoading(false);
          return;
        }

        resolvedProfile = newProfile;
      }

      const { data: farmData, error: farmError } = await supabase
        .from("farms")
        .select("id, name, location, total_area_ha, notes, boundary")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (farmError) {
        setErrorModal({ open: true, message: farmError.message });
        setLoading(false);
        return;
      }

      setProfile(resolvedProfile);
      setFarm(farmData || null);

      if (farmData) {
        const [
          { data: zonesData, error: zonesError },
          { data: harvestData, error: harvestError },
        ] = await Promise.all([
          supabase
            .from("zones")
            .select("id, name, area_ha, tree_count, boundary")
            .eq("user_id", user.id)
            .eq("farm_id", farmData.id),
          supabase
            .from("harvests")
            .select("quantity, harvest_date")
            .eq("user_id", user.id),
        ]);

        if (zonesError || harvestError) {
          setErrorModal({
            open: true,
            message: zonesError?.message || harvestError?.message || "",
          });
          setLoading(false);
          return;
        }

        type ZoneTreeCount = {
          tree_count: number | null;
        };
        const zoneList: ZoneTreeCount[] = zonesData || [];
        const treeTotal = zoneList.reduce(
          (sum: number, zone) => sum + Number(zone.tree_count || 0),
          0,
        );

        setZonesCount(zoneList.length);
        setTotalTrees(treeTotal);
        setHarvests(harvestData || []);
        const boundaries =
          zonesData
            ?.filter(
              (z) =>
                Array.isArray(z.boundary) &&
                z.boundary.length > 2,
            )
            .map((z) => ({
              id: z.id,
              name: z.name ?? null,
              area_ha: z.area_ha ?? null,
              tree_count: z.tree_count ?? null,
              boundary: z.boundary as [number, number][],
            })) || [];
        setZoneBoundaries(boundaries);
      } else {
        setZonesCount(0);
        setTotalTrees(0);
        setHarvests([]);
        setZoneBoundaries([]);
      }

      setLoading(false);
    };

    if (!authLoading) {
      loadOverview();
    }
  }, [authLoading, user]);

  const totalHarvest = useMemo(() => sumHarvestQuantity(harvests), [harvests]);
  const yieldPerTree = useMemo(() => {
    if (!farm) return 0;
    return calculateYieldPerTree(totalHarvest, totalTrees);
  }, [farm, totalHarvest, totalTrees]);

  const handleFarmChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFarmForm({ ...farmForm, [e.target.name]: e.target.value });
  };

  const handleCreateFarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingFarm) return;
    setConfirmOpen(true);
  };

  const handleConfirmCreateFarm = async () => {
    setConfirmOpen(false);
    if (!user) return;

    setCreatingFarm(true);

    const { data, error: farmError } = await supabase
      .from("farms")
      .insert({
        name: farmForm.name,
        location: farmForm.location || null,
        total_area_ha: farmForm.total_area_ha
          ? Number(farmForm.total_area_ha)
          : null,
        notes: farmForm.notes || null,
        user_id: user.id,
      })
      .select()
      .single();

    if (farmError) {
      setErrorModal({ open: true, message: farmError.message });
    } else {
      setFarm(data);
      setFarmForm({
        name: "",
        location: "",
        total_area_ha: "",
        notes: "",
      });
      setToast({ open: true, message: "Farm profile created." });
    }

    setCreatingFarm(false);
  };

  if (loading || authLoading) return <p>Loading...</p>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Farm Overview
          </h1>
          <p className="text-slate-500 mt-1">
            {profile?.full_name
              ? `Welcome back, ${profile.full_name}`
              : "Welcome back to your dashboard"}
          </p>
        </div>
        {farm && (
          <div className="flex items-center gap-3 bg-green-50 px-4 py-2 rounded-full border border-green-100">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-800">
              {farm.name}
            </span>
          </div>
        )}
      </header>

      {!farm ? (
        /* Empty State / Create Farm Form */
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Establish Your Farm
            </h2>
            <p className="text-slate-500 mt-2">
              Get started by defining your primary farm details to unlock
              tracking and analytics.
            </p>
          </div>

          <form
            onSubmit={handleCreateFarm}
            className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Farm Name *
              </label>
              <input
                name="name"
                value={farmForm.name}
                onChange={handleFarmChange}
                placeholder="e.g. Oak Ridge Orchards"
                className="w-full border-slate-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Location
              </label>
              <input
                name="location"
                value={farmForm.location}
                onChange={handleFarmChange}
                placeholder="City, Province"
                className="w-full border-slate-300 rounded-lg focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Total Area (ha)
              </label>
              <input
                name="total_area_ha"
                type="number"
                value={farmForm.total_area_ha}
                onChange={handleFarmChange}
                placeholder="0.00"
                className="w-full border-slate-300 rounded-lg focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Internal Notes
              </label>
              <textarea
                name="notes"
                rows={3}
                value={farmForm.notes}
                onChange={handleFarmChange}
                placeholder="Soil types, irrigation details..."
                className="w-full border-slate-300 rounded-lg focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <button
              type="submit"
              disabled={creatingFarm}
              className="md:col-span-2 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 shadow-md disabled:opacity-50"
            >
              {creatingFarm ? "Initializing..." : "Create Farm Profile"}
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total Area",
                value: `${farm.total_area_ha ?? "-"} ha`,
                color: "blue",
              },
              { label: "Active Zones", value: zonesCount, color: "emerald" },
              { label: "Total Harvest", value: totalHarvest, color: "amber" },
              { label: "Tree Count", value: totalTrees, color: "green" },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"
              >
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Productivity Card */}
            <div className="md:col-span-2 bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-lg font-medium opacity-90">
                  Average Productivity
                </h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold tracking-tight">
                    {yieldPerTree ? yieldPerTree.toFixed(2) : "0.00"}
                  </span>
                  <span className="text-xl opacity-80">kg / tree</span>
                </div>
                <p className="mt-4 text-green-100 text-sm max-w-xs">
                  This metric is calculated across all active zones and current
                  harvest cycles.
                </p>
              </div>
              {/* Decorative SVG Background */}
              <svg
                className="absolute right-0 bottom-0 opacity-10 w-48 h-48 translate-x-12 translate-y-12"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 004 9.236V15a1 1 0 00.553.894l4 2A1 1 0 0010 17V11.236a1 1 0 00-.553-.894l-4-2z" />
              </svg>
            </div>

            {/* Details Sidebar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
                Farm Details
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase">
                    Primary Owner
                  </p>
                  <p className="text-slate-700 font-semibold">
                    {profile?.full_name || user?.email}
                  </p>
                </div>
                <hr className="border-slate-100" />
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase">
                    Location
                  </p>
                  <p className="text-slate-700">
                    {farm.location || "Not specified"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
              Farm Map
            </h3>
            <div className="h-[360px] w-full">
              {Array.isArray(farm.boundary) && farm.boundary.length ? (
                <ZoneMap
                  boundary={farm.boundary}
                  overlays={zoneBoundaries}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No farm boundary saved yet.
                </div>
              )}
            </div>
          </div>
        </>
      )} 
      <ConfirmModal
        open={confirmOpen}
        title="Create farm profile?"
        message="This will save your farm details and enable dashboard tracking."
        confirmLabel="Create"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmCreateFarm}
      />
      <ErrorModal
        open={errorModal.open}
        title="Something went wrong"
        message={errorModal.message}
        onClose={() =>
          setErrorModal((prev) => ({ ...prev, open: false }))
        }
      />
      <Toast
        open={toast.open}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
