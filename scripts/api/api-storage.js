import { PERFIS } from "../auth.js";
import { SEED_SOLICITACOES, STORAGE_KEY } from "./api-seed.js";

export function carregarSolicitacoes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_SOLICITACOES));
      return [...SEED_SOLICITACOES];
    }
    return JSON.parse(raw);
  } catch {
    return [...SEED_SOLICITACOES];
  }
}

export function persistirSolicitacoes(lista) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

export function podeAcessarSolicitacao(solicitacao, usuario) {
  if (!solicitacao || !usuario) return false;
  if (usuario.perfil === PERFIS.ALUNO) {
    return solicitacao.alunoId === usuario.id;
  }
  return true;
}