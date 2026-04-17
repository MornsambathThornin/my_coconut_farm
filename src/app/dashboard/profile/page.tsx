"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useAuthUser } from "@/lib/useAuthUser";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ErrorModal from "@/components/ui/ErrorModal";
import Toast from "@/components/ui/Toast";
import FarmCreateForm from "@/components/FarmCreateForm";
import { useFarmContext } from "@/context/FarmContext";

type Profile = {
  id: string;
  full_name: string | null;
};

type AccountInfo = {
  createdAt: string | null;
  lastSignInAt: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    createdAt: null,
    lastSignInAt: null,
  });
  const [zonesCount, setZonesCount] = useState(0);
  const [totalTrees, setTotalTrees] = useState(0);
  const [harvestCount, setHarvestCount] = useState(0);
  const [lastHarvestDate, setLastHarvestDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "" });
  const [errorModal, setErrorModal] = useState({
    open: false,
    message: "",
  });
  const { user, loading: authLoading } = useAuthUser();
  const { activeFarm } = useFarmContext();

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      setEmail(user.email || "");
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setErrorModal({
          open: true,
          message: profileError.message,
        });
        setLoading(false);
        return;
      }

      if (profileData) {
        setProfile(profileData);
      } else {
        const newProfile = {
          id: user.id,
          full_name: user.email || "",
        };
        await supabase.from("profiles").insert(newProfile);
        setProfile(newProfile);
      }

      const { data: userData } = await supabase.auth.getUser();
      setAccountInfo({
        createdAt: userData.user?.created_at || null,
        lastSignInAt: userData.user?.last_sign_in_at || null,
      });

      setLoading(false);
    };

    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }

    if (!authLoading) {
      loadProfile();
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    const loadFarmMetrics = async () => {
      if (authLoading) return;
      if (!user || !activeFarm) {
        setZonesCount(0);
        setTotalTrees(0);
        setHarvestCount(0);
        setLastHarvestDate(null);
        return;
      }

      const { data: zonesData, error: zonesError } = await supabase
        .from("zones")
        .select("id, tree_count")
        .eq("user_id", user.id)
        .eq("farm_id", activeFarm.id);

      if (zonesError) {
        setErrorModal({
          open: true,
          message: zonesError.message,
        });
        return;
      }

      const zoneList = zonesData || [];
      const zoneIds = zoneList.map((z) => z.id);

      const harvestsData =
        zoneIds.length > 0
          ? await supabase
              .from("harvests")
              .select("harvest_date")
              .eq("user_id", user.id)
              .in("zone_id", zoneIds)
              .order("harvest_date", { ascending: false })
          : { data: [], error: null };

      if (harvestsData.error) {
        setErrorModal({
          open: true,
          message: harvestsData.error.message,
        });
        return;
      }

      const totalTrees = zoneList.reduce(
        (sum, z) => sum + Number(z.tree_count || 0),
        0
      );

      setZonesCount(zoneList.length);
      setTotalTrees(totalTrees);
      setHarvestCount(harvestsData.data?.length || 0);
      setLastHarvestDate(harvestsData.data?.[0]?.harvest_date || null);
    };

    loadFarmMetrics();
  }, [activeFarm, user, authLoading]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!profile?.full_name?.trim()) {
      setErrorModal({ open: true, message: "Full name is required." });
      return;
    }
    if (profile.full_name.trim().length > 100) {
      setErrorModal({ open: true, message: "Full name is too long." });
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!profile) return;

    setConfirmOpen(false);
    setSaving(true);

    const { error: saveError } = await supabase.from("profiles").upsert({
      id: profile.id,
      full_name: profile.full_name || "",
    });

    if (saveError) {
      setErrorModal({ open: true, message: saveError.message });
    } else {
      setToast({ open: true, message: "Profile updated." });
    }

    setSaving(false);
  };

  if (loading || authLoading) {
    return (
      <div className="p-10 text-center animate-pulse text-slate-500">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Profile Settings
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Keep your account details and farm overview up to date.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Account Details
            </h2>
            <p className="text-sm text-slate-500">
              Update your personal information.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <label className="block text-sm">
              <span className="text-slate-600">Email</span>
              <input
                type="email"
                value={email}
                disabled
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 bg-slate-100 text-slate-600"
              />
            </label>

            <label className="block text-sm">
              <span className="text-slate-600">Full name</span>
              <input
                type="text"
                value={profile?.full_name || ""}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev ? { ...prev, full_name: e.target.value } : prev,
                  )
                }
                placeholder="Enter your full name"
                className="mt-1 w-full rounded-xl border border-slate-200 p-3"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-green-600 px-5 py-2.5 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Farm Overview
          </h3>
          {activeFarm ? (
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div>
                <p className="text-xs font-semibold text-slate-400">
                  Farm Name
                </p>
                <p className="font-medium text-slate-900">{activeFarm.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400">Location</p>
                <p className="font-medium text-slate-900">
                  {activeFarm.location || "Not set"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400">
                  Total Area
                </p>
                <p className="font-medium text-slate-900">
                  {activeFarm.total_area_ha ?? "-"} ha
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400">Notes</p>
                <p className="font-medium text-slate-900">
                  {activeFarm.notes || "No notes"}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href={`/dashboard/farm/${activeFarm.id}/edit`}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800"
                >
                  Edit Farm
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-6">
              <p className="text-sm text-slate-500">
                No farm linked yet. Draw your farm boundary below to get started.
              </p>
              <FarmCreateForm
                onSuccess={() => {
                  setToast({ open: true, message: "Farm profile saved." })
                  router.refresh()
                }}
              />
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Account Summary
          </h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div>
              <p className="text-xs font-semibold text-slate-400">
                Member Since
              </p>
              <p className="font-medium text-slate-900">
                {formatDate(accountInfo.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">
                Last Sign In
              </p>
              <p className="font-medium text-slate-900">
                {formatDate(accountInfo.lastSignInAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Activity Snapshot
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
            <div>
              <p className="text-xs font-semibold text-slate-400">Zones</p>
              <p className="text-lg font-bold text-slate-900">{zonesCount}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Trees</p>
              <p className="text-lg font-bold text-slate-900">{totalTrees}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Harvests</p>
              <p className="text-lg font-bold text-slate-900">{harvestCount}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">
                Last Harvest
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {formatDate(lastHarvestDate)}
              </p>
            </div>
          </div>
        </div>
      </div>
      <ConfirmModal
        open={confirmOpen}
        title="Save profile changes?"
        message="This will update your account details."
        confirmLabel="Save"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSave}
      />
      <ErrorModal
        open={errorModal.open}
        title="Unable to save"
        message={errorModal.message}
        onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
      />
      <Toast
        open={toast.open}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}
