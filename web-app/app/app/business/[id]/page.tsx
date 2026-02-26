'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

type Business = {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  rating: number | null;
  categories: { name: string } | null;
  latitude: number | null;
  longitude: number | null;
};
type Photo = { id: string; photo_url: string; photo_order: number; is_primary: boolean };
type Hour = { day_of_week: number; open_time: string | null; close_time: string | null; is_closed: boolean };

function formatTime(t: string | null) {
  if (!t) return '—';
  return String(t).slice(0, 5);
}

export default function BusinessDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [business, setBusiness] = useState<Business | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [hours, setHours] = useState<Hour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !id) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const [bRes, pRes, hRes] = await Promise.all([
        supabase.from('businesses').select('id, name, address, city, district, phone, email, website, description, rating, categories ( name ), latitude, longitude').eq('id', id).eq('is_active', true).single(),
        supabase.from('business_photos').select('id, photo_url, photo_order, is_primary').eq('business_id', id).order('photo_order'),
        supabase.from('business_hours').select('day_of_week, open_time, close_time, is_closed').eq('business_id', id).order('day_of_week'),
      ]);
      if (bRes.error) setBusiness(null);
      else setBusiness(bRes.data as unknown as Business);
      setPhotos((pRes.data ?? []) as unknown as Photo[]);
      setHours((hRes.data ?? []) as unknown as Hour[]);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#15803d] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#64748b] mt-3">Yükleniyor...</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="p-6 md:max-w-md md:mx-auto text-center">
        <p className="text-base text-[#475569] mb-2">Bu işletme şu anda hizmet veremiyor veya mevcut değil.</p>
        <p className="text-sm text-[#64748b] mb-6">Lütfen Keşfet sayfasından başka bir işletme seçin.</p>
        <Link href="/app" className="inline-block bg-[#15803d] text-white font-semibold px-5 py-2.5 rounded-xl">← Keşfet&apos;e dön</Link>
      </div>
    );
  }

  const primaryPhoto = photos.find((p) => p.is_primary) ?? photos[0];
  const mapUrl =
    business.latitude != null && business.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${business.latitude},${business.longitude}`
      : business.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([business.address, business.district, business.city].filter(Boolean).join(', '))}`
        : null;

  return (
    <div className="pb-6 md:pb-8 md:max-w-3xl md:mx-auto">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#e2e8f0] bg-white md:rounded-t-xl md:border md:border-b-0">
        <Link href="/app" className="text-[#15803d] font-medium hover:underline">← Keşfet&apos;e dön</Link>
      </div>
      {primaryPhoto?.photo_url && (
        <div className="h-48 md:h-72 bg-[#f1f5f9] overflow-hidden">
          <img src={primaryPhoto.photo_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4 md:p-6 space-y-4 bg-white md:rounded-b-xl md:border md:border-t-0 border-[#e2e8f0]">
        <h1 className="text-xl font-bold text-[#0f172a]">{business.name}</h1>
        <p className="text-sm text-[#15803d]">{(business.categories as { name: string } | null)?.name ?? '—'}</p>
        {business.rating != null && Number(business.rating) > 0 && (
          <p className="text-sm font-semibold text-[#f59e0b]">★ {Number(business.rating).toFixed(1)}</p>
        )}
        {business.address && (
          <div>
            <p className="text-xs font-semibold text-[#64748b] mb-1">Adres</p>
            <p className="text-[#0f172a]">{business.address}</p>
            {(business.district || business.city) && (
              <p className="text-sm text-[#64748b]">{[business.district, business.city].filter(Boolean).join(', ')}</p>
            )}
          </div>
        )}
        {business.description && (
          <div>
            <p className="text-xs font-semibold text-[#64748b] mb-1">Hakkında</p>
            <p className="text-sm text-[#0f172a]">{business.description}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-[#64748b] mb-2">Çalışma saatleri</p>
          {hours.length === 0 ? (
            <p className="text-sm text-[#64748b]">Belirtilmemiş</p>
          ) : (
            <ul className="space-y-1">
              {hours.map((h) => (
                <li key={h.day_of_week} className="flex justify-between text-sm">
                  <span className="text-[#0f172a]">{DAY_NAMES[h.day_of_week]}</span>
                  <span className="text-[#64748b]">
                    {h.is_closed ? 'Kapalı' : `${formatTime(h.open_time)} – ${formatTime(h.close_time)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {mapUrl && (
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="block text-[#15803d] font-medium text-sm">
            📍 Haritada aç
          </a>
        )}
        {(business.phone || business.email || business.website) && (
          <div className="flex flex-wrap gap-3 text-sm">
            {business.phone && (
              <a href={`tel:${business.phone}`} className="text-[#15803d]">📞 {business.phone}</a>
            )}
            {business.email && (
              <a href={`mailto:${business.email}`} className="text-[#15803d]">✉️ E-posta</a>
            )}
            {business.website && (
              <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target="_blank" rel="noopener noreferrer" className="text-[#15803d]">🌐 Web</a>
            )}
          </div>
        )}
        <Link
          href={`/app/reserve/${business.id}`}
          className="block w-full bg-[#15803d] text-white text-center font-semibold py-3.5 rounded-xl"
        >
          Rezervasyon Yap
        </Link>
      </div>
    </div>
  );
}
