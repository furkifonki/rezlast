'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Category = { id: string; name: string; slug: string };
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
type SponsoredItem = {
  id: string;
  business_id: string;
  priority: number;
  businesses: Business | Business[] | null;
};

const today = new Date().toISOString().slice(0, 10);

function getBusinessFromSponsored(item: SponsoredItem): Business | null {
  const b = item.businesses;
  if (!b) return null;
  return Array.isArray(b) ? b[0] ?? null : b;
}

export default function ExplorePage() {
  const { session } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [sponsored, setSponsored] = useState<SponsoredItem[]>([]);
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messagesUnread, setMessagesUnread] = useState(0);
  const [pendingReservations, setPendingReservations] = useState(0);
  const [todayReservations, setTodayReservations] = useState(0);

  const loadFavorites = useCallback(async () => {
    if (!supabase || !session?.user?.id) {
      setFavorites(new Set());
      return;
    }
    const { data } = await supabase
      .from('user_favorites')
      .select('business_id')
      .eq('user_id', session.user.id);
    const ids = (data ?? []).map((r: { business_id: string }) => r.business_id).filter(Boolean);
    setFavorites(new Set(ids));
  }, [session?.user?.id]);

  const toggleFavorite = useCallback(
    async (e: React.MouseEvent, businessId: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (!session?.user?.id || !supabase) return;
      const isFav = favorites.has(businessId);
      if (isFav) {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', session.user.id)
          .eq('business_id', businessId);
        setFavorites((prev) => {
          const next = new Set(prev);
          next.delete(businessId);
          return next;
        });
      } else {
        await supabase
          .from('user_favorites')
          .insert({ user_id: session.user.id, business_id: businessId });
        setFavorites((prev) => new Set([...prev, businessId]));
      }
    },
    [favorites, session?.user?.id]
  );

  const loadSponsored = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('sponsored_listings')
      .select('id, business_id, priority, businesses ( id, name, address, city, district, description, rating, categories ( name ) )')
      .eq('payment_status', 'paid')
      .lte('start_date', today)
      .gte('end_date', today)
      .order('priority', { ascending: false });
    setSponsored((data ?? []) as unknown as SponsoredItem[]);
  }, []);

  const loadCategories = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('sort_order');
    setCategories((data ?? []) as Category[]);
  }, []);

  const loadBusinesses = useCallback(async () => {
    if (!supabase) {
      setError('Bağlantı yok');
      setLoading(false);
      return;
    }
    setError(null);
    let query = supabase
      .from('businesses')
      .select('id, name, address, city, district, description, rating, categories ( name )')
      .eq('is_active', true)
      .order('rating', { ascending: false })
      .order('name');
    if (selectedCategoryId) query = query.eq('category_id', selectedCategoryId);
    const { data, error: queryError } = await query;
    if (queryError) {
      setError(queryError.message);
      setBusinesses([]);
      setPhotoMap({});
    } else {
      const list = (data ?? []) as unknown as Business[];
      setBusinesses(list);
      const ids = list.map((b) => b.id).filter(Boolean);
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
    setRefreshing(false);
  }, [selectedCategoryId]);

  useEffect(() => {
    loadCategories();
    loadSponsored();
    loadFavorites();
  }, [loadCategories, loadSponsored, loadFavorites]);

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      setMessagesUnread(0);
      setPendingReservations(0);
      setTodayReservations(0);
      return;
    }
    let cancelled = false;
    const todayStr = new Date().toISOString().slice(0, 10);
    (async () => {
      const [convRes, resRes] = await Promise.all([
        supabase.from('conversations').select('id').eq('user_id', session.user.id),
        supabase
          .from('reservations')
          .select('id, status, reservation_date')
          .eq('user_id', session.user.id)
          .in('status', ['pending', 'confirmed', 'completed']),
      ]);
      if (cancelled) return;
      const convIds = (convRes.data ?? []).map((c: { id: string }) => c.id);
      let unread = 0;
      if (convIds.length > 0) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', convIds)
          .eq('sender_type', 'restaurant')
          .is('read_at_user', null);
        unread = count ?? 0;
      }
      const list = (resRes.data ?? []) as { status: string; reservation_date: string }[];
      const pending = list.filter((r) => r.status === 'pending').length;
      const todayCount = list.filter((r) => r.reservation_date === todayStr).length;
      setMessagesUnread(unread);
      setPendingReservations(pending);
      setTodayReservations(todayCount);
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  useEffect(() => {
    setLoading(true);
    loadBusinesses();
  }, [loadBusinesses]);

  const sponsoredBusinesses = sponsored
    .map(getBusinessFromSponsored)
    .filter((b): b is Business => b != null);
  const sponsoredIds = new Set(sponsored.map((s) => s.business_id).filter(Boolean));

  const onRefresh = () => {
    setRefreshing(true);
    loadSponsored();
    loadBusinesses();
  };

  const renderCard = (item: Business, isFeatured?: boolean) => {
    const photoUrl = photoMap[item.id];
    const isFav = favorites.has(item.id);
    const rating = item.rating != null && Number(item.rating) > 0 ? Number(item.rating).toFixed(1) : null;
    const categoryName = (item.categories as { name: string } | null)?.name ?? '—';
    return (
      <Link
        key={item.id}
        href={`/app/business/${item.id}`}
        className={`block bg-white rounded-2xl overflow-hidden border shadow-sm mb-3 md:mb-0 transition-shadow hover:shadow-md ${
          isFeatured ? 'border-[#15803d] border-[1.5px]' : 'border-[#e2e8f0]'
        }`}
      >
        <div className="relative h-[140px] bg-[#f1f5f9]">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">📷</div>
          )}
          {isFeatured && (
            <span className="absolute top-2 left-2 bg-[#15803d] text-white text-[11px] font-bold uppercase px-2 py-1 rounded-lg">
              Öne Çıkan
            </span>
          )}
          <button
            type="button"
            onClick={(e) => toggleFavorite(e, item.id)}
            className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center rounded-full bg-white/95 text-xl"
          >
            {isFav ? '❤️' : '🤍'}
          </button>
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-[#0f172a] truncate">{item.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {rating && <span className="text-[13px] font-semibold text-[#f59e0b]">★ {rating}</span>}
            <span className="text-[13px] text-[#15803d] truncate flex-1">{categoryName}</span>
          </div>
          {item.address && <p className="text-xs text-[#64748b] truncate mt-0.5">{item.address}</p>}
        </div>
      </Link>
    );
  };

  return (
    <div className="pb-4 md:pb-0">
      {(messagesUnread > 0 || pendingReservations > 0 || todayReservations > 0) && (
        <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-xl bg-white border border-[#e2e8f0]">
          {messagesUnread > 0 && (
            <Link href="/app/messages" className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-800 px-4 py-2 text-sm font-semibold hover:bg-blue-200">
              💬 {messagesUnread} okunmamış mesaj
            </Link>
          )}
          {pendingReservations > 0 && (
            <Link href="/app/reservations" className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-4 py-2 text-sm font-semibold hover:bg-amber-200">
              ⏳ {pendingReservations} bekleyen
            </Link>
          )}
          {todayReservations > 0 && (
            <Link href="/app/reservations" className="inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-800 px-4 py-2 text-sm font-semibold hover:bg-green-200">
              📅 Bugün {todayReservations} rezervasyon
            </Link>
          )}
        </div>
      )}
      {sponsoredBusinesses.length > 0 && (
        <div className="bg-[#f0fdf4] border-b border-[#bbf7d0] py-3 md:rounded-xl md:mb-6 md:border md:border-[#bbf7d0]">
          <div className="flex items-center justify-between px-4 md:px-6 mb-2">
            <h2 className="text-base font-bold text-[#15803d]">Öne Çıkan</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide md:overflow-visible md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4 md:px-6 md:pb-4">
            {sponsoredBusinesses.map((item) => (
              <div key={item.id} className="flex-shrink-0 w-[220px] md:w-auto">
                {renderCard(item, true)}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white py-3.5 px-4 border-b border-[#e2e8f0] md:rounded-xl md:border md:mb-6 md:border-[#e2e8f0]">
        <Link
          href="/app/map"
          className="inline-flex items-center gap-2 bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d] font-semibold text-sm px-4 py-2.5 rounded-xl mb-3 hover:bg-[#dcfce7]"
        >
          <span>🗺️</span> Harita görünümü
        </Link>
        <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-2.5 md:mb-3">Kategori</p>
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide md:flex-wrap md:overflow-visible">
          <button
            type="button"
            onClick={() => setSelectedCategoryId(null)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium ${
              selectedCategoryId === null
                ? 'bg-[#15803d] text-white border border-[#15803d]'
                : 'bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0]'
            }`}
          >
            Tümü
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategoryId(c.id)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium ${
                selectedCategoryId === c.id
                  ? 'bg-[#15803d] text-white border border-[#15803d]'
                  : 'bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-12 px-6">
          <p className="text-sm text-[#dc2626] text-center">{error}</p>
          <p className="text-xs text-[#64748b] text-center mt-2">RLS: Mobil için aktif işletmeleri görmek üzere policy eklenmiş olmalı.</p>
        </div>
      ) : loading && businesses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#15803d] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#64748b] mt-3">Yükleniyor...</p>
        </div>
      ) : (
        <div className="p-4 md:p-0">
          {businesses.length === 0 ? (
            <div className="py-12 text-center md:py-16 md:rounded-xl md:bg-white md:border md:border-[#e2e8f0]">
              <p className="text-4xl mb-3">🏪</p>
              <p className="text-[17px] font-semibold text-[#0f172a] mb-1.5">Bu kategoride işletme yok</p>
              <p className="text-sm text-[#64748b]">Farklı bir kategori seçin veya &quot;Tümü&quot;ne tıklayın.</p>
            </div>
          ) : (
            <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
              {businesses.map((item) => renderCard(item, sponsoredIds.has(item.id)))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
