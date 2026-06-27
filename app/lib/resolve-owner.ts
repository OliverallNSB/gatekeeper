export interface OwnerInfo {
  user_id: string;
  owner_phone_number: string | null;
  twilio_phone_number: string;
  sms_notifications_enabled: boolean;
  ai_screening_enabled: boolean;
  business_name: string | null;
}

// twilio_phone_number: the Gatekeeper Twilio number that receives incoming calls.
// owner_phone_number: a SEPARATE number where screened calls are transferred.
// owner_phone_number must NOT be the phone line that forwards into Twilio — that creates a transfer loop.
export async function resolveOwner(supabase: any, toNumber: string): Promise<OwnerInfo | null> {
  const { data } = await supabase
    .from("user_settings")
    .select("user_id, owner_phone_number, twilio_phone_number, sms_notifications_enabled, ai_screening_enabled, business_name")
    .eq("twilio_phone_number", toNumber)
    .single();

  if (!data) return null;

  if (data.owner_phone_number?.replace(/\D/g, "") === data.twilio_phone_number?.replace(/\D/g, "")) {
    console.error("LOOP_GUARD: owner_phone_number equals twilio_phone_number — transfer blocked");
    return { ...data, owner_phone_number: null };
  }

  return data;
}
