 "use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { useAuthUser } from "@/lib/useAuthUser";
import { calculateYieldPerHectare, sumHarvestQuantity } from "@/lib/helpers";
import ZoneMap from "@/components/maps/ZoneMap";
import ErrorModal from "@/components/ui/ErrorModal";
import Toast from "@/components/ui/Toast";
import FarmCreateForm from "@/components/FarmCreateForm";
import type { Harvest } from "@/lib/helpers";
import { useFarmContext } from "@/context/FarmContext";

type Profile = {
  id: string;
  full_name: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();
  const { farms, activeFarm, setActiveFarmId } = useFarmContext();
  const [profile, setProfile] = useState<Profile | null>(null);
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
  const [totalArea, setTotalArea] = useState(0);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, message: "" });
  const [errorModal, setErrorModal] = useState({
    open: false,
    message: "",
  });

  const handleFarmCreated = useCallback(() => {
    setToast({ open: true, message: "Farm profile created." });
  }, []);
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  const loadProfileAndFarms = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setErrorModal({ open: true, message: profileError.message });
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
          return;
        }

        resolvedProfile = newProfile;
      }

      setProfile(resolvedProfile);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadProfileAndFarms();
    }
  }, [authLoading, loadProfileAndFarms]);

  useEffect(() => {
    const loadFarmMetrics = async () => {
      if (!user || !activeFarm?.id) {
        setZonesCount(0);
        setTotalTrees(0);
        setTotalArea(0);
        setHarvests([]);
        setZoneBoundaries([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data: zoneRows, error: zonesError } = await supabase
        .from("zones")
        .select("id, name, area_ha, tree_count, boundary")
        .eq("user_id", user.id)
        .eq("farm_id", activeFarm.id);

      if (zonesError) {
        setErrorModal({ open: true, message: zonesError.message });
        setLoading(false);
        return;
      }

      const zoneIds = (zoneRows || []).map((z) => z.id);
      let harvestsData: { quantity: number; harvest_date: string }[] = [];
      if (zoneIds.length > 0) {
        const { data: harvested, error: harvestError } = await supabase
          .from("harvests")
          .select("quantity, harvest_date")
          .eq("user_id", user.id)
          .in("zone_id", zoneIds);

        if (harvestError) {
          setErrorModal({ open: true, message: harvestError.message });
          setLoading(false);
          return;
        }

        harvestsData = harvested || [];
      }

      const boundaries =
        zoneRows
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
      setZonesCount(zoneRows?.length ?? 0);
      setTotalTrees(
        (zoneRows || []).reduce(
          (sum, zone) => sum + Number(zone.tree_count || 0),
          0,
        ),
      );
      setTotalArea(
        (zoneRows || []).reduce(
          (sum, zone) => sum + Number(zone.area_ha || 0),
          0,
        ),
      );
      setHarvests(harvestsData || []);
      setLoading(false);
    };

    if (!authLoading) {
      loadFarmMetrics();
    }
  }, [authLoading, user, activeFarm]);

  const totalHarvest = useMemo(() => sumHarvestQuantity(harvests), [harvests]);
  const yieldPerHectare = useMemo(() => {
    if (!activeFarm) return 0;
    return calculateYieldPerHectare(totalHarvest, totalArea);
  }, [activeFarm, totalHarvest, totalArea]);

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
        {activeFarm && (
          <div className="flex items-center gap-3 bg-green-50 px-4 py-2 rounded-full border border-green-100">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-800">
              {activeFarm.name}
            </span>
          </div>
        )}
      </header>

      {(farms?.length ?? 0) > 1 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="farm-select" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            View farm
          </label>
          <select
            id="farm-select"
            value={activeFarm?.id ?? ""}
            onChange={(e) => setActiveFarmId(e.target.value || null)}
            className="w-full max-w-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
          >
            {farms?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!activeFarm ? (
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
              Define your farm details and draw the boundary to unlock tracking.
            </p>
          </div>

          <div className="p-6">
            <FarmCreateForm onSuccess={handleFarmCreated} />
          </div>
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
            {
                label: "Total Area",
                value: `${activeFarm?.total_area_ha ?? "-"} ha`,
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
                    {yieldPerHectare ? yieldPerHectare.toFixed(2) : "0.00"}
                  </span>
                  <span className="text-xl opacity-80">kg / ha</span>
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
                    {activeFarm?.location || "Not specified"}
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
              {Array.isArray(activeFarm?.boundary) &&
              activeFarm?.boundary.length ? (
                <ZoneMap
                  boundary={activeFarm.boundary}
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
