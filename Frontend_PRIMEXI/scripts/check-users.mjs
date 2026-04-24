/**
 * Verifica que los usuarios registrados quedan en la tabla "users" de Supabase.
 * Uso: node scripts/check-users.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    console.error("Ejecuta: source .env.local && node scripts/check-users.mjs");
    process.exit(1);
}

const supabase = createClient(url, key);

const { data, error } = await supabase
    .from("users")
    .select("id, email, team_name")
    .order("email");

if (error) {
    console.error("Error consultando tabla users:", error.message);
    process.exit(1);
}

console.log(`\n✅ Tabla "users" — ${data.length} registro(s)\n`);

if (data.length === 0) {
    console.log("  (vacía — registra un usuario y vuelve a verificar)\n");
} else {
    data.forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.email} | equipo: ${u.team_name}`);
    });
    console.log();
}
