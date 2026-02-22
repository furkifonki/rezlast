'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

type Business = { id: string; name: string };
type Customer = { user_id: string; customer_email: string | null; customer_name: string | null };

export default function LoyaltyPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [points, setPoints] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
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
    })();
  }, []);

  useEffect(() => {
    if (!selectedBusinessId) {
      setCustomers([]);
      setSelectedUserId('');
      return;
    }
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from('reservations')
        .select('user_id, customer_email, customer_name')
        .eq('business_id', selectedBusinessId);
      const rows = (data ?? []) as Customer[];
      const byUser = new Map<string, Customer>();
      rows.forEach((r) => {
        if (r.user_id && !byUser.has(r.user_id)) {
          byUser.set(r.user_id, {
            user_id: r.user_id,
            customer_email: r.customer_email ?? null,
            customer_name: r.customer_name ?? null,
          });
        }
      });
      setCustomers(Array.from(byUser.values()));
      setSelectedUserId('');
    })();
  }, [selectedBusinessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const pts = parseInt(points, 10);
    if (Number.isNaN(pts) || pts === 0) {
      setError('Geçerli bir puan girin (pozitif ekler, negatif düşer).');
      return;
    }
    if (!selectedUserId || !selectedBusinessId) {
      setError('İşletme ve müşteri seçin.');
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error: err } = await supabase.from('loyalty_transactions').insert({
      user_id: selectedUserId,
      business_id: selectedBusinessId,
      reservation_id: null,
      points: pts,
      transaction_type: pts > 0 ? 'manual_add' : 'manual_deduct',
      description: description.trim() || (pts > 0 ? 'Manuel puan ekleme' : 'Manuel puan düşme'),
    });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess(pts > 0 ? `${pts} puan eklendi.` : `${Math.abs(pts)} puan düşüldü.`);
    setPoints('');
    setDescription('');
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Puan İşlemleri</h1>
        <p className="text-zinc-500">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Puan İşlemleri</h1>
        <p className="text-zinc-600 text-sm mt-1">Müşterilere manuel puan ekleyebilir veya düşebilirsiniz.</p>
      </div>

      {businesses.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-zinc-600">
          Önce bir işletme ekleyin. <Link href="/dashboard/businesses" className="text-green-700 hover:underline">İşletmelerim</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {success && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">İşletme</label>
            <select
              value={selectedBusinessId}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Müşteri</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
              required
            >
              <option value="">Seçin</option>
              {customers.map((c) => (
                <option key={c.user_id} value={c.user_id}>
                  {c.customer_name || c.customer_email || c.user_id}
                </option>
              ))}
            </select>
            {customers.length === 0 && selectedBusinessId && (
              <p className="mt-1 text-xs text-zinc-500">Bu işletmede henüz rezervasyon yapan müşteri yok.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Puan</label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="Örn. 50 veya -20"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
              required
            />
            <p className="mt-1 text-xs text-zinc-500">Pozitif = ekleme, negatif = düşme.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Açıklama (opsiyonel)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
              placeholder="Örn. Kampanya bonusu"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
          >
            {submitting ? 'İşleniyor...' : 'Uygula'}
          </button>
        </form>
      )}
    </div>
  );
}
