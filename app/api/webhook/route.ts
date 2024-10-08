import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { updateUserCredits, completeOrder } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-09-30.acacia',
});

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const credits = session.metadata?.credits ? parseInt(session.metadata.credits) : 0;

    if (userId && credits) {
      try {
        // Complete the order and update user credits
        const newCredits = await completeOrder(userId, credits);
        console.log(`Credits updated for user ${userId}: +${credits}. New balance: ${newCredits}`);
      } catch (error) {
        console.error('Error completing order:', error);
        return NextResponse.json({ error: 'Failed to complete order' }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}

export const config = {
  api: {
    bodyParser: false,
  },
};