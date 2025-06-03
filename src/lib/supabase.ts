import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://imxmzuelixplpedchnli.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlteG16dWVsaXhwbHBlZGNobmxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NDQwNjQsImV4cCI6MjA2NDUyMDA2NH0.oq8yGQDTVXGc7wrXYHDiQ5QCKFJMmhzID1P0wLccADo";
export const supabase = createClient(supabaseUrl, supabaseKey);
