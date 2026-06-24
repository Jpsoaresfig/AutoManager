import type { Role } from "./types";

// Tela inicial de cada papel ao entrar.
export function homeDe(role: Role): string {
  if (role === "motoboy") return "/entregas";
  if (role === "vendedor") return "/vender";
  return "/painel";
}

// Rotas que cada papel pode acessar (owner = tudo).
const ROTAS: Record<Role, string[]> = {
  owner: ["*"],
  vendedor: ["/vender", "/produtos", "/perfil"],
  motoboy: ["/entregas", "/perfil"],
};

export function podeAcessar(role: Role, path: string): boolean {
  const permitidas = ROTAS[role] || [];
  if (permitidas.includes("*")) return true;
  return permitidas.some((p) => path === p || path.startsWith(p + "/"));
}

export const ehDono = (role: Role) => role === "owner";
