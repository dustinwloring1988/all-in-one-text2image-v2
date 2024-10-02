import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-09-30.acacia',
});

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature');
  const body = await request.text();

  let event;
  try {
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Missing stripe signature or webhook secret');
    }
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;

      // Calculate credits to add
      const amountPaid = session.amount_total! / 100; // Convert from cents to dollars
      const creditsToAdd = amountPaid * 10; // 10 credits per dollar

      // Update user credits in Supabase
      const userId = session.client_reference_id; // Get userId from the session
      const { data, error: fetchError } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching user credits:', fetchError);
        return NextResponse.json({ error: 'Failed to fetch user credits' }, { status: 500 });
      }

      const currentCredits = data?.credits || 0;
      const newCredits = currentCredits + creditsToAdd;

      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ credits: newCredits })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating user credits:', updateError);
        return NextResponse.json({ error: 'Failed to update user credits' }, { status: 500 });
      }

      // Mark this session as processed
      await supabase
        .from('processed_sessions')
        .insert({ session_id: session.id, user_id: userId });

      console.log(`Credits updated for user ${userId}: ${creditsToAdd}`);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
