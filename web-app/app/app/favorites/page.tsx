'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Business = {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string | null;
  description: string | null;
  rating: number | null;
  categories: { name: string } | null;
};
type FavoriteRow = { id: string; business_id: string; businesses: Business | null };

export default function FavoritesPage() {
  const { session } = useAuth();
  const [list, setList] = useState<FavoriteRow[]>([]);
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !session?.user?.id) {
      setList([]);
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('user_favorites')
      .select('id, business_id, businesses ( id, name, address, city, district, description, rating, categories ( name ) )')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
      setList([]);
    } else {
      const rows = (data ?? []) as unknown as FavoriteRow[];
      setList(rows);
      const ids = rows.map((r) => r.business_id).filter(Boolean);
      if (ids.length > 0) {
        const { data: photoRows } = await supabase
          .from('business_photos')
          .select('business_id, photo_url, is_primary, photo_order')
          .in('business_id', ids)
          .order('is_primary', { ascending: false })
          .order('photo_order');
        const map: Record<string, string> = {};
        (photoRows ?? []).forEach((row: { business_id: string; photo_url: string }) => {
          if (!map[row.business_id]) map[row.business_id] = row.photo_url;
        });
        setPhotoMap(map);
      } else setPhotoMap({});
    }
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#15803d] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#64748b] mt-3">Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-[#dc2626] mb-4">{error}</p>
        <button type="button" onClick={() => { setLoading(true); load(); }} className="px-4 py-2 bg-[#15803d] text-white rounded-xl font-semibold text-sm">
          Tekrar dene
        </button>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 md:py-16 md:rounded-xl md:bg-white md:border md:border-[#e2e8f0]">
        <p className="text-4xl mb-3">❤️</p>
        <p className="text-lg font-semibold text-[#0f172a] mb-1">Favorileriniz boş</p>
        <p className="text-sm text-[#64748b] text-center">Keşfet sekmesinden işletmelere kalp ekleyebilirsiniz.</p>
        <Link href="/app" className="mt-4 text-[#15803d] font-semibold">Keşfet&apos;e git</Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-0 space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
      {list.map((row) => {
        const b = row.businesses;
        if (!b) return null;
        const photoUrl = photoMap[b.id];
        const rating = b.rating != null && Number(b.rating) > 0 ? Number(b.rating).toFixed(1) : null;
        const categoryName = (b.categories as { name: string } | null)?.name ?? '—';
        return (
          <Link
            key={row.id}
            href={`/app/business/${b.id}`}
            className="block bg-white rounded-2xl overflow-hidden border border-[#e2e8f0] shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="relative h-[120px] bg-[#f1f5f9]">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">📷</div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-[#0f172a] truncate">{b.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                {rating && <span className="text-xs font-semibold text-[#f59e0b]">★ {rating}</span>}
                <span className="text-xs text-[#15803d] truncate">{categoryName}</span>
              </div>
              {b.address && <p className="text-xs text-[#64748b] truncate mt-0.5">{b.address}</p>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
