'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';

type Row = {
  day_of_week: number;
  dayName: string;
  is_closed: boolean;
  open_time: string;
  close_time: string;
  break_start: string;
  break_end: string;
};

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const defaultRow = (day: number): Row => ({
  day_of_week: day,
  dayName: DAY_NAMES[day],
  is_closed: day === 0,
  open_time: '09:00',
  close_time: '18:00',
  break_start: '',
  break_end: '',
});

export default function BusinessHoursPage() {
  const params = useParams();
  const id = params?.id as string;
  const [businessName, setBusinessName] = useState<string>('');
  const [rows, setRows] = useState<Row[]>(() => DAY_NAMES.map((_, i) => defaultRow(i)));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    async function load() {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const [bRes, hRes] = await Promise.all([
        supabase.from('businesses').select('name').eq('id', id).eq('owner_id', user.id).single(),
        supabase.from('business_hours').select('*').eq('business_id', id).order('day_of_week'),
      ]);
      if (bRes.data) setBusinessName((bRes.data as { name: string }).name);
      const hours = (hRes.data ?? []) as { day_of_week: number; is_closed: boolean; open_time: string | null; close_time: string | null; break_start: string | null; break_end: string | null }[];
      if (hours.length > 0) {
        const map = new Map(hours.map((h) => [h.day_of_week, h]));
        setRows(
          DAY_NAMES.map((name, day) => {
            const h = map.get(day);
            if (!h)
              return { day_of_week: day, dayName: name, is_closed: day === 0, open_time: '09:00', close_time: '18:00', break_start: '', break_end: '' };
            const toStr = (t: string | null) => (t ? String(t).slice(0, 5) : '');
            return {
              day_of_week: day,
              dayName: name,
              is_closed: h.is_closed ?? false,
              open_time: toStr(h.open_time) || '09:00',
              close_time: toStr(h.close_time) || '18:00',
              break_start: toStr(h.break_start),
              break_end: toStr(h.break_end),
            };
          })
        );
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const updateRow = (day: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.day_of_week === day ? { ...r, ...patch } : r)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const supabase = createClient();
    for (const row of rows) {
      const payload = {
        business_id: id,
        day_of_week: row.day_of_week,
        is_closed: row.is_closed,
        open_time: row.is_closed ? null : (row.open_time || null),
        close_time: row.is_closed ? null : (row.close_time || null),
        break_start: row.break_start || null,
        break_end: row.break_end || null,
      };
      const { error: err } = await supabase.from('business_hours').upsert(payload, {
        onConflict: 'business_id,day_of_week',
      });
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div>
        <p className="text-zinc-500">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={`/dashboard/businesses/${id}`} className="text-sm text-zinc-500 hover:text-zinc-700">
          ← {businessName || 'İşletme'}
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900 mt-1">Çalışma Saatleri</h1>
        <p className="text-zinc-600 text-sm">Haftalık çalışma saatlerini güncelleyin.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Gün</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Kapalı</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Açılış</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Kapanış</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Mola başlangıç</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Mola bitiş</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {rows.map((row) => (
              <tr key={row.day_of_week} className="hover:bg-zinc-50">
                <td className="px-4 py-2 text-sm font-medium text-zinc-900">{row.dayName}</td>
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={row.is_closed}
                    onChange={(e) => updateRow(row.day_of_week, { is_closed: e.target.checked })}
                    className="rounded border-zinc-300"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="time"
                    value={row.open_time}
                    onChange={(e) => updateRow(row.day_of_week, { open_time: e.target.value })}
                    disabled={row.is_closed}
                    className="rounded-lg border border-zinc-300 px-2 py-1 text-sm disabled:bg-zinc-100"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="time"
                    value={row.close_time}
                    onChange={(e) => updateRow(row.day_of_week, { close_time: e.target.value })}
                    disabled={row.is_closed}
                    className="rounded-lg border border-zinc-300 px-2 py-1 text-sm disabled:bg-zinc-100"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="time"
                    value={row.break_start}
                    onChange={(e) => updateRow(row.day_of_week, { break_start: e.target.value })}
                    disabled={row.is_closed}
                    className="rounded-lg border border-zinc-300 px-2 py-1 text-sm disabled:bg-zinc-100"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="time"
                    value={row.break_end}
                    onChange={(e) => updateRow(row.day_of_week, { break_end: e.target.value })}
                    disabled={row.is_closed}
                    className="rounded-lg border border-zinc-300 px-2 py-1 text-sm disabled:bg-zinc-100"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-4 py-3">
          <Link
            href={`/dashboard/businesses/${id}`}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            İptal
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}
