'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

type Business = { id: string; name: string };

export default function CapacityPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [capacityTables, setCapacityTables] = useState('');
  const [slotDuration, setSlotDuration] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    supabase
      .from('businesses')
      .select('capacity_tables, slot_duration_minutes')
      .eq('id', selectedBusinessId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) {
          const row = data as { capacity_tables?: number; slot_duration_minutes?: number };
          setCapacityTables(String(row.capacity_tables ?? 0));
          setSlotDuration(String(row.slot_duration_minutes ?? 90));
        }
      });
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
        Onaylanan rezervasyonlar kapasiteden düşer. Toplam kapasite ve slot süresini işletme bazında belirleyin.
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

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm max-w-xl">
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 mb-2">İşletme</label>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="İşletme ara..."
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 mb-2 placeholder:text-zinc-400"
          />
          <div className="flex flex-wrap gap-2">
            {filteredBusinesses.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBusinessId(b.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  selectedBusinessId === b.id
                    ? 'bg-green-700 text-white'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                {b.name}
              </button>
            ))}
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

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
}
