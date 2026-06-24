export type Tema = "escuro" | "claro";

export function getTema(): Tema {
  if (typeof window === "undefined") return "escuro";
  return localStorage.getItem("tema") === "claro" ? "claro" : "escuro";
}

export function applyTema(t: Tema) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", t === "claro");
  try {
    localStorage.setItem("tema", t);
  } catch {
    /* ignora */
  }
}

// Script injetado no <head> para aplicar o tema antes da pintura (sem flash).
export const TEMA_NO_FLASH = `(function(){try{if(localStorage.getItem('tema')==='claro'){document.documentElement.classList.add('light')}}catch(e){}})();`;
