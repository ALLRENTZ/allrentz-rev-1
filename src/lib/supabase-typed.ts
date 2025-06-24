
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const SUPABASE_URL = "https://wfvxfhssrlqthhuysjou.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmdnhmaHNzcmxxdGhodXlzam91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjYyODksImV4cCI6MjA2NjM0MjI4OX0.eeS7Mx2rd_oFHgglAbjehIZYMc9egYy1GBD6ODkbeN8";

export const supabaseTyped = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
