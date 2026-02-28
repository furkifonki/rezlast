'use client';

import { useState } from 'react';

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!title.trim()) {
      setError('Başlık gerekli.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
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

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-800 mb-6">Bildirim gönder</h1>
      <p className="text-zinc-600 text-sm mb-6">
        Uygulama kullanıcılarına push bildirimi gönderir. İleride e-posta ve SMS seçenekleri eklenecektir.
      </p>
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
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
    </div>
  );
}
