"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useAuthUser } from "@/lib/useAuthUser";

import HarvestForm from "@/components/forms/HarvestForm";
import IrrigationForm from "@/components/forms/IrrigationForm";
import ProductionChart from "@/components/charts/ProductionChart";
import {
  calculateYieldPerTree,
  groupHarvestByMonth,
  sumHarvestQuantity,
} from "@/lib/helpers";

type Zone = {
  id: string;
  name: string;
  area_ha: number | null;
  tree_count: number | null;
  avg_tree_age_years: number | null;
  variety: string | null;
};

type Harvest = {
  id: string;
  harvest_date: string;
  quantity: number;
  unit: string;
  quality_grade: string | null;
  notes: string | null;
};

type Irrigation = {
  id: string;
  // zone_id: string;
  irrigation_date: string;
  method: string | null;
  duration_minutes: number | null;
  water_source: string | null;
  notes: string | null;
  // created_at: string;
};

type PlantationBatch = {
  id: string;
  planting_year: number | null;
  variety: string | null;
  tree_count: number | null;
  notes: string | null;
};

export default function ZoneDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [zone, setZone] = useState<Zone | null>(null);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [irrigations, setIrrigations] = useState<Irrigation[]>([]);
  const [batches, setBatches] = useState<PlantationBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuthUser();
  const [batchForm, setBatchForm] = useState({
    planting_year: "",
    variety: "",
    tree_count: "",
    notes: "",
  });
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState("");
  const lastBatchSync = useRef<string | null>(null);

  async function fetchZone(zoneId: string, userId: string) {
    const { data: zoneData, error: zoneError } = await supabase
      .from("zones")
      .select("*")
      .eq("id", zoneId)
      .eq("user_id", userId)
      .single();

    if (zoneError) {
      setError(zoneError.message);
      return;
    }

    setZone(zoneData);
  }

  async function fetchHarvests(zoneId: string, userId: string) {
    const { data: harvestData, error: harvestError } = await supabase
      .from("harvests")
      .select("*")
      .eq("zone_id", zoneId)
      .eq("user_id", userId)
      .order("harvest_date", { ascending: false });

    if (harvestError) {
      setError(harvestError.message);
      return;
    }

    setHarvests(harvestData || []);
  }

  async function fetchIrrigations(zoneId: string, userId: string) {
    const { data: irrigationData, error: irrigationError } = await supabase
      .from("irrigation_logs")
      .select("*")
      .eq("zone_id", zoneId)
      .eq("user_id", userId)
      .order("irrigation_date", { ascending: false });

    if (irrigationError) {
      setError(irrigationError.message);
      return;
    }

    setIrrigations(irrigationData || []);
  }

  async function fetchPlantationBatches(zoneId: string, userId: string) {
    const { data: batchData, error: batchError } = await supabase
      .from("plantation_batches")
      .select("*")
      .eq("zone_id", zoneId)
      .eq("user_id", userId)
      .order("planting_year", { ascending: false });

    if (batchError) {
      setError(batchError.message);
      return;
    }

    const safeBatches = batchData || [];
    setBatches(safeBatches);
  }

  useEffect(() => {
    if (!id || !user) return;

    const fetchData = async () => {
      await Promise.all([
        fetchZone(id, user.id),
        fetchHarvests(id, user.id),
        fetchIrrigations(id, user.id),
        fetchPlantationBatches(id, user.id),
      ]);
      setLoading(false);
    };

    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, id, user]);

  const chartData = useMemo(
    () => groupHarvestByMonth(harvests),
    [harvests]
  );
  const totalHarvestQuantity = useMemo(
    () => sumHarvestQuantity(harvests),
    [harvests]
  );
  const updateZoneFromBatches = (
    batchList: PlantationBatch[],
    currentZone: Zone | null
  ) => {
    if (!currentZone) return null;
    if (batchList.length === 0) return null;

    const totalTrees = batchList.reduce(
      (sum, batch) => sum + Number(batch.tree_count || 0),
      0
    );
    const latestVariety = batchList.find(
      (batch) => batch.variety
    )?.variety;

    return {
      treeCount: totalTrees || null,
      variety: latestVariety || null,
    };
  };

  const derivedZone = (() => {
    if (!zone) return null;
    if (batches.length === 0) return zone;
    const derived = updateZoneFromBatches(batches, zone);
    if (!derived) return zone;
    return {
      ...zone,
      tree_count: derived.treeCount ?? zone.tree_count,
      variety: derived.variety ?? zone.variety,
    };
  })();

  const yieldPerTree = calculateYieldPerTree(
    totalHarvestQuantity,
    derivedZone?.tree_count ?? null
  );

  const syncZoneFields = async (
    zoneId: string,
    userId: string,
    treeCount: number | null,
    variety: string | null
  ) => {
    const { error: zoneUpdateError } = await supabase
      .from("zones")
      .update({
        tree_count: treeCount,
        variety,
      })
      .eq("id", zoneId)
      .eq("user_id", userId);

    return zoneUpdateError;
  };

  useEffect(() => {
    if (!zone || batches.length === 0) return;

    const derived = updateZoneFromBatches(batches, zone);
    if (!derived) return;

    const { treeCount, variety } = derived;
    const nextKey = `${zone.id}:${treeCount ?? "null"}:${variety ?? "null"}`;

    if (!user) return;
    if (lastBatchSync.current === nextKey) return;
    lastBatchSync.current = nextKey;
    void syncZoneFields(zone.id, user.id, treeCount, variety);
  }, [batches, user, zone]);

  const handleBatchChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setBatchForm({ ...batchForm, [e.target.name]: e.target.value });
    if (batchSuccess) {
      setBatchSuccess("");
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !zone) return;

    setBatchSaving(true);
    setBatchSuccess("");

    const { error: batchError } = await supabase
      .from("plantation_batches")
      .insert({
        user_id: user.id,
        zone_id: zone.id,
        planting_year: batchForm.planting_year
          ? Number(batchForm.planting_year)
          : null,
        variety: batchForm.variety || null,
        tree_count: batchForm.tree_count
          ? Number(batchForm.tree_count)
          : null,
        notes: batchForm.notes || null,
      });

    if (batchError) {
      setError(batchError.message);
    } else {
      setBatchForm({
        planting_year: "",
        variety: "",
        tree_count: "",
        notes: "",
      });
      setBatchSuccess("Planting batch saved.");
      const { data: refreshedBatches } = await supabase
        .from("plantation_batches")
        .select("*")
        .eq("zone_id", zone.id)
        .eq("user_id", user.id)
        .order("planting_year", { ascending: false });

      const safeBatches = refreshedBatches || [];
      setBatches(safeBatches);
    }

    setBatchSaving(false);
  };

  if (loading || authLoading) return <p>Loading zone...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!zone) return <p>Zone not found</p>;

  const displayZone = derivedZone ?? zone;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/zones"
        className="inline-flex items-center text-sm text-green-700 hover:text-green-800"
      >
        ← Back to Zones
      </Link>

      {/* Zone Info */}
      <div className="bg-white p-4 rounded shadow">
        <h1 className="text-2xl font-bold mb-2">Zone {displayZone.name}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <p>🌍 Area: {displayZone.area_ha ?? "-"} ha</p>
          <p>🌴 Trees: {displayZone.tree_count ?? "-"}</p>
          <p>🧓 Avg age: {displayZone.avg_tree_age_years ?? "-"} yrs</p>
          <p>🌱 Variety: {displayZone.variety ?? "-"}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">
          Yield per Tree
        </h2>
        <p className="text-2xl font-bold text-green-700">
          {displayZone.tree_count
            ? `${yieldPerTree.toFixed(2)}`
            : "-"}
        </p>
        <p className="text-sm text-gray-500">
          Total harvest: {totalHarvestQuantity} {harvests[0]?.unit || "units"}
        </p>
      </div>

      {/* Harvest Form */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-3">Add Harvest</h2>
        <HarvestForm
          zoneId={zone.id}
          onSuccess={() =>
            user ? fetchHarvests(zone.id, user.id) : null
          }
        />
      </div>

      {/* Production Chart */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-3">Production Trend</h2>

        {chartData.length === 0 ? (
          <p className="text-sm text-gray-500">No harvest data to display</p>
        ) : (
          <ProductionChart data={chartData} />
        )}
      </div>

      {/* Harvest History */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-3">Harvest History</h2>
        {harvests.length === 0 ? (
          <p className="text-sm text-gray-500">No harvest records</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Date</th>
                <th className="text-left py-1">Quantity</th>
                <th className="text-left py-1">Grade</th>
                <th className="text-left py-1">Notes</th>
              </tr>
            </thead>
            <tbody>
              {harvests.map((h) => (
                <tr key={h.id} className="border-b">
                  <td className="py-1">{h.harvest_date}</td>
                  <td className="py-1">
                    {h.quantity} {h.unit}
                  </td>
                  <td>{h.quality_grade ?? "-"}</td>
                  <td className="text-gray-600">{h.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-3">Add Irrigation</h2>
        <IrrigationForm
          zoneId={zone.id}
          onSuccess={() =>
            user ? fetchIrrigations(zone.id, user.id) : null
          }
        />
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-3">
          Add Planting Batch
        </h2>
        <form onSubmit={handleBatchSubmit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              name="planting_year"
              value={batchForm.planting_year}
              onChange={handleBatchChange}
              placeholder="Planting year"
              type="number"
              className="w-full border p-2 rounded"
            />
            <input
              name="tree_count"
              value={batchForm.tree_count}
              onChange={handleBatchChange}
              placeholder="Tree count"
              type="number"
              className="w-full border p-2 rounded"
            />
            <input
              name="variety"
              value={batchForm.variety}
              onChange={handleBatchChange}
              placeholder="Variety"
              className="w-full border p-2 rounded"
            />
          </div>
          <textarea
            name="notes"
            value={batchForm.notes}
            onChange={handleBatchChange}
            placeholder="Notes"
            className="w-full border p-2 rounded"
          />
          {batchSuccess ? (
            <p className="text-sm text-green-700">{batchSuccess}</p>
          ) : null}
          <button
            type="submit"
            disabled={batchSaving}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            {batchSaving ? "Saving..." : "Add Batch"}
          </button>
        </form>
      </div>

      {/* Irrigation History */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-3">Irrigation Logs</h2>
        {irrigations.length === 0 ? (
          <p className="text-sm text-gray-500">No irrigation records</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Date</th>
                <th className="text-left py-1">Method</th>
              </tr>
            </thead>
            <tbody>
              {irrigations.map((i) => (
                <tr key={i.id} className="border-b">
                  <td className="py-1">{i.irrigation_date}</td>
                  <td className="py-1">{i.method ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-3">
          Planting Batches
        </h2>
        {batches.length === 0 ? (
          <p className="text-sm text-gray-500">
            No planting batches yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Year</th>
                <th className="text-left py-1">Variety</th>
                <th className="text-left py-1">Trees</th>
                <th className="text-left py-1">Notes</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-b">
                  <td className="py-1">
                    {b.planting_year ?? "-"}
                  </td>
                  <td className="py-1">{b.variety ?? "-"}</td>
                  <td className="py-1">{b.tree_count ?? "-"}</td>
                  <td className="text-gray-600">
                    {b.notes ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
