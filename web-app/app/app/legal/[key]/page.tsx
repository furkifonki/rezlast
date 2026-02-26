'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type LegalRow = { key: string; title: string; body: string };

export default function LegalPage() {
  const params = useParams();
  const key = (params.key === 'kvkk' || params.key === 'etk') ? params.key : 'kvkk';
  const [item, setItem] = useState<LegalRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase
      .from('app_legal_texts')
      .select('key, title, body')
      .eq('key', key)
      .single()
      .then(({ data }) => {
        setItem(data as LegalRow | null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [key]);

  const title = key === 'kvkk' ? 'KVKK Aydınlatma Metni' : 'ETK (E-posta / SMS Ticari İleti)';

  return (
    <div className="p-4 md:p-0 md:max-w-2xl md:mx-auto pb-12">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/app/profile" className="text-[#15803d] font-medium hover:underline">← Profil</Link>
      </div>
      {loading ? (
        <div className="w-8 h-8 border-2 border-[#15803d] border-t-transparent rounded-full animate-spin" />
      ) : item ? (
        <>
          <h1 className="text-xl font-semibold text-[#0f172a] mb-4">{item.title}</h1>
          <div className="prose prose-sm text-[#475569] whitespace-pre-wrap">{item.body}</div>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold text-[#0f172a] mb-4">{title}</h1>
          <p className="text-[#64748b]">Metin yüklenemedi.</p>
        </>
      )}
    </div>
  );
}
