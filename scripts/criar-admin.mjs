// Cria (ou atualiza a senha d)a conta superadmin do AutoManager.
//   admin@automanager.com / 123mudar
//
// Uso:  node scripts/criar-admin.mjs
// Requer .env.local com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
//
// A senha 123mudar é provisória - troque depois pelo painel do Supabase
// (Authentication → Users) ou pela tela de perfil ao logar.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const EMAIL = "admin@automanager.com";
const SENHA = "123mudar";

// carrega .env.local sem dependências externas
function carregarEnv() {
  try {
    const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const linha of txt.split("\n")) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // sem .env.local: confia nas variáveis já exportadas no ambiente
  }
}

carregarEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Faltam variáveis. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local."
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: SENHA,
  email_confirm: true,
});

if (!error) {
  console.log(`✅ Conta admin criada: ${EMAIL} (senha: ${SENHA})`);
  console.log(`   user id: ${data.user.id}`);
  process.exit(0);
}

// já existe? então só redefine a senha
if (/already|exists|registered|duplicate/i.test(error.message)) {
  const { data: lista } = await admin.auth.admin.listUsers();
  const u = lista?.users?.find((x) => x.email?.toLowerCase() === EMAIL);
  if (!u) {
    console.error("Conta já existe mas não consegui localizá-la para redefinir a senha.");
    process.exit(1);
  }
  const { error: upErr } = await admin.auth.admin.updateUserById(u.id, {
    password: SENHA,
    email_confirm: true,
  });
  if (upErr) {
    console.error("Falha ao redefinir senha:", upErr.message);
    process.exit(1);
  }
  console.log(`✅ Conta admin já existia - senha redefinida para "${SENHA}" (${EMAIL}).`);
  process.exit(0);
}

console.error("Erro ao criar admin:", error.message);
process.exit(1);
