'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

type PaymentMethod = { id: string; name: string; sort_order: number };
type Business = { id: string; name: string };
type Row = {
  id: string;
  reservation_date: string;
  reservation_time: string;
  amount: number | null;
  payment_method_id: string | null;
  businesses: Business | null;
  payment_methods: PaymentMethod | null;
};

export default function GelirPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [filterHasAmount, setFilterHasAmount] = useState<'all' | 'with'>('with');
  const [newMethodName, setNewMethodName] = useState('');
  const [savingMethod, setSavingMethod] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadMethods() {
      try {
        const supabase = createClient();
        const { data, error: err } = await supabase
          .from('payment_methods')
          .select('id, name, sort_order')
          .order('sort_order')
          .order('name');
        if (cancelled) return;
        if (err) {
          setPaymentMethods([]);
          return;
        }
        setPaymentMethods((data ?? []) as PaymentMethod[]);
      } catch {
        if (!cancelled) setPaymentMethods([]);
      }
    }
    loadMethods();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setRows([]);
          setLoading(false);
          return;
        }
        const { data: myBusinesses } = await supabase.from('businesses').select('id').eq('owner_id', user.id);
        const businessIds = (myBusinesses ?? []).map((b) => b.id);
        if (businessIds.length === 0) {
          if (!cancelled) setRows([]);
          setLoading(false);
          return;
        }
        let query = supabase
          .from('reservations')
          .select(`
            id,
            reservation_date,
            reservation_time,
            amount,
            payment_method_id,
            businesses ( id, name ),
            payment_methods ( id, name, sort_order )
          `)
          .in('business_id', businessIds)
          .gte('reservation_date', dateFrom)
          .lte('reservation_date', dateTo)
          .order('reservation_date', { ascending: false })
          .order('reservation_time', { ascending: false });
        if (filterHasAmount === 'with') {
          query = query.not('amount', 'is', null);
        }
        const { data, error: err } = await query;
        if (cancelled) return;
        if (err) {
          setError(err.message.includes('payment_methods') || err.message.includes('amount')
            ? 'Gelir özelliği için Supabase\'de add-reservations-revenue-payment-method.sql migration\'ını çalıştırın.'
            : err.message);
          setRows([]);
        } else {
          setRows((data ?? []) as Row[]);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Veri yüklenemedi.');
          setRows([]);
        }
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo, filterHasAmount]);

  const addPaymentMethod = async () => {
    const name = newMethodName.trim();
    if (!name) return;
    setSavingMethod(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from('payment_methods')
      .insert({ name, sort_order: paymentMethods.length + 1 });
    setSavingMethod(false);
    if (err) {
      setError(err.message);
      return;
    }
    setNewMethodName('');
    const { data } = await supabase
      .from('payment_methods')
      .select('id, name, sort_order')
      .order('sort_order')
      .order('name');
    setPaymentMethods((data ?? []) as PaymentMethod[]);
  };

  const totalAmount = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const byMethod: Record<string, number> = {};
  rows.forEach((r) => {
    const key = r.payment_methods?.name ?? 'Belirtilmedi';
    byMethod[key] = (byMethod[key] ?? 0) + (Number(r.amount) || 0);
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Gelir Tablosu</h1>
        <p className="text-zinc-600 text-sm">
          Rezervasyonlardan elde edilen ücretler. Ücret ve ödeme yöntemini rezervasyon detayından girebilirsiniz.
        </p>
      </div>

      {/* Özet kartları */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Toplam Gelir (seçili tarih aralığı)</p>
          <p className="mt-1 text-2xl font-bold text-green-700">
            {totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Kayıt sayısı (ücret girilmiş)</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{rows.length}</p>
        </div>
      </div>

      {/* Ödeme yöntemine göre özet */}
      {Object.keys(byMethod).length > 0 && (
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase text-zinc-500 mb-3">Ödeme yöntemine göre</h2>
          <ul className="space-y-2">
            {Object.entries(byMethod).map(([method, sum]) => (
              <li key={method} className="flex justify-between text-sm">
                <span className="text-zinc-700">{method}</span>
                <span className="font-medium text-zinc-900">
                  {sum.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ödeme yöntemleri yönetimi */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase text-zinc-500 mb-3">Ödeme yöntemleri</h2>
        <p className="text-sm text-zinc-600 mb-3">
          Rezervasyonlarda seçilebilecek ödeme yöntemleri. Yeni ekleyebilirsiniz.
        </p>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {paymentMethods.map((pm) => (
            <span
              key={pm.id}
              className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700"
            >
              {pm.name}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Yeni ödeme yöntemi (örn. Kapıda Ödeme)"
            value={newMethodName}
            onChange={(e) => setNewMethodName(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm w-64"
          />
          <button
            type="button"
            onClick={addPaymentMethod}
            disabled={savingMethod || !newMethodName.trim()}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
          >
            {savingMethod ? 'Ekleniyor...' : 'Ekle'}
          </button>
        </div>
      </div>

      {/* Filtreler */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <label className="text-sm font-medium text-zinc-700">Tarih:</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
        />
        <span className="text-zinc-400">–</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
        />
        <label className="text-sm font-medium text-zinc-700 ml-2">Göster:</label>
        <select
          value={filterHasAmount}
          onChange={(e) => setFilterHasAmount(e.target.value as 'all' | 'with')}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
        >
          <option value="with">Sadece ücret girilmiş</option>
          <option value="all">Tüm rezervasyonlar</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-zinc-500">Yükleniyor...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
          Bu filtreye uyan rezervasyon yok. Rezervasyon detayından &quot;Ücret&quot; ve &quot;Ödeme yöntemi&quot; girerek gelir kaydı oluşturabilirsiniz.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Tarih / Saat</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">İşletme</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Ücret</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Ödeme yöntemi</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-sm text-zinc-900">
                    {r.reservation_date} · {String(r.reservation_time).slice(0, 5)}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {(r.businesses as Business | null)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                    {r.amount != null
                      ? Number(r.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺'
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {(r.payment_methods as PaymentMethod | null)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/reservations/${r.id}`}
                      className="text-sm text-green-700 hover:underline"
                    >
                      Düzenle
                    </Link>
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
