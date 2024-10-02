import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-09-30.acacia',
});

export async function POST(request: Request) {
  const { userId, sessionId } = await request.json();

  try {
    // Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      // Calculate the number of credits based on the amount paid
      const amountPaid = session.amount_total! / 100; // Convert from cents to dollars
      const creditsToAdd = amountPaid * 10; // Assuming 1 credit = $0.10

      // Update user credits in Supabase
      const { data, error } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      const currentCredits = data?.credits || 0;
      const newCredits = currentCredits + creditsToAdd;

      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ credits: newCredits })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Mark this session as processed
      await supabase
        .from('processed_sessions')
        .insert({ session_id: sessionId, user_id: userId });

      return NextResponse.json({ success: true, newCredits });
    } else {
      return NextResponse.json({ success: false, error: 'Payment not completed' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating credits:', error);
    return NextResponse.json({ success: false, error: 'Failed to update credits' }, { status: 500 });
  }
}
