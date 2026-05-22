import { createClient } from '@supabase/supabase-js';

// Test temporaire : on met les clés "en dur"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hmtgzqbxymspauusziyh.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtdGd6cWJ4eW1zcGF1dXN6aXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDE1OTIsImV4cCI6MjA5NDUxNzU5Mn0.tIH7g3R-_X6oMATATzWKXIOR9t6iIpUsDpQxWuYQhy8';

export const supabase = createClient(supabaseUrl, supabaseKey);