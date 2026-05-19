import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://hatyfnxjkefcgzfwqcvj.supabase.co";
const supabaseKey = "sb_publishable_63GpMFdVs08whHCgbfD-iw_XEm_PVH9";

export const supabase = createClient(supabaseUrl, supabaseKey);