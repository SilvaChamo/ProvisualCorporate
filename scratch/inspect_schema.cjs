const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gwankhxcbkrtgxopbxwd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3YW5raHhjYmtydGd4b3BieHdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjY2NzUsImV4cCI6MjA4NTgwMjY3NX0.Wmx16vE2PQBuuyCT0wWrLQTDemMufo2VJeM5NF9IfcY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data: assets, error: aErr } = await supabase.from('assets').select('*').limit(1);
  console.log("=== Asset row keys ===");
  if (aErr) console.error("Asset error:", aErr);
  else console.log(assets.length > 0 ? Object.keys(assets[0]) : "No rows found");

  const { data: folders, error: fErr } = await supabase.from('folders').select('*').limit(1);
  console.log("\n=== Folder row keys ===");
  if (fErr) console.error("Folder error:", fErr);
  else console.log(folders.length > 0 ? Object.keys(folders[0]) : "No rows found");
}

run();
