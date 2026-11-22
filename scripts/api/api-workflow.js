import { PERFIS } from "../auth.js";
import { carregarSolicitacoes, persistirSolicitacoes } from "./api-storage.js";

function resolverTransicaoSecretaria(sol, acao, justificativa) {
  if (acao === "INICIAR_CONFERENCIA" && sol.status === "ENVIADO") {
    return { ok: true, statusNovo: "EM_CONFERENCIA", pendenciaAtual: null };
  }
  if (acao === "ENCAMINHAR_ANALISE" && ["ENVIADO", "EM_CONFERENCIA"].includes(sol.status)) {
    return { ok: true, statusNovo: "EM_ANALISE_ACADEMICA", pendenciaAtual: null };
  }
  if (
    acao === "DEVOLVER_CORRECAO" &&
    ["ENVIADO", "EM_CONFERENCIA", "EM_AVALIACAO_FINAL"].includes(sol.status)
  ) {
    if (!justificativa) {
      return { ok: false, mensagem: "Informe o motivo da devolução para correção." };
    }
    return { ok: true, statusNovo: "AGUARDANDO_CORRECAO", pendenciaAtual: justificativa };
  }
  if (acao === "INDEFERIR_SECRETARIA" && ["ENVIADO", "EM_CONFERENCIA"].includes(sol.status)) {
    if (!justificativa) {
      return { ok: false, mensagem: "Informe a justificativa do indeferimento." };
    }
    return { ok: true, statusNovo: "INDEFERIDO", pendenciaAtual: null };
  }
  if (acao === "INICIAR_EXECUCAO" && sol.status === "FORMALIZADO") {
    return { ok: true, statusNovo: "EM_EXECUCAO", pendenciaAtual: null };
  }
  if (acao === "CONCLUIR_ESTAGIO" && sol.status === "EM_AVALIACAO_FINAL") {
    return { ok: true, statusNovo: "CONCLUIDO", pendenciaAtual: null };
  }
  return { ok: false, mensagem: "Transição não permitida para o estado atual." };
}

function resolverTransicaoAcademica(sol, usuario, acao, dados, agora) {
  const justificativa = String(dados.justificativa || "").trim();
  const pareceres = Array.isArray(sol.pareceres) ? [...sol.pareceres] : [];
  let horasReconhecidas = sol.horasReconhecidas ?? null;

  if (!["EM_ANALISE_ACADEMICA", "EM_AVALIACAO_FINAL"].includes(sol.status)) {
    return { ok: false, mensagem: "Esta solicitação não está em etapa de avaliação acadêmica." };
  }
  if (!justificativa) {
    return { ok: false, mensagem: "O parecer técnico/acadêmico exige justificativa." };
  }

  if (sol.status === "EM_ANALISE_ACADEMICA") {
    if (acao === "DEVOLVER_CORRECAO") {
      pareceres.push({
        avaliador: usuario.nome,
        perfil: usuario.perfil,
        resultado: "AGUARDANDO_CORRECAO",
        horasReconhecidas,
        justificativa,
        dataHora: agora,
      });
      return { ok: true, statusNovo: "AGUARDANDO_CORRECAO", pendenciaAtual: justificativa, pareceres, horasReconhecidas };
    }
    if (acao === "APROVAR_PAE" && sol.modalidade === "ESTAGIO_REGULAR") {
      pareceres.push({
        avaliador: usuario.nome,
        perfil: usuario.perfil,
        resultado: "AGUARDANDO_ASSINATURA",
        horasReconhecidas,
        justificativa,
        dataHora: agora,
      });
      return { ok: true, statusNovo: "AGUARDANDO_ASSINATURA", pendenciaAtual: null, pareceres, horasReconhecidas };
    }
    if (acao === "DEFERIR_INTEGRAL" && sol.modalidade !== "ESTAGIO_REGULAR") {
      horasReconhecidas = sol.horasPrevistas;
      pareceres.push({
        avaliador: usuario.nome,
        perfil: usuario.perfil,
        resultado: "CONCLUIDO",
        horasReconhecidas,
        justificativa,
        dataHora: agora,
      });
      return { ok: true, statusNovo: "CONCLUIDO", pendenciaAtual: null, pareceres, horasReconhecidas };
    }
    if (acao === "DEFERIR_PARCIAL" && sol.modalidade !== "ESTAGIO_REGULAR") {
      const horas = Number(dados.horasReconhecidas || 0);
      if (horas <= 0 || horas >= sol.horasPrevistas) {
        return {
          ok: false,
          mensagem: "Para deferimento parcial, informe horas reconhecidas maiores que 0 e menores que o total solicitado.",
        };
      }
      horasReconhecidas = horas;
      pareceres.push({
        avaliador: usuario.nome,
        perfil: usuario.perfil,
        resultado: "PARCIAL",
        horasReconhecidas,
        justificativa,
        dataHora: agora,
      });
      return { ok: true, statusNovo: "PARCIAL", pendenciaAtual: null, pareceres, horasReconhecidas };
    }
    if (acao === "INDEFERIR_ACADEMICO") {
      horasReconhecidas = 0;
      pareceres.push({
        avaliador: usuario.nome,
        perfil: usuario.perfil,
        resultado: "INDEFERIDO",
        horasReconhecidas,
        justificativa,
        dataHora: agora,
      });
      return { ok: true, statusNovo: "INDEFERIDO", pendenciaAtual: null, pareceres, horasReconhecidas };
    }
    return { ok: false, mensagem: "Ação acadêmica inválida para esta modalidade." };
  }

  if (acao === "DEVOLVER_RELATORIO") {
    pareceres.push({
      avaliador: usuario.nome,
      perfil: usuario.perfil,
      resultado: "RELATORIO_DEVOLVIDO",
      horasReconhecidas: sol.horasCumpridas,
      justificativa,
      dataHora: agora,
    });
    return { ok: true, statusNovo: "AGUARDANDO_CORRECAO", pendenciaAtual: justificativa, pareceres, horasReconhecidas };
  }

  if (acao === "APROVAR_RELATORIO") {
    pareceres.push({
      avaliador: usuario.nome,
      perfil: usuario.perfil,
      resultado: "RELATORIO_APROVADO",
      horasReconhecidas: sol.horasCumpridas,
      justificativa,
      dataHora: agora,
    });
    return { ok: true, statusNovo: "EM_AVALIACAO_FINAL", pendenciaAtual: null, pareceres, horasReconhecidas };
  }

  return { ok: false, mensagem: "Ação inválida na avaliação final." };
}

export async function executarAcaoWorkflow(id, usuario, acao, dados = {}) {
  const todas = carregarSolicitacoes();
  const idx = todas.findIndex((s) => s.id === id);
  if (idx < 0) {
    return { ok: false, mensagem: "Solicitação não encontrada." };
  }

  const sol = todas[idx];
  const agora = new Date().toISOString();
  const justificativa = String(dados.justificativa || "").trim();

  let statusNovo = sol.status;
  let pendenciaAtual = sol.pendenciaAtual;
  let horasReconhecidas = sol.horasReconhecidas ?? null;
  let pareceres = Array.isArray(sol.pareceres) ? [...sol.pareceres] : [];

  if (usuario.perfil === PERFIS.SECRETARIA) {
    const res = resolverTransicaoSecretaria(sol, acao, justificativa);
    if (!res.ok) return res;
    statusNovo = res.statusNovo;
    pendenciaAtual = res.pendenciaAtual;
  } else if ([PERFIS.PROFESSOR, PERFIS.COORDENACAO].includes(usuario.perfil)) {
    const res = resolverTransicaoAcademica(sol, usuario, acao, dados, agora);
    if (!res.ok) return res;
    statusNovo = res.statusNovo;
    pendenciaAtual = res.pendenciaAtual;
    pareceres = res.pareceres;
    horasReconhecidas = res.horasReconhecidas;
  } else if (usuario.perfil === PERFIS.DIRECAO) {
    if (acao !== "ASSINAR_DIRECAO" || sol.status !== "AGUARDANDO_ASSINATURA") {
      return {
        ok: false,
        mensagem: "Bloqueado: a Direção só registra ciência/assinatura após conferência e análise acadêmica.",
      };
    }
    statusNovo = "FORMALIZADO";
    pendenciaAtual = null;
  } else {
    return {
      ok: false,
      mensagem: "Seu perfil não possui permissão para alterar o estado desta solicitação.",
    };
  }

  const historico = Array.isArray(sol.historico) ? [...sol.historico] : [];
  historico.push({
    dataHora: agora,
    autor: usuario.nome,
    statusAnterior: sol.status,
    statusNovo,
    motivo:
      justificativa ||
      (acao === "ASSINAR_DIRECAO"
        ? "Ciência/assinatura registrada pela Direção (simulação demonstrativa sem valor oficial)."
        : `Transição executada (${acao}).`),
  });

  const atualizada = {
    ...sol,
    status: statusNovo,
    pendenciaAtual,
    horasReconhecidas,
    pareceres,
    historico,
  };

  todas[idx] = atualizada;
  persistirSolicitacoes(todas);
  return { ok: true, solicitacao: atualizada };
}

export async function registrarHorasERelatorio(id, usuario, dados) {
  const todas = carregarSolicitacoes();
  const idx = todas.findIndex((s) => s.id === id);
  if (idx < 0) return { ok: false, mensagem: "Solicitação não encontrada." };

  const sol = todas[idx];
  if (usuario.perfil !== PERFIS.ALUNO || sol.alunoId !== usuario.id) {
    return { ok: false, mensagem: "Apenas o aluno titular pode registrar horas e relatórios." };
  }

  if (sol.status !== "EM_EXECUCAO") {
    return { ok: false, mensagem: "O registro de horas e relatórios exige que o estágio esteja Em Execução." };
  }

  const horasAdicionais = Number(dados.horas || 0);
  const descricaoAtividade = String(dados.descricao || "").trim();
  const tipoRelatorio = dados.tipoRelatorio || "";
  const nomeRelatorio = String(dados.nomeRelatorio || "").trim();

  if (horasAdicionais <= 0 && !tipoRelatorio) {
    return { ok: false, mensagem: "Informe horas executadas ou anexe um relatório parcial/final." };
  }

  const agora = new Date().toISOString();
  const novasHoras = Number(sol.horasCumpridas || 0) + Math.max(0, horasAdicionais);
  const registrosHoras = Array.isArray(sol.registrosHoras) ? [...sol.registrosHoras] : [];
  const documentos = Array.isArray(sol.documentos) ? [...sol.documentos] : [];
  const historico = Array.isArray(sol.historico) ? [...sol.historico] : [];

  if (horasAdicionais > 0) {
    registrosHoras.push({
      data: agora,
      horas: horasAdicionais,
      descricao: descricaoAtividade || "Atividades supervisionadas registradas pelo aluno.",
    });
  }

  let statusNovo = sol.status;
  if (tipoRelatorio) {
    const docNome = nomeRelatorio || `${tipoRelatorio}_Exemplo.pdf`;
    documentos.push({ nome: docNome, tipo: tipoRelatorio });

    if (tipoRelatorio === "RELATORIO_FINAL") {
      statusNovo = "EM_AVALIACAO_FINAL";
    }

    historico.push({
      dataHora: agora,
      autor: usuario.nome,
      statusAnterior: sol.status,
      statusNovo,
      motivo:
        tipoRelatorio === "RELATORIO_FINAL"
          ? `Relatório final (${docNome}) submetido para avaliação de encerramento.`
          : `Relatório parcial (${docNome}) anexado ao acompanhamento.`,
    });
  } else {
    historico.push({
      dataHora: agora,
      autor: usuario.nome,
      statusAnterior: sol.status,
      statusNovo: sol.status,
      motivo: `Registradas ${horasAdicionais}h de atividades (total acumulado: ${novasHoras}h).`,
    });
  }

  const atualizada = {
    ...sol,
    horasCumpridas: novasHoras,
    registrosHoras,
    documentos,
    status: statusNovo,
    historico,
  };

  todas[idx] = atualizada;
  persistirSolicitacoes(todas);
  return { ok: true, solicitacao: atualizada };
}