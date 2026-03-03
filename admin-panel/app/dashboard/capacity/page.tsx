'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

type Business = { id: string; name: string };
type CapacityRule = { day_of_week: number; capacity_tables: number | null; slot_duration_minutes: number | null; is_closed: boolean };

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export default function CapacityPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [capacityTables, setCapacityTables] = useState('');
  const [slotDuration, setSlotDuration] = useState('');
  const [rules, setRules] = useState<CapacityRule[]>(() =>
    DAY_NAMES.map((_, i) => ({ day_of_week: i, capacity_tables: null, slot_duration_minutes: null, is_closed: false }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredBusinesses = searchLower
    ? businesses.filter((b) => b.name.toLowerCase().includes(searchLower))
    : businesses;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', user.id)
        .order('name');
      const list = (data ?? []) as Business[];
      setBusinesses(list);
      if (list.length > 0 && !selectedBusinessId) setSelectedBusinessId(list[0].id);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedBusinessId) return;
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const [{ data: biz }, { data: ruleRows }] = await Promise.all([
        supabase
          .from('businesses')
          .select('capacity_tables, slot_duration_minutes')
          .eq('id', selectedBusinessId)
          .single(),
        supabase
          .from('business_capacity_rules')
          .select('day_of_week, capacity_tables, slot_duration_minutes, is_closed')
          .eq('business_id', selectedBusinessId)
          .order('day_of_week'),
      ]);
      if (!cancelled && biz) {
        const row = biz as { capacity_tables?: number; slot_duration_minutes?: number };
        setCapacityTables(String(row.capacity_tables ?? 0));
        setSlotDuration(String(row.slot_duration_minutes ?? 90));
      }
      if (!cancelled) {
        const map = new Map<number, CapacityRule>();
        (ruleRows ?? []).forEach((r: any) => {
          map.set(r.day_of_week, {
            day_of_week: r.day_of_week,
            capacity_tables: r.capacity_tables ?? null,
            slot_duration_minutes: r.slot_duration_minutes ?? null,
            is_closed: !!r.is_closed,
          });
        });
        setRules(
          DAY_NAMES.map((_, i) =>
            map.get(i) ?? { day_of_week: i, capacity_tables: null, slot_duration_minutes: null, is_closed: false }
          )
        );
      }
    })();
    return () => { cancelled = true; };
  }, [selectedBusinessId]);

  const handleSave = async () => {
    if (!selectedBusinessId) return;
    const cap = parseInt(capacityTables, 10);
    const slot = parseInt(slotDuration, 10);
    if (Number.isNaN(cap) || cap < 0) {
      setError('Toplam kapasite 0 veya pozitif bir sayı olmalı.');
      return;
    }
    if (Number.isNaN(slot) || slot < 15 || slot > 480) {
      setError('Slot süresi 15–480 dakika arası olmalı.');
      return;
    }
    setError(null);
    setSuccess(false);
    setSaving(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from('businesses')
      .update({
        capacity_tables: cap,
        slot_duration_minutes: slot,
        capacity_enabled: cap > 0,
      })
      .eq('id', selectedBusinessId);
    setSaving(false);
    if (err) setError(err.message);
    else setSuccess(true);
  };

  const handleRuleChange = (day: number, patch: Partial<CapacityRule>) => {
    setRules((prev) => prev.map((r) => (r.day_of_week === day ? { ...r, ...patch } : r)));
  };

  const handleSaveRules = async () => {
    if (!selectedBusinessId) return;
    setError(null);
    setSuccess(false);
    setSavingRules(true);
    const supabase = createClient();
    for (const r of rules) {
      const hasValues =
        r.capacity_tables !== null || r.slot_duration_minutes !== null || r.is_closed;
      if (!hasValues) {
        await supabase
          .from('business_capacity_rules')
          .delete()
          .eq('business_id', selectedBusinessId)
          .eq('day_of_week', r.day_of_week);
        continue;
      }
      const payload = {
        business_id: selectedBusinessId,
        day_of_week: r.day_of_week,
        capacity_tables: r.capacity_tables,
        slot_duration_minutes: r.slot_duration_minutes,
        is_closed: r.is_closed,
      };
      const { error: err } = await supabase
        .from('business_capacity_rules')
        .upsert(payload, { onConflict: 'business_id,day_of_week' });
      if (err) {
        setError(err.message);
        setSavingRules(false);
        return;
      }
    }
    setSavingRules(false);
    setSuccess(true);
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Kapasite Yönetimi</h1>
        <p className="text-zinc-500">Yükleniyor...</p>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Kapasite Yönetimi</h1>
        <p className="text-zinc-600">Önce bir işletme ekleyin.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Kapasite Yönetimi</h1>
      <p className="text-zinc-600 mb-6">
        Onaylanan rezervasyonlar kapasiteden düşer. Toplam kapasiteyi ve slot süresini işletme bazında, isterseniz haftanın günlerine göre ayrı ayrı belirleyin.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Kaydedildi.
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm max-w-3xl">
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 mb-2">İşletme</label>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="İşletme ara..."
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder:text-zinc-400"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Seçili işletme:{' '}
              <span className="font-medium text-zinc-800">
                {businesses.find((b) => b.id === selectedBusinessId)?.name ?? 'Henüz seçilmedi'}
              </span>
            </span>
          </div>
          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 max-h-72 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredBusinesses.map((b) => {
                const isActive = selectedBusinessId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBusinessId(b.id)}
                    className={
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors border ' +
                      (isActive
                        ? 'bg-green-700 border-green-700 text-white shadow-sm'
                        : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50')
                    }
                  >
                    <span className="truncate">{b.name}</span>
                    {isActive && <span className="ml-2 text-xs font-semibold">Seçili</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 mb-1">Toplam kapasite (masa sayısı)</label>
          <input
            type="number"
            min={0}
            value={capacityTables}
            onChange={(e) => setCapacityTables(e.target.value)}
            placeholder="Örn. 10"
            className="w-full max-w-[200px] rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
          />
          <p className="mt-1 text-xs text-zinc-500">Aynı zaman diliminde en fazla bu kadar onaylı rezervasyon olabilir.</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-700 mb-1">Slot süresi (dakika)</label>
          <input
            type="number"
            min={15}
            max={480}
            value={slotDuration}
            onChange={(e) => setSlotDuration(e.target.value)}
            placeholder="Örn. 90"
            className="w-full max-w-[200px] rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
          />
          <p className="mt-1 text-xs text-zinc-500">Her rezervasyonun süresi (15–480 dk).</p>
        </div>
        <div className="border-t border-zinc-200 mt-6 pt-4">
          <h2 className="text-sm font-semibold text-zinc-800 mb-2">Haftalık kapasite kuralları (opsiyonel)</h2>
          <p className="text-xs text-zinc-500 mb-3">
            Burada doldurulan değerler sadece ilgili gün için geçerlidir. Boş bırakılan günler yukarıdaki genel kapasite ve slot süresini kullanır.
          </p>
          <div className="overflow-auto">
            <table className="min-w-full text-xs border border-zinc-200 rounded-lg overflow-hidden">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">Gün</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">Rezervasyona kapalı</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">Kapasite (override)</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">Slot süresi (dk, override)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {rules.map((r) => (
                  <tr key={r.day_of_week} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 text-zinc-900">{DAY_NAMES[r.day_of_week]}</td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={r.is_closed}
                        onChange={(e) => handleRuleChange(r.day_of_week, { is_closed: e.target.checked })}
                        className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-600"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={r.capacity_tables ?? ''}
                        onChange={(e) =>
                          handleRuleChange(r.day_of_week, {
                            capacity_tables: e.target.value === '' ? null : Number(e.target.value) || 0,
                          })
                        }
                        disabled={r.is_closed}
                        className="w-24 rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-900 disabled:bg-zinc-100"
                        placeholder="Boş"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={15}
                        max={480}
                        value={r.slot_duration_minutes ?? ''}
                        onChange={(e) =>
                          handleRuleChange(r.day_of_week, {
                            slot_duration_minutes: e.target.value === '' ? null : Number(e.target.value) || 0,
                          })
                        }
                        disabled={r.is_closed}
                        className="w-28 rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-900 disabled:bg-zinc-100"
                        placeholder="Boş"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? 'Genel kapasite kaydediliyor...' : 'Genel kapasiteyi kaydet'}
            </button>
            <button
              type="button"
              onClick={handleSaveRules}
              disabled={savingRules}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {savingRules ? 'Gün kuralları kaydediliyor...' : 'Gün bazlı kuralları kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
