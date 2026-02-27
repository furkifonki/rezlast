import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type FavoriteRow = {
  id: string;
  business_id: string;
  businesses: {
    id: string;
    name: string;
    address: string;
    city: string;
    district: string | null;
    description: string | null;
    rating: number | null;
    categories: { name: string } | null;
  } | null;
};

const SELECT = 'id, business_id, businesses ( id, name, address, city, district, description, rating, categories ( name ) )';

export function useFavorites() {
  const { session } = useAuth();
  const [list, setList] = useState<FavoriteRow[]>([]);
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !session?.user?.id) {
      setList([]);
      setPhotoMap({});
      setError(null);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    const { data, err } = await supabase
      .from('user_favorites')
      .select(SELECT)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
      setList([]);
      setPhotoMap({});
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as FavoriteRow[];
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
    } else {
      setPhotoMap({});
    }
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const favoritesSet = new Set(list.map((r) => r.business_id).filter(Boolean));

  const toggleFavorite = useCallback(
    async (businessId: string) => {
      if (!supabase || !session?.user?.id) return;
      const isFav = list.some((r) => r.business_id === businessId);
      if (isFav) {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', session.user.id)
          .eq('business_id', businessId);
      } else {
        await supabase
          .from('user_favorites')
          .insert({ user_id: session.user.id, business_id: businessId });
      }
      await load();
    },
    [session?.user?.id, load, list]
  );

  const removeFavorite = useCallback(
    async (businessId: string) => {
      if (!supabase || !session?.user?.id) return;
      await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', session.user.id)
        .eq('business_id', businessId);
      await load();
    },
    [session?.user?.id, load]
  );

  return {
    list,
    photoMap,
    favoritesSet,
    loading,
    error,
    refetch: load,
    toggleFavorite,
    removeFavorite,
  };
}
