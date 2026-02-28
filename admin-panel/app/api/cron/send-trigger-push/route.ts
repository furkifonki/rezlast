import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseAdmin';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const TZ = 'Europe/Istanbul';

function toReservationDate(reservation_date: string, reservation_time: string): Date {
  const d = reservation_date.slice(0, 10);
  const t = String(reservation_time).slice(0, 5);
  return new Date(`${d}T${t}:00+03:00`);
}

function tomorrowIstanbul(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = formatter.formatToParts(now);
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const day = parts.find((p) => p.type === 'day')!.value;
  const today = new Date(`${y}-${m}-${day}T12:00:00+03:00`);
  today.setDate(today.getDate() + 1);
  return today.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || request.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Service role client oluşturulamadı.' },
      { status: 500 }
    );
  }

  const now = new Date();
  const nowTs = now.getTime();
  const in25Min = new Date(nowTs + 25 * 60 * 1000);
  const in35Min = new Date(nowTs + 35 * 60 * 1000);
  const tomorrow = tomorrowIstanbul();

  const { data: settingsRows } = await supabase
    .from('push_trigger_settings')
    .select('owner_id, trigger_30min, trigger_1day')
    .eq('enabled', true)
    .or('trigger_30min.eq.true,trigger_1day.eq.true');

  if (!settingsRows?.length) {
    return NextResponse.json({ sent_30min: 0, sent_1day: 0, message: 'Aktif tetikleyici ayarı yok.' });
  }

  let sent30 = 0;
  let sent1d = 0;

  for (const row of settingsRows as { owner_id: string; trigger_30min: boolean; trigger_1day: boolean }[]) {
    const { data: businesses } = await supabase.from('businesses').select('id').eq('owner_id', row.owner_id);
    const businessIds = (businesses ?? []).map((b: { id: string }) => b.id);
    if (businessIds.length === 0) continue;

    if (row.trigger_30min) {
      const { data: reservations } = await supabase
        .from('reservations')
        .select('id, user_id, reservation_date, reservation_time, businesses ( name )')
        .in('business_id', businessIds)
        .in('status', ['pending', 'confirmed']);

      const { data: alreadySent } = await supabase
        .from('push_trigger_sent')
        .select('reservation_id')
        .eq('trigger_type', '30min');
      const sentSet = new Set((alreadySent ?? []).map((r: { reservation_id: string }) => r.reservation_id));

      for (const r of reservations ?? []) {
        if (sentSet.has(r.id)) continue;
        const resDate = toReservationDate(r.reservation_date, r.reservation_time);
        if (resDate.getTime() >= in25Min.getTime() && resDate.getTime() <= in35Min.getTime()) {
          const { data: tokens } = await supabase
            .from('push_tokens')
            .select('expo_push_token')
            .eq('user_id', r.user_id)
            .not('expo_push_token', 'is', null);
          const tokenList = (tokens ?? []).map((t: { expo_push_token: string }) => t.expo_push_token).filter(Boolean);
          const businessName = (r.businesses as { name?: string } | null)?.name ?? 'İşletme';
          if (tokenList.length > 0) {
            const body = `Yaklaşık 30 dakika sonra ${businessName} için rezervasyonunuz var.`;
            await fetch(EXPO_PUSH_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(tokenList.map((to: string) => ({ to, title: 'Rezervasyon hatırlatması', body, sound: 'default' }))),
            });
            await supabase.from('push_trigger_sent').insert({ reservation_id: r.id, trigger_type: '30min' });
            sent30 += 1;
          }
        }
      }
    }

    if (row.trigger_1day) {
      const { data: reservations } = await supabase
        .from('reservations')
        .select('id, user_id, reservation_date, reservation_time, businesses ( name )')
        .in('business_id', businessIds)
        .eq('reservation_date', tomorrow)
        .in('status', ['pending', 'confirmed']);

      const { data: alreadySent } = await supabase
        .from('push_trigger_sent')
        .select('reservation_id')
        .eq('trigger_type', '1day');
      const sentSet = new Set((alreadySent ?? []).map((r: { reservation_id: string }) => r.reservation_id));

      for (const r of reservations ?? []) {
        if (sentSet.has(r.id)) continue;
        const { data: tokens } = await supabase
          .from('push_tokens')
          .select('expo_push_token')
          .eq('user_id', r.user_id)
          .not('expo_push_token', 'is', null);
        const tokenList = (tokens ?? []).map((t: { expo_push_token: string }) => t.expo_push_token).filter(Boolean);
        const businessName = (r.businesses as { name?: string } | null)?.name ?? 'İşletme';
        const timeStr = String(r.reservation_time).slice(0, 5);
        if (tokenList.length > 0) {
          const body = `Yarın ${timeStr} için ${businessName} rezervasyonunuz var.`;
          await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tokenList.map((to: string) => ({ to, title: 'Yarın rezervasyonunuz var', body, sound: 'default' }))),
          });
          await supabase.from('push_trigger_sent').insert({ reservation_id: r.id, trigger_type: '1day' });
          sent1d += 1;
        }
      }
    }
  }

  return NextResponse.json({ sent_30min: sent30, sent_1day: sent1d });
}
