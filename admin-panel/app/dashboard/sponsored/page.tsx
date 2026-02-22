'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

type SponsoredListing = {
  id: string;
  business_id: string;
  start_date: string;
  end_date: string;
  priority: number | null;
  payment_status: string | null;
  created_at: string;
  businesses: { name: string } | null;
};

type BusinessOption = { id: string; name: string };

export default function SponsoredPage() {
  const [listings, setListings] = useState<SponsoredListing[]>([]);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formBusinessId, setFormBusinessId] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formPriority, setFormPriority] = useState(0);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setListings([]);
        setBusinesses([]);
        setLoading(false);
        return;
      }
      const { data: myBusinesses } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', user.id);
      const list = (myBusinesses ?? []) as BusinessOption[];
      setBusinesses(list);
      const businessIds = list.map((b) => b.id);
      if (businessIds.length === 0) {
        setListings([]);
        setLoading(false);
        return;
      }
      const { data, error: err } = await supabase
        .from('sponsored_listings')
        .select('id, business_id, start_date, end_date, priority, payment_status, created_at, businesses ( name )')
        .in('business_id', businessIds)
        .order('priority', { ascending: false })
        .order('start_date', { ascending: false });
      if (err) {
        setError(err.message);
        setListings([]);
      } else {
        setListings((data ?? []) as SponsoredListing[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setFormBusinessId(businesses[0]?.id ?? '');
    setFormStartDate(today);
    const end = new Date();
    end.setDate(end.getDate() + 7);
    setFormEndDate(end.toISOString().slice(0, 10));
    setFormPriority(0);
    setShowForm(true);
  };

  const openEdit = (row: SponsoredListing) => {
    setEditingId(row.id);
    setFormBusinessId(row.business_id);
    setFormStartDate(row.start_date);
    setFormEndDate(row.end_date);
    setFormPriority(row.priority ?? 0);
    setShowForm(true);
  };

  const save = async () => {
    if (!formBusinessId || !formStartDate || !formEndDate) {
      setError('İşletme ve tarih alanları zorunludur.');
      return;
    }
    if (formStartDate > formEndDate) {
      setError('Bitiş tarihi başlangıçtan önce olamaz.');
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      business_id: formBusinessId,
      start_date: formStartDate,
      end_date: formEndDate,
      priority: formPriority,
      payment_status: 'paid',
      updated_at: new Date().toISOString(),
    };
    if (editingId) {
      const { error: err } = await supabase.from('sponsored_listings').update(payload).eq('id', editingId);
      if (err) setError(err.message);
      else {
        setListings((prev) => prev.map((r) => (r.id === editingId ? { ...r, ...payload, businesses: r.businesses } : r)));
        setShowForm(false);
      }
    } else {
      const { data, error: err } = await supabase.from('sponsored_listings').insert(payload).select('id, business_id, start_date, end_date, priority, payment_status, created_at, businesses ( name )').single();
      if (err) setError(err.message);
      else {
        setListings((prev) => [data as SponsoredListing, ...prev]);
        setShowForm(false);
      }
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm('Bu öne çıkan kaydı silmek istediğinize emin misiniz?')) return;
    setActionLoading(id);
    const supabase = createClient();
    const { error: err } = await supabase.from('sponsored_listings').delete().eq('id', id);
    setActionLoading(null);
    if (err) setError(err.message);
    else setListings((prev) => prev.filter((r) => r.id !== id));
  };

  const isActive = (row: SponsoredListing) =>
    row.payment_status === 'paid' && row.start_date <= today && row.end_date >= today;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Öne Çıkan İşletmeler</h1>
          <p className="text-zinc-600 text-sm">
            Keşfet ekranında &quot;Öne Çıkan&quot; blokta görünecek işletmeleri ve tarih/öncelik bilgilerini yönetin.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          disabled={businesses.length === 0}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
        >
          Yeni Öne Çıkan Ekle
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">{editingId ? 'Düzenle' : 'Yeni Öne Çıkan'}</h2>
          <div className="grid gap-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">İşletme</label>
              <select
                value={formBusinessId}
                onChange={(e) => setFormBusinessId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Başlangıç</label>
                <input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Bitiş</label>
                <input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Öncelik (yüksek = üstte)</label>
              <input
                type="number"
                min={0}
                value={formPriority}
                onChange={(e) => setFormPriority(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-300"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-zinc-500">Yükleniyor...</p>
      ) : listings.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
          Henüz öne çıkan kaydı yok. &quot;Yeni Öne Çıkan Ekle&quot; ile ekleyebilirsiniz.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">İşletme</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Başlangıç</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Bitiş</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Öncelik</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Durum</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {listings.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-sm text-zinc-900">{r.businesses?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-700">{r.start_date}</td>
                  <td className="px-4 py-3 text-sm text-zinc-700">{r.end_date}</td>
                  <td className="px-4 py-3 text-sm text-zinc-700">{r.priority ?? 0}</td>
                  <td className="px-4 py-3">
                    {isActive(r) ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">Aktif</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700">Pasif</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(r)}
                      className="mr-2 rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      disabled={actionLoading === r.id}
                      className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
