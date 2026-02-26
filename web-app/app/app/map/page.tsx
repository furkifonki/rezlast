'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type BusinessMap = {
  id: string;
  name: string;
  address: string | null;
  rating: number | null;
  latitude: number;
  longitude: number;
  categories: { name: string } | null;
};

export default function MapPage() {
  const [businesses, setBusinesses] = useState<BusinessMap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, address, rating, latitude, longitude, categories ( name )')
        .eq('is_active', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('rating', { ascending: false })
        .order('name');
      if (!error && data) {
        setBusinesses(data as unknown as BusinessMap[]);
      }
      setLoading(false);
    })();
  }, []);

  const mapUrl = (lat: number, lng: number) =>
    `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <div className="p-4 md:p-0 md:max-w-2xl md:mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/app" className="text-[#15803d] font-medium hover:underline">← Keşfet</Link>
        <h1 className="text-xl font-semibold text-[#0f172a]">Harita görünümü</h1>
      </div>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#15803d] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#64748b] mt-3">Yükleniyor...</p>
        </div>
      ) : businesses.length === 0 ? (
        <div className="py-12 text-center rounded-xl bg-white border border-[#e2e8f0]">
          <p className="text-[#64748b]">Bulunamadı</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {businesses.map((b) => (
            <li key={b.id} className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link href={`/app/business/${b.id}`} className="font-semibold text-[#0f172a] hover:text-[#15803d] truncate block">
                  {b.name}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  {b.rating != null && b.rating > 0 && (
                    <span className="text-sm font-semibold text-[#f59e0b]">★ {b.rating.toFixed(1)}</span>
                  )}
                  <span className="text-sm text-[#64748b]">{(b.categories as { name: string } | null)?.name ?? '—'}</span>
                </div>
              </div>
              <a
                href={mapUrl(b.latitude, b.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 px-4 py-2 rounded-xl bg-[#15803d] text-white text-sm font-semibold hover:bg-[#166534]"
              >
                Haritada aç
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
