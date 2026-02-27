'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type UserRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  total_points: number;
  loyalty_level: string | null;
};
type TxRow = { id: string; points: number; transaction_type: string; description: string | null; created_at: string; businesses: { name: string } | null };

function normalizePhone(v: string) {
  return v.replace(/\D/g, '').slice(0, 15);
}

export default function ProfilePage() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const email = session?.user?.email ?? '';
  const [user, setUser] = useState<UserRow | null>(null);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const [uRes, txRes] = await Promise.all([
        supabase.from('users').select('id, first_name, last_name, phone, total_points, loyalty_level').eq('id', session.user.id).single(),
        supabase.from('loyalty_transactions').select('id, points, transaction_type, description, created_at, businesses ( name )').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(20),
      ]);
      if (uRes.data) {
        const u = uRes.data as unknown as UserRow;
        setUser(u);
        setFirstName(u.first_name ?? '');
        setLastName(u.last_name ?? '');
        setPhone(u.phone ?? '');
      }
      setTransactions((txRes.data ?? []) as unknown as TxRow[]);
      setLoading(false);
    })();
  }, [session?.user?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    const fn = firstName.trim();
    const ln = lastName.trim();
    const ph = normalizePhone(phone);
    if (!fn) {
      setFieldError('Ad zorunludur.');
      return;
    }
    if (!ln) {
      setFieldError('Soyad zorunludur.');
      return;
    }
    if (ph.length < 10) {
      setFieldError('Geçerli bir telefon numarası girin (en az 10 rakam).');
      return;
    }
    if (!supabase || !session?.user?.id) return;
    setSaving(true);
    const { error } = await supabase.from('users').update({ first_name: fn, last_name: ln, phone: ph === '' ? null : ph }).eq('id', session.user.id);
    setSaving(false);
    if (error) {
      setFieldError(error.message);
      return;
    }
    setUser((prev) => (prev ? { ...prev, first_name: fn, last_name: ln, phone: ph } : null));
  };

  const handleSignOut = () => {
    if (typeof window !== 'undefined' && window.confirm('Çıkış yapmak istediğinize emin misiniz?')) {
      signOut();
      router.replace('/login');
    }
  };

  const points = user?.total_points ?? 0;
  const level = user?.loyalty_level ?? 'bronze';
  const levelLabel = { bronze: 'Bronz', silver: 'Gümüş', gold: 'Altın', platinum: 'Platin' }[level] ?? level;

  return (
    <div className="p-4 pb-12 md:pb-8 md:max-w-2xl md:mx-auto space-y-4">
      <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0]">
        <h2 className="text-lg font-semibold text-[#0f172a] mb-2">Profil bilgileri</h2>
        <p className="text-sm text-[#64748b] mb-4">Rezvio&apos;da rezervasyon ve iletişim için ad, soyad ve telefon zorunludur.</p>
        <form onSubmit={handleSave}>
          {fieldError && <p className="text-sm text-[#dc2626] mb-2">{fieldError}</p>}
          <label className="block text-xs font-semibold text-[#64748b] mb-1.5">Ad *</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Adınız"
            className="w-full border border-[#e2e8f0] rounded-xl px-3.5 py-3 text-base text-[#0f172a] mb-3 focus:outline-none focus:ring-2 focus:ring-[#15803d]"
            disabled={loading}
          />
          <label className="block text-xs font-semibold text-[#64748b] mb-1.5">Soyad *</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Soyadınız"
            className="w-full border border-[#e2e8f0] rounded-xl px-3.5 py-3 text-base text-[#0f172a] mb-3 focus:outline-none focus:ring-2 focus:ring-[#15803d]"
            disabled={loading}
          />
          <label className="block text-xs font-semibold text-[#64748b] mb-1.5">Telefon *</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(normalizePhone(e.target.value))}
            placeholder="5XX XXX XX XX"
            maxLength={15}
            className="w-full border border-[#e2e8f0] rounded-xl px-3.5 py-3 text-base text-[#0f172a] mb-3 focus:outline-none focus:ring-2 focus:ring-[#15803d]"
            disabled={loading}
          />
          <label className="block text-xs font-semibold text-[#64748b] mb-1.5">E-posta</label>
          <input type="email" value={email} readOnly className="w-full border border-[#e2e8f0] rounded-xl px-3.5 py-3 text-base bg-[#f8fafc] text-[#64748b] mb-3" />
          {loading ? (
            <div className="h-8" />
          ) : (
            <button type="submit" disabled={saving} className="w-full bg-[#15803d] text-white rounded-xl py-3.5 font-semibold text-base mt-2 disabled:opacity-70">
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          )}
        </form>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0]">
        <h2 className="text-lg font-semibold text-[#0f172a] mb-2">Özet</h2>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-[#64748b]">Toplam puan</span>
          <span className="text-xl font-bold text-[#15803d]">{points}</span>
        </div>
        <span className="inline-block bg-[#fef3c7] text-[#92400e] text-xs font-semibold px-2.5 py-1 rounded-lg">{levelLabel}</span>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] space-y-2">
        <h2 className="text-lg font-semibold text-[#0f172a] mb-2">Hızlı erişim</h2>
        <Link href="/app/favorites" className="block py-2.5 text-[#15803d] font-medium hover:underline">❤️ Favoriler</Link>
        <Link href="/app/map" className="block py-2.5 text-[#15803d] font-medium hover:underline">🗺️ Harita görünümü</Link>
        <Link href="/app/messages" className="block py-2.5 text-[#15803d] font-medium hover:underline">💬 Mesajlar</Link>
        <Link href="/app/points-info" className="block py-2.5 text-[#15803d] font-medium hover:underline">⭐ Puanlarımı nasıl kullanırım?</Link>
        <Link href="/app/legal/kvkk" className="block py-2.5 text-[#15803d] font-medium hover:underline">KVKK Aydınlatma Metni</Link>
        <Link href="/app/legal/etk" className="block py-2.5 text-[#15803d] font-medium hover:underline">ETK (E-posta / SMS)</Link>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0]">
        <h2 className="text-lg font-semibold text-[#0f172a] mb-2">Puan geçmişi</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-[#64748b]">Henüz puan hareketi yok. Rezervasyon tamamlandıkça puan kazanırsınız.</p>
        ) : (
          <ul className="space-y-2">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex justify-between items-center py-2.5 border-b border-[#f1f5f9]">
                <div>
                  <p className="text-sm text-[#0f172a]">{tx.description || (tx.points > 0 ? 'Puan kazanıldı' : 'Puan kullanıldı')}</p>
                  <p className="text-xs text-[#64748b]">{(tx.businesses as { name: string } | null)?.name ?? '—'}</p>
                </div>
                <span className={`text-sm font-semibold ${tx.points >= 0 ? 'text-[#15803d]' : 'text-[#dc2626]'}`}>
                  {tx.points >= 0 ? '+' : ''}{tx.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        className="w-full bg-white border border-[#e2e8f0] text-[#dc2626] font-semibold py-3.5 rounded-xl"
      >
        Çıkış Yap
      </button>
    </div>
  );
}
