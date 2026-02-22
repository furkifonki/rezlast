'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

type Review = {
  id: string;
  business_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_hidden: boolean | null;
  created_at: string;
  businesses: { name: string } | null;
};

type BusinessOption = { id: string; name: string };

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterBusinessId, setFilterBusinessId] = useState<string>('');
  const [filterHidden, setFilterHidden] = useState<'all' | 'visible' | 'hidden'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setReviews([]);
        setBusinesses([]);
        setLoading(false);
        return;
      }
      const { data: myBusinesses } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', user.id);
      const list = (myBusinesses ?? []) as { id: string; name: string }[];
      setBusinesses(list);
      const businessIds = list.map((b) => b.id);
      if (businessIds.length === 0) {
        setReviews([]);
        setLoading(false);
        return;
      }
      let query = supabase
        .from('reviews')
        .select('id, business_id, user_id, rating, comment, is_hidden, created_at, businesses ( name )')
        .in('business_id', businessIds)
        .order('created_at', { ascending: false });
      if (filterBusinessId) query = query.eq('business_id', filterBusinessId);
      if (filterHidden === 'visible') query = query.or('is_hidden.eq.false,is_hidden.is.null');
      if (filterHidden === 'hidden') query = query.eq('is_hidden', true);
      const { data, error: err } = await query;
      if (err) {
        setError(err.message);
        setReviews([]);
      } else {
        setReviews((data ?? []) as Review[]);
      }
      setLoading(false);
    }
    load();
  }, [filterBusinessId, filterHidden]);

  const toggleHidden = async (id: string, current: boolean) => {
    setActionLoading(id);
    const supabase = createClient();
    const { error: err } = await supabase
      .from('reviews')
      .update({ is_hidden: !current, updated_at: new Date().toISOString() })
      .eq('id', id);
    setActionLoading(null);
    if (err) {
      setError(err.message);
      return;
    }
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, is_hidden: !current } : r)));
  };

  const deleteReview = async (id: string) => {
    if (!confirm('Bu yorumu kalıcı olarak silmek istediğinize emin misiniz?')) return;
    setActionLoading(id);
    const supabase = createClient();
    const { error: err } = await supabase.from('reviews').delete().eq('id', id);
    setActionLoading(null);
    if (err) {
      setError(err.message);
      return;
    }
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Yorumlar</h1>
        <p className="text-zinc-600 text-sm">
          İşletmelerinize gelen yorumları listeleyebilir, gizleyebilir veya silebilirsiniz.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <label className="text-sm font-medium text-zinc-700">İşletme:</label>
        <select
          value={filterBusinessId}
          onChange={(e) => setFilterBusinessId(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900"
        >
          <option value="">Tümü</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <label className="text-sm font-medium text-zinc-700 ml-2">Görünürlük:</label>
        <select
          value={filterHidden}
          onChange={(e) => setFilterHidden(e.target.value as 'all' | 'visible' | 'hidden')}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900"
        >
          <option value="all">Tümü</option>
          <option value="visible">Görünen</option>
          <option value="hidden">Gizli</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-zinc-500">Yükleniyor...</p>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
          Bu filtreye uyan yorum yok.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">İşletme</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Puan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Yorum</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Tarih</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Durum</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {reviews.map((r) => (
                <tr key={r.id} className={r.is_hidden ? 'bg-zinc-50' : ''}>
                  <td className="px-4 py-3 text-sm text-zinc-900">{r.businesses?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="text-amber-600">{'★'.repeat(Math.round(r.rating))}{'☆'.repeat(5 - Math.round(r.rating))}</span>
                    <span className="text-zinc-500 ml-1">({r.rating})</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700 max-w-xs truncate">
                    {r.comment || <span className="text-zinc-400 italic">Yorum yok</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500">
                    {new Date(r.created_at).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-4 py-3">
                    {r.is_hidden ? (
                      <span className="inline-flex rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700">Gizli</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">Görünen</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleHidden(r.id, !!r.is_hidden)}
                      disabled={actionLoading === r.id}
                      className="mr-2 rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
                    >
                      {r.is_hidden ? 'Göster' : 'Gizle'}
                    </button>
                    <button
                      onClick={() => deleteReview(r.id)}
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
