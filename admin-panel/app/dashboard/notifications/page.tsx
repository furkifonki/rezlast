'use client';

import { useState, useEffect } from 'react';

type Tab = 'bulk' | 'single' | 'trigger';
type ActiveCustomer = { user_id: string; label: string };
type TriggerSettings = { enabled: boolean; trigger_30min: boolean; trigger_1day: boolean };

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>('bulk');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeCustomers, setActiveCustomers] = useState<ActiveCustomer[]>([]);
  const [activeCustomersLoading, setActiveCustomersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  const [triggerSettings, setTriggerSettings] = useState<TriggerSettings>({
    enabled: true,
    trigger_30min: true,
    trigger_1day: false,
  });
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerSaved, setTriggerSaved] = useState(false);

  useEffect(() => {
    if (tab === 'single') {
      setActiveCustomersLoading(true);
      fetch('/api/active-customers')
        .then((res) => res.json())
        .then((data) => {
          setActiveCustomers(Array.isArray(data) ? data : []);
          if (!selectedUserId && Array.isArray(data) && data.length > 0) {
            setSelectedUserId(data[0].user_id);
          }
        })
        .catch(() => setActiveCustomers([]))
        .finally(() => setActiveCustomersLoading(false));
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 'trigger') {
      fetch('/api/push-triggers')
        .then((res) => res.json())
        .then((data) => {
          if (data.enabled !== undefined) {
            setTriggerSettings({
              enabled: !!data.enabled,
              trigger_30min: !!data.trigger_30min,
              trigger_1day: !!data.trigger_1day,
            });
          }
        })
        .catch(() => {});
    }
  }, [tab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!title.trim()) {
      setError('Başlık gerekli.');
      return;
    }
    if (tab === 'single' && !selectedUserId) {
      setError('Tekil gönderim için müşteri seçin.');
      return;
    }
    setLoading(true);
    try {
      const payload: { title: string; body: string; mode?: string; user_id?: string } = {
        title: title.trim(),
        body: body.trim(),
      };
      if (tab === 'bulk') payload.mode = 'bulk';
      if (tab === 'single') {
        payload.mode = 'single';
        payload.user_id = selectedUserId;
      }
      const res = await fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Bildirim gönderilemedi.');
        return;
      }
      setResult({
        sent: data.sent ?? 0,
        failed: data.failed ?? 0,
        total: data.total ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bildirim gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const saveTriggerSettings = async () => {
    setTriggerLoading(true);
    setTriggerSaved(false);
    setError(null);
    try {
      const res = await fetch('/api/push-triggers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(triggerSettings),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ayarlar kaydedilemedi.');
        return;
      }
      setTriggerSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ayarlar kaydedilemedi.');
    } finally {
      setTriggerLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-800 mb-2">Bildirim gönder</h1>
      <p className="text-zinc-600 text-sm mb-6">
        Uygulama kullanıcılarına push bildirimi: toplu, tekil veya otomatik tetikleyici ayarlayın.
      </p>

      <div className="flex gap-2 mb-6 border-b border-zinc-200">
        <button
          type="button"
          onClick={() => setTab('bulk')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${tab === 'bulk' ? 'bg-green-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
        >
          Toplu (tüm kullanıcılar)
        </button>
        <button
          type="button"
          onClick={() => setTab('single')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${tab === 'single' ? 'bg-green-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
        >
          Tekil (aktif müşteri)
        </button>
        <button
          type="button"
          onClick={() => setTab('trigger')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${tab === 'trigger' ? 'bg-green-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
        >
          Tetikleyici (otomatik)
        </button>
      </div>

      {tab === 'bulk' && (
        <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
          <p className="text-zinc-600 text-sm">Tüm uygulama kullanıcılarına (push tokenı kayıtlı) anında bildirim gönderir.</p>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Başlık</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
              placeholder="Örn: Yeni kampanya"
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Mesaj</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 min-h-[100px]"
              placeholder="Bildirim metni (isteğe bağlı)"
              maxLength={500}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {result && (
            <p className="text-zinc-600 text-sm">
              Toplam: {result.total} cihaz — Gönderilen: {result.sent}, Başarısız: {result.failed}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Gönderiliyor…' : 'Gönder'}
          </button>
        </form>
      )}

      {tab === 'single' && (
        <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
          <p className="text-zinc-600 text-sm">Sadece rezervasyonu bekleyen veya onaylı (henüz tamamlanmamış) müşterilere tek kişi seçerek gönderin.</p>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Aktif müşteri</label>
            {activeCustomersLoading ? (
              <p className="text-zinc-500 text-sm">Yükleniyor…</p>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
              >
                <option value="">Seçin</option>
                {activeCustomers.map((c) => (
                  <option key={c.user_id} value={c.user_id}>
                    {c.label}
                  </option>
                ))}
              </select>
            )}
            {!activeCustomersLoading && activeCustomers.length === 0 && (
              <p className="text-zinc-500 text-sm mt-1">Bekleyen/onaylı rezervasyonu olan müşteri yok.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Başlık</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
              placeholder="Örn: Rezervasyonunuz onaylandı"
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Mesaj</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 min-h-[100px]"
              placeholder="Bildirim metni (isteğe bağlı)"
              maxLength={500}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {result && (
            <p className="text-zinc-600 text-sm">
              Toplam: {result.total} cihaz — Gönderilen: {result.sent}, Başarısız: {result.failed}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !selectedUserId}
            className="rounded-lg bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Gönderiliyor…' : 'Gönder'}
          </button>
        </form>
      )}

      {tab === 'trigger' && (
        <div className="max-w-lg space-y-4">
          <p className="text-zinc-600 text-sm">
            Rezervasyon tarihine göre otomatik push bildirimi. Açık seçenekler, rezervasyondan belirtilen süre önce müşteriye bildirim gönderilmesini sağlar (zamanlanmış görev/cron gerekir).
          </p>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={triggerSettings.enabled}
                onChange={(e) => setTriggerSettings((s) => ({ ...s, enabled: e.target.checked }))}
                className="rounded border-zinc-300 text-green-600"
              />
              <span className="font-medium text-zinc-800">Tetikleyici bildirimleri aktif</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={triggerSettings.trigger_30min}
                onChange={(e) => setTriggerSettings((s) => ({ ...s, trigger_30min: e.target.checked }))}
                disabled={!triggerSettings.enabled}
                className="rounded border-zinc-300 text-green-600"
              />
              <span className="text-zinc-700">Rezervasyondan 30 dakika önce push at</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={triggerSettings.trigger_1day}
                onChange={(e) => setTriggerSettings((s) => ({ ...s, trigger_1day: e.target.checked }))}
                disabled={!triggerSettings.enabled}
                className="rounded border-zinc-300 text-green-600"
              />
              <span className="text-zinc-700">Rezervasyondan 1 gün önce push at</span>
            </label>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {triggerSaved && <p className="text-green-600 text-sm">Ayarlar kaydedildi.</p>}
          <button
            type="button"
            onClick={saveTriggerSettings}
            disabled={triggerLoading}
            className="rounded-lg bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {triggerLoading ? 'Kaydediliyor…' : 'Ayarları kaydet'}
          </button>
        </div>
      )}
    </div>
  );
}
