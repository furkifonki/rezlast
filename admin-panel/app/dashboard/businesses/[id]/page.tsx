'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';

type Category = { id: string; name: string };
type Business = {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  district: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  is_active: boolean;
  categories: Category | null;
};

type BusinessHour = {
  id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  break_start: string | null;
  break_end: string | null;
};

type BusinessPhoto = {
  id: string;
  photo_url: string;
  photo_order: number;
  is_primary: boolean;
};

type BusinessClosure = {
  id: string;
  closure_date: string;
  reason: string | null;
};

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function formatTime(t: string | null): string {
  if (!t) return '—';
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

export default function BusinessDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [business, setBusiness] = useState<Business | null>(null);
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [photos, setPhotos] = useState<BusinessPhoto[]>([]);
  const [closures, setClosures] = useState<BusinessClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    async function load() {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const [bRes, hRes, pRes, cRes] = await Promise.all([
        supabase
          .from('businesses')
          .select('id, name, slug, address, city, district, phone, email, website, description, is_active, categories ( id, name )')
          .eq('id', id)
          .eq('owner_id', user.id)
          .single(),
        supabase.from('business_hours').select('*').eq('business_id', id).order('day_of_week'),
        supabase.from('business_photos').select('id, photo_url, photo_order, is_primary').eq('business_id', id).order('photo_order'),
        supabase.from('business_closures').select('id, closure_date, reason').eq('business_id', id).gte('closure_date', new Date().toISOString().slice(0, 10)).order('closure_date'),
      ]);

      if (bRes.error) {
        setError(bRes.error.message);
        setBusiness(null);
      } else {
        setBusiness(bRes.data as Business);
      }
      setHours((hRes.data ?? []) as BusinessHour[]);
      setPhotos((pRes.data ?? []) as BusinessPhoto[]);
      setClosures((cRes.data ?? []) as BusinessClosure[]);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div>
        <p className="text-zinc-500">Yükleniyor...</p>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div>
        <p className="text-red-600">{error ?? 'İşletme bulunamadı.'}</p>
        <Link href="/dashboard/businesses" className="mt-2 inline-block text-green-700 hover:underline">
          ← İşletmelere dön
        </Link>
      </div>
    );
  }

  const cat = business.categories as Category | null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/dashboard/businesses" className="text-sm text-zinc-500 hover:text-zinc-700">
            ← İşletmelerim
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-900 mt-1">{business.name}</h1>
          <p className="text-zinc-500 text-sm">{cat?.name ?? '—'} · {business.district ? `${business.district}, ` : ''}{business.city}</p>
        </div>
        <Link
          href={`/dashboard/businesses/${id}/edit`}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
        >
          Düzenle
        </Link>
      </div>

      {/* Genel bilgi */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase text-zinc-500 mb-3">Genel Bilgi</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Adres</dt>
            <dd className="text-zinc-900">{business.address}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Telefon</dt>
            <dd className="text-zinc-900">{business.phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">E-posta</dt>
            <dd className="text-zinc-900">{business.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Web</dt>
            <dd className="text-zinc-900">
              {business.website ? (
                <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">
                  {business.website}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Durum</dt>
            <dd>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${business.is_active ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-600'}`}>
                {business.is_active ? 'Aktif' : 'Pasif'}
              </span>
            </dd>
          </div>
          {business.description && (
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Açıklama</dt>
              <dd className="text-zinc-900 whitespace-pre-wrap">{business.description}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Çalışma saatleri */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase text-zinc-500">Çalışma Saatleri</h2>
          <Link href={`/dashboard/businesses/${id}/edit?tab=saatler`} className="text-sm text-green-700 hover:underline">
            Düzenle
          </Link>
        </div>
        {hours.length === 0 ? (
          <p className="text-sm text-zinc-500">Henüz çalışma saati tanımlanmamış.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {hours.map((h) => (
              <li key={h.id} className="flex justify-between">
                <span className="text-zinc-700">{DAY_NAMES[h.day_of_week]}</span>
                <span className="text-zinc-900">
                  {h.is_closed ? 'Kapalı' : `${formatTime(h.open_time)} – ${formatTime(h.close_time)}${h.break_start && h.break_end ? ` (Mola: ${formatTime(h.break_start)}–${formatTime(h.break_end)})` : ''}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Fotoğraflar */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase text-zinc-500">Fotoğraflar</h2>
          <Link href={`/dashboard/businesses/${id}/edit?tab=fotograflar`} className="text-sm text-green-700 hover:underline">
            Düzenle
          </Link>
        </div>
        {photos.length === 0 ? (
          <p className="text-sm text-zinc-500">Henüz fotoğraf yok.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {photos.map((p) => (
              <div key={p.id} className="relative">
                <img src={p.photo_url} alt="" className="h-24 w-24 rounded-lg object-cover border border-zinc-200" />
                {p.is_primary && (
                  <span className="absolute bottom-1 left-1 rounded bg-green-700 px-1.5 py-0.5 text-xs text-white">Öne çıkan</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kapalı günler */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase text-zinc-500">Kapalı Günler</h2>
          <Link href={`/dashboard/businesses/${id}/edit?tab=kapali`} className="text-sm text-green-700 hover:underline">
            Düzenle
          </Link>
        </div>
        {closures.length === 0 ? (
          <p className="text-sm text-zinc-500">Yaklaşan kapalı gün yok.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {closures.map((c) => (
              <li key={c.id} className="flex justify-between">
                <span className="text-zinc-900">{c.closure_date}</span>
                <span className="text-zinc-600">{c.reason ?? '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
