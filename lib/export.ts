// Exportação de dados — CSV (abre no Excel) e impressão/PDF.

export function baixarCSV(nomeArquivo: string, header: string[], linhas: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return `"${s.replace(/"/g, '""')}"`;
  };
  // separador ";" e BOM para Excel pt-BR reconhecer acentos e colunas
  const csv =
    "﻿" +
    [header, ...linhas].map((row) => row.map(esc).join(";")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  baixarBlob(nomeArquivo, blob);
}

export function baixarBlob(nomeArquivo: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function dataHora(ts: number) {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    data: `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`,
    hora: `${p(d.getHours())}:${p(d.getMinutes())}`,
  };
}
