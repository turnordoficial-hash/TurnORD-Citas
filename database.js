// database.js

// Credenciales de Supabase.
const SUPABASE_URL = 'https://ujxasfligvocdqfuiyql.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqeGFzZmxpZ3ZvY2RxZnVpeXFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5OTE1NDMsImV4cCI6MjA3MjU2NzU0M30.fUMuAdcvG0LcWhF53KlS3XD5Xp1tq4uKQ6T8atBB2IE';

// Directly initialize the client from the window object provided by the CDN script.
// This script assumes the Supabase CDN script has already been loaded in the HTML.
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Supabase client initialized directly from window object.");

// Exportar la instancia de supabase.
export { supabase };
