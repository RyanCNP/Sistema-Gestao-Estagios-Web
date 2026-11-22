import { PERFIS } from "../auth.js";
import { CURSOS_DEMO } from "./api-seed.js";
import {
  carregarSolicitacoes,
  persistirSolicitacoes,
  podeAcessarSolicitacao,
} from "./api-storage.js";

export async function listarCursos() {
  return CURSOS_DEMO;
}

export async function listarSolicitacoes(usuario, filtros = {}) {
  const todas = carregarSolicitacoes();

  let visiveis =
    usuario.perfil === PERFIS.ALUNO
      ? todas.filter((s) => s.alunoId === usuario.id)
      : todas;

  if (filtros.status) {
    visiveis = visiveis.filter((s) => s.status === filtros.status);
  }
  if (filtros.curso) {
    const termoCurso = filtros.curso.toLowerCase();
    visiveis = visiveis.filter((s) => s.curso.toLowerCase().includes(termoCurso));
  }
  if (filtros.busca) {
    const termo = filtros.busca.toLowerCase();
    visiveis = visiveis.filter(
      (s) =>
        s.id.toLowerCase().includes(termo) ||
        s.alunoNome.toLowerCase().includes(termo) ||
        s.concedente.toLowerCase().includes(termo)
    );
  }

  return visiveis;
}

export async function obterSolicitacaoPorId(id, usuario) {
  const todas = carregarSolicitacoes();
  const encontrada = todas.find((s) => s.id === id);
  if (!encontrada) {
    return { ok: false, mensagem: "Solicitação não encontrada." };
  }

  if (!podeAcessarSolicitacao(encontrada, usuario)) {
    return { ok: false, mensagem: "Acesso negado: esta solicitação pertence a outro aluno." };
  }

  return { ok: true, solicitacao: encontrada };
}

function validarEnvioSolicitacao(dados, cursoObj) {
  if (!dados.cursoId || !dados.modalidade) {
    return "Selecione o curso e a modalidade da solicitação antes de enviar.";
  }

  if (dados.modalidade === "ESTAGIO_REGULAR" && dados.situacaoMatricula !== "REGULAR") {
    return "Envio bloqueado: sua matrícula está irregular. Regularize sua situação junto à Secretaria.";
  }

  if (dados.modalidade === "EQUIPARACAO" && cursoObj && !cursoObj.permiteEquiparacao) {
    return "Equiparação não prevista no PPC do curso selecionado. Encaminhe para análise da regra institucional.";
  }

  if (!dados.concedente || !dados.periodoInicio || !dados.periodoFim) {
    return "Informe concedente/atividade e o período previsto (início e término).";
  }

  if (Number(dados.horasPrevistas) <= 0) {
    return "Informe uma carga horária prevista maior que zero.";
  }

  if (!dados.pae.descricao || !dados.pae.tecnicas || !dados.pae.compatibilidade) {
    return "Preencha a descrição das atividades, técnicas utilizadas e compatibilidade com o curso.";
  }

  const tiposAnexados = new Set((dados.documentos || []).map((d) => d.tipo));

  if (dados.modalidade === "ESTAGIO_REGULAR") {
    if (!tiposAnexados.has("TCE") || !tiposAnexados.has("PAE")) {
      return "Para Estágio Regular, anexe os documentos de exemplo de TCE e PAE antes de enviar.";
    }
  }

  if (dados.modalidade === "EQUIVALENCIA") {
    if (!tiposAnexados.has("COMPROVANTE_VINCULO") && !tiposAnexados.has("OUTRO")) {
      return "Para Equivalência, anexe documento comprobatório de vínculo ou atividade.";
    }
  }

  return null;
}

export async function salvarSolicitacao(payload, usuario, { enviar = false } = {}) {
  const todas = carregarSolicitacoes();
  const cursoObj = CURSOS_DEMO.find((c) => c.id === payload.cursoId) || CURSOS_DEMO[0];

  const dadosNormalizados = {
    ...payload,
    curso: cursoObj ? cursoObj.nome : payload.curso || "",
    horasPrevistas: Number(payload.horasPrevistas || 0),
    situacaoMatricula: usuario.situacaoMatricula || "REGULAR",
  };

  if (enviar) {
    const erroValidacao = validarEnvioSolicitacao(dadosNormalizados, cursoObj);
    if (erroValidacao) {
      return { ok: false, mensagem: erroValidacao };
    }
  }

  const agora = new Date().toISOString();
  const indiceExistente = payload.id
    ? todas.findIndex((s) => s.id === payload.id)
    : -1;

  if (indiceExistente >= 0) {
    const atual = todas[indiceExistente];
    if (!podeAcessarSolicitacao(atual, usuario)) {
      return { ok: false, mensagem: "Acesso negado para editar esta solicitação." };
    }

    const proximoStatus = enviar
      ? atual.status === "AGUARDANDO_CORRECAO"
        ? "EM_CONFERENCIA"
        : "ENVIADO"
      : atual.status;

    const historicoAtual = Array.isArray(atual.historico) ? [...atual.historico] : [];
    if (enviar) {
      historicoAtual.push({
        dataHora: agora,
        autor: usuario.nome,
        statusAnterior: atual.status,
        statusNovo: proximoStatus,
        motivo:
          atual.status === "AGUARDANDO_CORRECAO"
            ? "Pendências corrigidas e documentos reenviados para conferência."
            : "Solicitação enviada para conferência documental.",
      });
    }

    const salva = {
      ...atual,
      ...dadosNormalizados,
      status: proximoStatus,
      pendenciaAtual: enviar ? null : atual.pendenciaAtual,
      enviadaEm: enviar ? agora : atual.enviadaEm,
      historico: historicoAtual,
    };

    todas[indiceExistente] = salva;
    persistirSolicitacoes(todas);
    return { ok: true, solicitacao: salva, enviada: enviar };
  }

  const novoId = `SOL-2026-${String(todas.length + 1).padStart(3, "0")}`;
  const statusInicial = enviar ? "ENVIADO" : "RASCUNHO";

  const novaSolicitacao = {
    id: novoId,
    alunoId: usuario.id,
    alunoNome: usuario.nome,
    matricula: usuario.matricula || "00000000",
    ...dadosNormalizados,
    horasCumpridas: 0,
    status: statusInicial,
    criadaEm: agora,
    enviadaEm: enviar ? agora : null,
    pendenciaAtual: null,
    historico: [
      {
        dataHora: agora,
        autor: usuario.nome,
        statusAnterior: null,
        statusNovo: statusInicial,
        motivo: enviar
          ? "Solicitação criada e enviada para análise da Secretaria."
          : "Rascunho salvo pelo aluno.",
      },
    ],
  };

  todas.unshift(novaSolicitacao);
  persistirSolicitacoes(todas);
  return { ok: true, solicitacao: novaSolicitacao, enviada: enviar };
}