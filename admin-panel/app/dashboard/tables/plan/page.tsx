'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';

type Business = { id: string; name: string };
type TableRow = {
  id: string;
  business_id: string;
  table_number: string;
  capacity: number;
  position_x: number | null;
  position_y: number | null;
  table_type: string | null;
};

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 700;
const TABLE_WIDTH = 64;
const TABLE_HEIGHT = 48;

export default function TablePlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessIdFromUrl = searchParams.get('business_id');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(businessIdFromUrl || '');
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);

  const loadBusinesses = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('businesses').select('id, name').eq('owner_id', user.id).order('name');
    setBusinesses((data ?? []) as Business[]);
    if (data?.length && !selectedBusinessId) setSelectedBusinessId(data[0].id);
  }, [selectedBusinessId]);

  const loadTables = useCallback(async () => {
    if (!selectedBusinessId) {
      setTables([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from('tables')
      .select('id, business_id, table_number, capacity, position_x, position_y, table_type')
      .eq('business_id', selectedBusinessId)
      .eq('is_active', true)
      .order('table_number');
    if (err) {
      setError(err.message);
      setTables([]);
    } else {
      const rows = (data ?? []) as TableRow[];
      setTables(rows.map((t, i) => {
        if (t.position_x != null && t.position_y != null) return t;
        const col = i % 10;
        const row = Math.floor(i / 10);
        return { ...t, position_x: 80 + col * (TABLE_WIDTH + 28), position_y: 80 + row * (TABLE_HEIGHT + 28) };
      }));
    }
    setLoading(false);
  }, [selectedBusinessId]);

  useEffect(() => { loadBusinesses(); }, []);
  useEffect(() => { loadTables(); }, [loadTables]);

  useEffect(() => {
    if (businessIdFromUrl && businesses.some((b) => b.id === businessIdFromUrl)) {
      setSelectedBusinessId(businessIdFromUrl);
    }
  }, [businessIdFromUrl, businesses]);

  const handleBusinessChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedBusinessId(id);
    router.replace(id ? `?business_id=${id}` : '/dashboard/tables/plan');
  };

  const savePosition = async (id: string, x: number, y: number) => {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from('tables').update({ position_x: x, position_y: y }).eq('id', id);
    setSaving(false);
    if (err) setError(err.message);
    else setTables((prev) => prev.map((t) => (t.id === id ? { ...t, position_x: x, position_y: y } : t)));
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const t = tables.find((x) => x.id === id);
    if (!t || t.position_x == null || t.position_y == null) return;
    const rect = canvas.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - t.position_x;
    const offsetY = e.clientY - rect.top - t.position_y;
    dragOffsetRef.current = { x: offsetX, y: offsetY };
    setDraggingId(id);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { x: ox, y: oy } = dragOffsetRef.current;
    let x = e.clientX - rect.left - ox;
    let y = e.clientY - rect.top - oy;
    x = Math.max(0, Math.min(CANVAS_WIDTH - TABLE_WIDTH, x));
    y = Math.max(0, Math.min(CANVAS_HEIGHT - TABLE_HEIGHT, y));
    lastPositionRef.current = { x, y };
    setTables((prev) =>
      prev.map((t) => (t.id === draggingId ? { ...t, position_x: x, position_y: y } : t))
    );
  }, [draggingId]);

  const handleMouseUp = useCallback(() => {
    if (!draggingId) return;
    const pos = lastPositionRef.current;
    if (pos) savePosition(draggingId, pos.x, pos.y);
    lastPositionRef.current = null;
    setDraggingId(null);
  }, [draggingId]);

  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingId, handleMouseMove, handleMouseUp]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard/tables" className="text-sm text-zinc-500 hover:text-zinc-700">← Masa listesi</Link>
          <h1 className="text-2xl font-semibold text-zinc-900 mt-1">Masa planı</h1>
          <p className="text-zinc-600 text-sm mt-0.5">Mekanınızın yerleşimini oluşturun. Masaları sürükleyip bırakarak konumlandırın.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">İşletme</label>
            <select
              value={selectedBusinessId}
              onChange={handleBusinessChange}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-zinc-900 min-w-[220px] shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Seçin</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          {selectedBusinessId && (
            <Link
              href={`/dashboard/tables/new?business_id=${selectedBusinessId}`}
              className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 transition"
            >
              Bu işletmeye masa ekle
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {saving && (
        <div className="mb-3 flex items-center gap-2 text-sm text-green-700">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Konum kaydediliyor...
        </div>
      )}

      {!selectedBusinessId ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 p-12 text-center text-zinc-500">
          Yukarıdan bir işletme seçin.
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-zinc-500">Yükleniyor...</div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-zinc-600">
              <span className="font-medium text-zinc-700">Oda alanı</span> — Masayı tutup sürükleyin; bırakınca konum otomatik kaydedilir.
            </p>
            <span className="text-xs text-zinc-400">{tables.length} masa</span>
          </div>
          <div
            ref={canvasRef}
            className="relative rounded-xl overflow-hidden select-none"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              backgroundImage: `
                linear-gradient(to right, rgba(148, 163, 184, 0.15) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(148, 163, 184, 0.15) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px',
              boxShadow: 'inset 0 0 0 2px rgba(148, 163, 184, 0.2)',
            }}
          >
            {tables.map((t) => {
              const x = t.position_x ?? 0;
              const y = t.position_y ?? 0;
              const isDragging = draggingId === t.id;
              return (
                <div
                  key={t.id}
                  onMouseDown={(e) => handleMouseDown(e, t.id)}
                  className="absolute flex flex-col items-center justify-center rounded-xl border-2 select-none transition-shadow duration-150"
                  style={{
                    left: x,
                    top: y,
                    width: TABLE_WIDTH,
                    height: TABLE_HEIGHT,
                    zIndex: isDragging ? 50 : 1,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    backgroundColor: isDragging ? '#dcfce7' : '#f0fdf4',
                    borderColor: isDragging ? '#16a34a' : '#22c55e',
                    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                >
                  <span className="text-sm font-bold text-green-900">{t.table_number}</span>
                  <span className="text-[10px] text-green-700 mt-0.5">{t.capacity} kişi</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
