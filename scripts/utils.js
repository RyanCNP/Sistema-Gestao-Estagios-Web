const STATUS_LABELS = Object.freeze({
  RASCUNHO: "Rascunho",
  ENVIADO: "Enviado",
  EM_CONFERENCIA: "Em conferência",
  AGUARDANDO_CORRECAO: "Aguardando correção",
  EM_ANALISE_ACADEMICA: "Em análise acadêmica",
  AGUARDANDO_ASSINATURA: "Aguardando assinatura",
  FORMALIZADO: "Formalizado",
  EM_EXECUCAO: "Em execução",
  EM_AVALIACAO_FINAL: "Em avaliação final",
  CONCLUIDO: "Concluído",
  PARCIAL: "Deferido parcialmente",
  INDEFERIDO: "Indeferido",
  CANCELADO: "Cancelado",
});

export function escapeHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function mostrarAlerta(mensagem, tipo = "info") {
  const el = document.getElementById("global-alert");
  if (!el) return;

  el.className = "alert";
  if (tipo === "error") el.classList.add("alert-error");
  else if (tipo === "success") el.classList.add("alert-success");
  else if (tipo === "warning") el.classList.add("alert-warning");

  el.textContent = mensagem;
  el.hidden = false;
}

export function limparAlerta() {
  const el = document.getElementById("global-alert");
  if (!el) return;
  el.textContent = "";
  el.hidden = true;
  el.className = "alert";
}

export function formatarStatus(status) {
  return STATUS_LABELS[status] || status || "—";
}

export function formatarDataHora(isoString) {
  if (!isoString) return "—";
  const data = new Date(isoString);
  if (Number.isNaN(data.getTime())) return isoString;
  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}