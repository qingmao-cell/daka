console.log("URL =", import.meta.env.VITE_SUPABASE_URL);
console.log("KEY =", import.meta.env.VITE_SUPABASE_ANON_KEY);

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);
