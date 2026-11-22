import {
  executarAcaoWorkflow,
  obterSolicitacaoPorId,
  registrarHorasERelatorio,
} from "../scripts/api.js";
import { PERFIS, PERFIL_LABELS } from "../scripts/auth.js";
import { escapeHtml, formatarDataHora, formatarStatus } from "../scripts/utils.js";

const MODALIDADE_LABELS = Object.freeze({
  ESTAGIO_REGULAR: "Estágio Regular",
  EQUIVALENCIA: "Equivalência",
  EQUIPARACAO: "Equiparação",
});

export async function renderDetalhe(
  container,
  { params, sessao, navegarPara, mostrarAlerta, limparAlerta }
) {
  const usuario = sessao.usuario;
  const solicitacaoId = params?.solicitacaoId;

  if (!solicitacaoId) {
    mostrarAlerta?.("Selecione uma solicitação no painel.", "warning");
    return navegarPara("painel");
  }

  async function carregarERenderizar() {
    const resp = await obterSolicitacaoPorId(solicitacaoId, usuario);
    if (!resp.ok) {
      mostrarAlerta?.(resp.mensagem, "error");
      return navegarPara("painel");
    }

    const sol = resp.solicitacao;
    const isAlunoTitular = usuario.perfil === PERFIS.ALUNO && sol.alunoId === usuario.id;
    const podeCorrigirAluno = isAlunoTitular && ["RASCUNHO", "AGUARDANDO_CORRECAO"].includes(sol.status);
    const podeRegistrarHoras = isAlunoTitular && sol.status === "EM_EXECUCAO";
    const isSecretaria = usuario.perfil === PERFIS.SECRETARIA;
    const isAcademico = [PERFIS.PROFESSOR, PERFIS.COORDENACAO].includes(usuario.perfil);
    const isDirecao = usuario.perfil === PERFIS.DIRECAO;

    container.innerHTML = `
      <section class="card" aria-labelledby="detalhe-title">
        <div class="card-header">
          <div>
            <h1 id="detalhe-title">Dossiê ${escapeHtml(sol.id)}</h1>
            <p>
              <strong>Modalidade:</strong> ${escapeHtml(MODALIDADE_LABELS[sol.modalidade] || sol.modalidade)} |
              <strong>Status atual:</strong>
              <span class="badge-demo">${escapeHtml(formatarStatus(sol.status))}</span>
            </p>
          </div>
          <div>
            <button type="button" id="btn-imprimir-resumo" class="btn btn-outline">
              Exportar / Imprimir Resumo
            </button>
            <button type="button" id="btn-voltar-painel" class="btn btn-outline">
              Voltar ao Painel
            </button>
          </div>
        </div>

        ${
          sol.pendenciaAtual
            ? `<div class="alert alert-warning" role="alert">
                <strong>Pendência aberta:</strong> ${escapeHtml(sol.pendenciaAtual)}
              </div>`
            : ""
        }

        <div class="table-wrapper">
          <table>
            <tbody>
              <tr>
                <th>Aluno</th>
                <td>${escapeHtml(sol.alunoNome)} (Matrícula: ${escapeHtml(sol.matricula || "—")})</td>
                <th>Situação da matrícula</th>
                <td>${escapeHtml(sol.situacaoMatricula || "REGULAR")}</td>
              </tr>
              <tr>
                <th>Curso</th>
                <td>${escapeHtml(sol.curso)}</td>
                <th>Concedente / Atividade</th>
                <td>${escapeHtml(sol.concedente)}</td>
              </tr>
              <tr>
                <th>Período</th>
                <td>${escapeHtml(sol.periodoInicio || "—")} até ${escapeHtml(sol.periodoFim || "—")}</td>
                <th>Carga Horária</th>
                <td>
                  Prevista: ${escapeHtml(sol.horasPrevistas)}h |
                  Cumprida: ${escapeHtml(sol.horasCumpridas || 0)}h
                  ${sol.horasReconhecidas !== null && sol.horasReconhecidas !== undefined ? `| Reconhecida: ${escapeHtml(sol.horasReconhecidas)}h` : ""}
                </td>
              </tr>
              ${
                sol.seguroInfo
                  ? `<tr>
                      <th>Seguro (registro)</th>
                      <td colspan="3">${escapeHtml(sol.seguroInfo)}</td>
                    </tr>`
                  : ""
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="card" aria-labelledby="pae-title">
        <h2 id="pae-title">Plano de Atividades (PAE) e Descrição Técnica</h2>
        <p><strong>Atividades:</strong> ${escapeHtml(sol.pae?.descricao || "—")}</p>
        <p><strong>Técnicas e ferramentas:</strong> ${escapeHtml(sol.pae?.tecnicas || "—")}</p>
        <p><strong>Compatibilidade com o curso:</strong> ${escapeHtml(sol.pae?.compatibilidade || "—")}</p>
      </section>

      <section class="card" aria-labelledby="docs-title">
        <h2 id="docs-title">Documentos Anexados (Exemplos Demonstrativos)</h2>
        ${
          sol.documentos?.length
            ? `<ul>
                ${sol.documentos
                  .map(
                    (d) =>
                      `<li><strong>[${escapeHtml(d.tipo)}]</strong> ${escapeHtml(d.nome)}</li>`
                  )
                  .join("")}
              </ul>`
            : `<p>Nenhum documento anexado.</p>`
        }
      </section>

      ${
        podeCorrigirAluno
          ? `<section class="card">
              <h2>Ação do Aluno</h2>
              <p>Edite os dados ou anexe os documentos solicitados para reenviar o processo.</p>
              <button type="button" id="btn-editar-solicitacao" class="btn btn-primary">
                Editar / Reenviar Solicitação
              </button>
            </section>`
          : ""
      }

      ${
        podeRegistrarHoras
          ? `<section class="card" aria-labelledby="horas-title">
              <h2 id="horas-title">Acompanhamento: Registro de Horas e Relatórios</h2>
              <form id="form-horas-relatorio">
                <div class="form-group">
                  <label for="reg-horas">Horas executadas a lançar</label>
                  <input id="reg-horas" type="number" min="0" max="240" placeholder="Ex.: 40" />
                </div>
                <div class="form-group">
                  <label for="reg-desc">Descrição das atividades realizadas</label>
                  <input id="reg-desc" type="text" placeholder="Ex.: Desenvolvimento de endpoints e testes" />
                </div>
                <div class="form-group">
                  <label for="reg-relatorio-tipo">Submeter relatório (opcional)</label>
                  <select id="reg-relatorio-tipo">
                    <option value="">Apenas registrar horas</option>
                    <option value="RELATORIO_PARCIAL">Relatório Parcial (Exemplo)</option>
                    <option value="RELATORIO_FINAL">Relatório Final (envia para avaliação final)</option>
                  </select>
                </div>
                <button type="submit" class="btn btn-primary">Salvar Acompanhamento</button>
              </form>
            </section>`
          : ""
      }

      ${
        isSecretaria
          ? `<section class="card" aria-labelledby="sec-title">
              <h2 id="sec-title">Conferência e Tramitação — Secretaria</h2>
              <div class="form-group">
                <label for="sec-justificativa">Observação / Motivo (obrigatório ao devolver ou indeferir)</label>
                <textarea id="sec-justificativa" rows="2"></textarea>
              </div>
              <div class="card-header">
                ${
                  sol.status === "ENVIADO"
                    ? `<button type="button" class="btn btn-outline btn-wf" data-acao="INICIAR_CONFERENCIA">Assumir Conferência</button>`
                    : ""
                }
                ${
                  ["ENVIADO", "EM_CONFERENCIA"].includes(sol.status)
                    ? `<button type="button" class="btn btn-primary btn-wf" data-acao="ENCAMINHAR_ANALISE">Encaminhar para Análise Acadêmica</button>
                       <button type="button" class="btn btn-outline btn-wf" data-acao="DEVOLVER_CORRECAO">Devolver para Correção</button>
                       <button type="button" class="btn btn-outline btn-wf" data-acao="INDEFERIR_SECRETARIA">Indeferir</button>`
                    : ""
                }
                ${
                  sol.status === "FORMALIZADO"
                    ? `<button type="button" class="btn btn-primary btn-wf" data-acao="INICIAR_EXECUCAO">Registrar Liberação / Início da Execução</button>`
                    : ""
                }
                ${
                  sol.status === "EM_AVALIACAO_FINAL"
                    ? `<button type="button" class="btn btn-primary btn-wf" data-acao="CONCLUIR_ESTAGIO">Registrar Conclusão do Estágio</button>
                       <button type="button" class="btn btn-outline btn-wf" data-acao="DEVOLVER_CORRECAO">Devolver Relatório para Ajuste</button>`
                    : ""
                }
              </div>
            </section>`
          : ""
      }

      ${
        isAcademico
          ? `<section class="card" aria-labelledby="acad-title">
              <h2 id="acad-title">Parecer Técnico / Acadêmico (${escapeHtml(PERFIL_LABELS[usuario.perfil])})</h2>
              ${
                ["EM_ANALISE_ACADEMICA", "EM_AVALIACAO_FINAL"].includes(sol.status)
                  ? `
                    <div class="form-group">
                      <label for="acad-justificativa">Parecer e justificativa obrigatória</label>
                      <textarea id="acad-justificativa" rows="3" required></textarea>
                    </div>
                    ${
                      sol.status === "EM_ANALISE_ACADEMICA" && sol.modalidade !== "ESTAGIO_REGULAR"
                        ? `<div class="form-group">
                            <label for="acad-horas">Horas reconhecidas (se deferimento parcial)</label>
                            <input id="acad-horas" type="number" min="1" max="${escapeHtml(sol.horasPrevistas)}" placeholder="Ex.: 120" />
                          </div>`
                        : ""
                    }
                    <div class="card-header">
                      ${
                        sol.status === "EM_ANALISE_ACADEMICA" && sol.modalidade === "ESTAGIO_REGULAR"
                          ? `<button type="button" class="btn btn-primary btn-wf" data-acao="APROVAR_PAE">Aprovar PAE (Enviar à Direção)</button>
                             <button type="button" class="btn btn-outline btn-wf" data-acao="DEVOLVER_CORRECAO">Devolver PAE para Adequação</button>`
                          : ""
                      }
                      ${
                        sol.status === "EM_ANALISE_ACADEMICA" && sol.modalidade !== "ESTAGIO_REGULAR"
                          ? `<button type="button" class="btn btn-primary btn-wf" data-acao="DEFERIR_INTEGRAL">Deferir Integralmente</button>
                             <button type="button" class="btn btn-outline btn-wf" data-acao="DEFERIR_PARCIAL">Deferir Parcialmente</button>
                             <button type="button" class="btn btn-outline btn-wf" data-acao="DEVOLVER_CORRECAO">Devolver para Correção</button>
                             <button type="button" class="btn btn-outline btn-wf" data-acao="INDEFERIR_ACADEMICO">Indeferir</button>`
                          : ""
                      }
                      ${
                        sol.status === "EM_AVALIACAO_FINAL"
                          ? `<button type="button" class="btn btn-primary btn-wf" data-acao="APROVAR_RELATORIO">Aprovar Relatório Final</button>
                             <button type="button" class="btn btn-outline btn-wf" data-acao="DEVOLVER_RELATORIO">Devolver Relatório Final</button>`
                          : ""
                      }
                    </div>
                  `
                  : `<p>Nenhuma decisão acadêmica pendente no status atual.</p>`
              }
            </section>`
          : ""
      }

      ${
        isDirecao
          ? `<section class="card" aria-labelledby="dir-title">
              <h2 id="dir-title">Etapa da Direção (Simulação Demonstrativa)</h2>
              <p>
                Registro de ciência/assinatura final após validação documental e acadêmica.
                <strong>Não possui validade de assinatura eletrônica oficial.</strong>
              </p>
              ${
                sol.status === "AGUARDANDO_ASSINATURA"
                  ? `<button type="button" class="btn btn-primary btn-wf" data-acao="ASSINAR_DIRECAO">
                      Registrar Ciência / Assinatura Simulada
                    </button>`
                  : `<p>Processo fora da etapa de assinatura da Direção.</p>`
              }
            </section>`
          : ""
      }

      ${
        sol.pareceres?.length
          ? `<section class="card" aria-labelledby="pareceres-title">
              <h2 id="pareceres-title">Pareceres Emitidos</h2>
              <ul>
                ${sol.pareceres
                  .map(
                    (p) => `
                  <li>
                    <strong>${escapeHtml(p.avaliador)}</strong> (${escapeHtml(formatarDataHora(p.dataHora))}) —
                    <em>${escapeHtml(p.resultado)}</em>: ${escapeHtml(p.justificativa)}
                  </li>
                `
                  )
                  .join("")}
              </ul>
            </section>`
          : ""
      }

      <section class="card" aria-labelledby="hist-title">
        <h2 id="hist-title">Trilha de Auditoria e Histórico de Status</h2>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Data / Hora</th>
                <th>Ator</th>
                <th>Transição</th>
                <th>Motivo / Registro</th>
              </tr>
            </thead>
            <tbody>
              ${(sol.historico || [])
                .map(
                  (h) => `
                <tr>
                  <td>${escapeHtml(formatarDataHora(h.dataHora))}</td>
                  <td>${escapeHtml(h.autor)}</td>
                  <td>
                    ${h.statusAnterior ? escapeHtml(formatarStatus(h.statusAnterior)) : "Início"}
                    &rarr;
                    <strong>${escapeHtml(formatarStatus(h.statusNovo))}</strong>
                  </td>
                  <td>${escapeHtml(h.motivo)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;

    container.querySelector("#btn-voltar-painel")?.addEventListener("click", () => {
      navegarPara("painel");
    });

    container.querySelector("#btn-imprimir-resumo")?.addEventListener("click", () => {
      window.print();
    });

    container.querySelector("#btn-editar-solicitacao")?.addEventListener("click", () => {
      navegarPara("solicitacao", { solicitacaoId: sol.id });
    });

    container.querySelector("#form-horas-relatorio")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      limparAlerta?.();
      const res = await registrarHorasERelatorio(sol.id, usuario, {
        horas: container.querySelector("#reg-horas").value,
        descricao: container.querySelector("#reg-desc").value,
        tipoRelatorio: container.querySelector("#reg-relatorio-tipo").value,
      });

      if (!res.ok) {
        mostrarAlerta?.(res.mensagem, "error");
        return;
      }

      mostrarAlerta?.("Acompanhamento registrado com sucesso.", "success");
      await carregarERenderizar();
    });

    container.querySelectorAll(".btn-wf").forEach((btn) => {
      btn.addEventListener("click", async () => {
        limparAlerta?.();
        const acao = btn.getAttribute("data-acao");
        const justificativa =
          container.querySelector("#sec-justificativa")?.value ||
          container.querySelector("#acad-justificativa")?.value ||
          "";
        const horasReconhecidas = container.querySelector("#acad-horas")?.value || null;

        const res = await executarAcaoWorkflow(sol.id, usuario, acao, {
          justificativa,
          horasReconhecidas,
        });

        if (!res.ok) {
          mostrarAlerta?.(res.mensagem, "error");
          return;
        }

        mostrarAlerta?.("Status da solicitação atualizado com registro de auditoria.", "success");
        await carregarERenderizar();
      });
    });
  }

  await carregarERenderizar();
}