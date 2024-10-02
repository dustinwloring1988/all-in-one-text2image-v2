import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const updateUserCredits = async (userId: string, amount: number) => {
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    const currentCredits = data?.credits || 0;
    const newCredits = currentCredits + amount;

    const { error: updateError } = await supabase
      .from('user_credits')
      .update({ credits: newCredits })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    return newCredits;
  } catch (error) {
    console.error('Error updating user credits:', error);
    throw error;
  }
};
