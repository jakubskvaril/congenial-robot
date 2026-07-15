import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { db } from '@/server/db';
import { SIGNUP_BONUS_CREDITS } from '@/lib/constants';

interface ClerkUserEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted';
  data: {
    id: string;
    email_addresses: { id: string; email_address: string }[];
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
}

/**
 * Keeps our `User` table in sync with Clerk, which owns identity. This is
 * the only place `User` rows are created — every other part of the app
 * assumes a synced row already exists by the time a session reaches it.
 */
export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const headerList = await headers();
  const svixId = headerList.get('svix-id');
  const svixTimestamp = headerList.get('svix-timestamp');
  const svixSignature = headerList.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(webhookSecret);

  let event: ClerkUserEvent;
  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkUserEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const { data } = event;

  if (event.type === 'user.created') {
    const email = data.email_addresses.find((e) => e.id === data.primary_email_address_id)?.email_address
      ?? data.email_addresses[0]?.email_address;
    if (!email) return NextResponse.json({ error: 'No email on user' }, { status: 400 });

    await db.user.create({
      data: {
        clerkId: data.id,
        email,
        name: [data.first_name, data.last_name].filter(Boolean).join(' ') || null,
        imageUrl: data.image_url,
        creditBalance: SIGNUP_BONUS_CREDITS,
      },
    });
  }

  if (event.type === 'user.updated') {
    const email = data.email_addresses.find((e) => e.id === data.primary_email_address_id)?.email_address;
    await db.user.updateMany({
      where: { clerkId: data.id },
      data: {
        ...(email ? { email } : {}),
        name: [data.first_name, data.last_name].filter(Boolean).join(' ') || null,
        imageUrl: data.image_url,
      },
    });
  }

  if (event.type === 'user.deleted') {
    await db.user.deleteMany({ where: { clerkId: data.id } });
  }

  return NextResponse.json({ received: true });
}
