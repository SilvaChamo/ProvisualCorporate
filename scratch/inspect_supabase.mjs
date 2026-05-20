import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gwankhxcbkrtgxopbxwd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3YW5raHhjYmtydGd4b3BieHdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjY2NzUsImV4cCI6MjA4NTgwMjY3NX0.Wmx16vE2PQBuuyCT0wWrLQTDemMufo2VJeM5NF9IfcY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspect() {
  console.log("=== FOLDERS ===");
  const { data: folders, error: folderErr } = await supabase.from('folders').select('*').limit(1);
  if (folderErr) {
    console.error("Folder error:", folderErr);
  } else {
    console.log("Folder columns:", folders[0] ? Object.keys(folders[0]) : "No rows");
  }

  console.log("=== ASSETS ===");
  const { data: assets, error: assetErr } = await supabase.from('assets').select('*').limit(1);
  if (assetErr) {
    console.error("Asset error:", assetErr);
  } else {
    console.log("Asset columns:", assets[0] ? Object.keys(assets[0]) : "No rows");
  }
}

inspect();
