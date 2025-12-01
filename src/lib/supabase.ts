// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// (opcional) logs de diagnóstico — REMOVA depois
if (!supabaseUrl) console.error("Faltando env: NEXT_PUBLIC_SUPABASE_URL");
if (!supabaseKey) console.error("Faltando env: NEXT_PUBLIC_SUPABASE_ANON_KEY");

// Se quiser falhar cedo de forma explícita:
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase: variáveis de ambiente não definidas.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
