'use client';

import { useState, useEffect, useCallback } from 'react';

type Channel = 'email' | 'sms' | 'app_push';
type AppPushTab = 'bulk' | 'single' | 'trigger';
type ActiveCustomer = { user_id: string; label: string };
type TriggerSettings = {
  enabled: boolean;
  trigger_30min: boolean;
  trigger_1day: boolean;
  notify_messages: boolean;
  notify_reservations: boolean;
};

export default function NotificationsPage() {
  const [channel, setChannel] = useState<Channel>('app_push');
  const [appPushTab, setAppPushTab] = useState<AppPushTab>('bulk');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeCustomers, setActiveCustomers] = useState<ActiveCustomer[]>([]);
  const [activeCustomersLoading, setActiveCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  const [triggerSettings, setTriggerSettings] = useState<TriggerSettings>({
    enabled: true,
    trigger_30min: true,
    trigger_1day: false,
    notify_messages: true,
    notify_reservations: true,
  });
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerSaved, setTriggerSaved] = useState(false);

  const fetchCustomers = useCallback((q?: string) => {
    setActiveCustomersLoading(true);
    const url = q ? `/api/active-customers?q=${encodeURIComponent(q)}` : '/api/active-customers';
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setActiveCustomers(list);
        if (!selectedUserId && list.length > 0) setSelectedUserId(list[0].user_id);
      })
      .catch(() => setActiveCustomers([]))
      .finally(() => setActiveCustomersLoading(false));
  }, [selectedUserId]);

  useEffect(() => {
    if (channel === 'app_push' && appPushTab === 'single') {
      fetchCustomers(customerSearch || undefined);
    }
  }, [channel, appPushTab, customerSearch]);

  useEffect(() => {
    if (channel === 'app_push' && appPushTab === 'trigger') {
      fetch('/api/push-triggers')
        .then((res) => res.json())
        .then((data) => {
          if (data.enabled !== undefined) {
            setTriggerSettings({
              enabled: !!data.enabled,
              trigger_30min: !!data.trigger_30min,
              trigger_1day: !!data.trigger_1day,
              notify_messages: data.notify_messages !== false,
              notify_reservations: data.notify_reservations !== false,
            });
          }
        })
        .catch(() => {});
    }
  }, [channel, appPushTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!title.trim()) {
      setError('Başlık gerekli.');
      return;
    }
    if (appPushTab === 'single' && !selectedUserId) {
      setError('Tekil gönderim için müşteri seçin.');
      return;
    }
    setLoading(true);
    try {
      const payload: { title: string; body: string; mode?: string; user_id?: string } = {
        title: title.trim(),
        body: body.trim(),
      };
      if (appPushTab === 'bulk') payload.mode = 'bulk';
      if (appPushTab === 'single') {
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
        Kanal seçin: E-posta, SMS veya uygulama push. Mevcut toplu/tekil/tetikleyici ayarları App push içindedir.
      </p>

      {/* Kanal sekmeleri: Email | SMS | App push */}
      <div className="flex gap-2 mb-6 border-b border-zinc-200">
        <button
          type="button"
          onClick={() => setChannel('email')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${channel === 'email' ? 'bg-green-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
        >
          E-posta
        </button>
        <button
          type="button"
          onClick={() => setChannel('sms')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${channel === 'sms' ? 'bg-green-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
        >
          SMS
        </button>
        <button
          type="button"
          onClick={() => setChannel('app_push')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${channel === 'app_push' ? 'bg-green-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
        >
          App push
        </button>
      </div>

      {channel === 'email' && (
        <div className="max-w-lg rounded-lg border border-zinc-200 bg-zinc-50 p-6">
          <p className="text-zinc-600 text-sm">E-posta bildirimleri yakında eklenecek. Şu an sadece App push kullanılabilir.</p>
        </div>
      )}

      {channel === 'sms' && (
        <div className="max-w-lg rounded-lg border border-zinc-200 bg-zinc-50 p-6">
          <p className="text-zinc-600 text-sm">SMS bildirimleri yakında eklenecek. Şu an sadece App push kullanılabilir.</p>
        </div>
      )}

      {channel === 'app_push' && (
        <>
          <div className="flex gap-2 mb-6 border-b border-zinc-200">
            <button
              type="button"
              onClick={() => setAppPushTab('bulk')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg ${appPushTab === 'bulk' ? 'bg-green-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
            >
              Toplu (tüm kullanıcılar)
            </button>
            <button
              type="button"
              onClick={() => setAppPushTab('single')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg ${appPushTab === 'single' ? 'bg-green-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
            >
              Tekil (müşteri seç)
            </button>
            <button
              type="button"
              onClick={() => setAppPushTab('trigger')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg ${appPushTab === 'trigger' ? 'bg-green-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
            >
              Tetikleyici (otomatik)
            </button>
          </div>

          {appPushTab === 'bulk' && (
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

          {appPushTab === 'single' && (
            <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
              <p className="text-zinc-600 text-sm">Rezervasyonu bekleyen veya onaylı müşterilerden birini seçin. Müşteri adıyla arayabilirsiniz.</p>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Müşteri ara</label>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
                  placeholder="Ad veya isim ile ara…"
                />
              </div>
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
                  <p className="text-zinc-500 text-sm mt-1">Bekleyen/onaylı rezervasyonu olan müşteri yok veya arama sonucu boş.</p>
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

          {appPushTab === 'trigger' && (
            <div className="max-w-lg space-y-4">
              <p className="text-zinc-600 text-sm">
                Rezervasyon tarihine göre otomatik push ve hangi bildirim türlerini alacağınızı seçin. Açık seçenekler, rezervasyondan belirtilen süre önce müşteriye bildirim gönderilmesini veya sizin mesaj/rezervasyon bildirimlerinizi almanızı sağlar.
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
                <div className="border-t border-zinc-200 pt-4 mt-4">
                  <p className="text-sm font-medium text-zinc-800 mb-2">Bildirim türleri (işletme olarak alacağınız)</p>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={triggerSettings.notify_messages}
                      onChange={(e) => setTriggerSettings((s) => ({ ...s, notify_messages: e.target.checked }))}
                      className="rounded border-zinc-300 text-green-600"
                    />
                    <span className="text-zinc-700">Mesaj bildirimleri (müşteriden gelen mesajlar)</span>
                  </label>
                  <label className="flex items-center gap-3 mt-2">
                    <input
                      type="checkbox"
                      checked={triggerSettings.notify_reservations}
                      onChange={(e) => setTriggerSettings((s) => ({ ...s, notify_reservations: e.target.checked }))}
                      className="rounded border-zinc-300 text-green-600"
                    />
                    <span className="text-zinc-700">Rezervasyon bildirimleri (yeni rezervasyonlar)</span>
                  </label>
                </div>
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
        </>
      )}
    </div>
  );
}
