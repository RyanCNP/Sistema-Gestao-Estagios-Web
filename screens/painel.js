import { listarSolicitacoes } from "../scripts/api.js";
import { PERFIS, PERFIL_LABELS } from "../scripts/auth.js";
import { escapeHtml, formatarDataHora, formatarStatus } from "../scripts/utils.js";

const MODALIDADE_LABELS = Object.freeze({
  ESTAGIO_REGULAR: "Estágio Regular",
  EQUIVALENCIA: "Equivalência",
  EQUIPARACAO: "Equiparação",
});

const CONFIG_PAINEL_PERFIL = Object.freeze({
  [PERFIS.ALUNO]: {
    titulo: "Minhas Solicitações de Estágio",
    subtitulo: "Acompanhe o andamento, corrija pendências e envie relatórios.",
    statusPadrao: "",
    acaoPrimaria: { label: "+ Nova Solicitação", rota: "solicitacao" },
  },
  [PERFIS.SECRETARIA]: {
    titulo: "Fila da Secretaria / Setor de Estágios",
    subtitulo: "Conferência documental, protocolo, encaminhamento e encerramento.",
    statusPadrao: "EM_CONFERENCIA",
    acaoPrimaria: { label: "Gerenciar Cadastros", rota: "admin" },
  },
  [PERFIS.PROFESSOR]: {
    titulo: "Painel do Professor Responsável",
    subtitulo: "Avaliação técnica de PAE, relatórios parciais/finais e pareceres.",
    statusPadrao: "EM_ANALISE_ACADEMICA",
    acaoPrimaria: null,
  },
  [PERFIS.COORDENACAO]: {
    titulo: "Painel da Coordenação de Curso",
    subtitulo: "Validação de pertinência ao PPC, equivalência e equiparação.",
    statusPadrao: "EM_ANALISE_ACADEMICA",
    acaoPrimaria: null,
  },
  [PERFIS.DIRECAO]: {
    titulo: "Painel da Direção da Unidade",
    subtitulo: "Dossiês validados aguardando registro de ciência/assinatura (simulação).",
    statusPadrao: "AGUARDANDO_ASSINATURA",
    acaoPrimaria: null,
  },
  [PERFIS.ADMIN]: {
    titulo: "Painel do Administrador Técnico",
    subtitulo: "Monitoramento do ambiente demonstrativo e gestão de contas/parâmetros.",
    statusPadrao: "",
    acaoPrimaria: { label: "Cadastros e Perfis", rota: "admin" },
  },
});

export async function renderPainel(container, { sessao, navegarPara }) {
  const usuario = sessao.usuario;
  const cfg = CONFIG_PAINEL_PERFIL[usuario.perfil] || CONFIG_PAINEL_PERFIL[PERFIS.ALUNO];
  const isAluno = usuario.perfil === PERFIS.ALUNO;

  const filtrosAtuais = {
    status: cfg.statusPadrao,
    curso: "",
    busca: "",
  };

  container.innerHTML = `
    <section class="card" aria-labelledby="painel-title">
      <div class="card-header">
        <div>
          <h1 id="painel-title">${escapeHtml(cfg.titulo)}</h1>
          <p>${escapeHtml(cfg.subtitulo)}</p>
        </div>
        ${
          cfg.acaoPrimaria
            ? `<button type="button" id="btn-acao-primaria" class="btn btn-primary">
                ${escapeHtml(cfg.acaoPrimaria.label)}
              </button>`
            : `<span class="role-tag">${escapeHtml(PERFIL_LABELS[usuario.perfil])}</span>`
        }
      </div>

      ${
        isAluno
          ? `<div class="alert alert-warning" role="note">
              <strong>Matrícula:</strong> ${escapeHtml(usuario.matricula || "—")} |
              <strong>Curso:</strong> ${escapeHtml(usuario.curso || "—")} |
              <strong>Situação:</strong> ${escapeHtml(usuario.situacaoMatricula || "REGULAR")}
            </div>`
          : ""
      }
    </section>

    <section class="card" aria-label="Filtros e listagem">
      <form id="form-filtros" class="card-header">
        <div class="form-group">
          <label for="filtro-status">Status</label>
          <select id="filtro-status" name="status">
            <option value="">Todos os status</option>
            <option value="RASCUNHO">Rascunho</option>
            <option value="ENVIADO">Enviado</option>
            <option value="EM_CONFERENCIA">Em conferência</option>
            <option value="AGUARDANDO_CORRECAO">Aguardando correção</option>
            <option value="EM_ANALISE_ACADEMICA">Em análise acadêmica</option>
            <option value="AGUARDANDO_ASSINATURA">Aguardando assinatura</option>
            <option value="FORMALIZADO">Formalizado</option>
            <option value="EM_EXECUCAO">Em execução</option>
            <option value="EM_AVALIACAO_FINAL">Em avaliação final</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="PARCIAL">Deferido parcialmente</option>
            <option value="INDEFERIDO">Indeferido</option>
          </select>
        </div>

        ${
          !isAluno
            ? `<div class="form-group">
                <label for="filtro-curso">Curso</label>
                <input id="filtro-curso" type="text" placeholder="Ex.: Software Multiplataforma" />
              </div>`
            : ""
        }

        <div class="form-group">
          <label for="filtro-busca">Protocolo / Aluno / Concedente</label>
          <input id="filtro-busca" type="search" placeholder="Buscar..." />
        </div>

        <button type="submit" class="btn btn-outline">Filtrar</button>
      </form>

      <div id="painel-lista" class="table-wrapper"></div>
    </section>
  `;

  const statusSelect = container.querySelector("#filtro-status");
  statusSelect.value = filtrosAtuais.status;

  if (cfg.acaoPrimaria) {
    container.querySelector("#btn-acao-primaria")?.addEventListener("click", () => {
      navegarPara(cfg.acaoPrimaria.rota);
    });
  }

  async function atualizarTabela() {
    const listaEl = container.querySelector("#painel-lista");
    const itens = await listarSolicitacoes(usuario, filtrosAtuais);

    if (!itens.length) {
      listaEl.innerHTML = `<p>Nenhuma solicitação encontrada para os filtros selecionados.</p>`;
      return;
    }

    listaEl.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Protocolo</th>
            ${!isAluno ? "<th>Aluno / Curso</th>" : ""}
            <th>Modalidade</th>
            <th>Concedente / Atividade</th>
            <th>Status</th>
            <th>Atualizado em</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          ${itens
            .map(
              (item) => `
            <tr>
              <td><strong>${escapeHtml(item.id)}</strong></td>
              ${
                !isAluno
                  ? `<td>
                      <div>${escapeHtml(item.alunoNome)}</div>
                      <small>${escapeHtml(item.curso)}</small>
                    </td>`
                  : ""
              }
              <td>${escapeHtml(MODALIDADE_LABELS[item.modalidade] || item.modalidade)}</td>
              <td>
                <div>${escapeHtml(item.concedente)}</div>
                ${
                  item.pendenciaAtual
                    ? `<small class="alert-error">Pendência: ${escapeHtml(item.pendenciaAtual)}</small>`
                    : ""
                }
              </td>
              <td><span class="badge-demo">${escapeHtml(formatarStatus(item.status))}</span></td>
              <td>${escapeHtml(formatarDataHora(item.enviadaEm || item.criadaEm))}</td>
              <td>
                <button
                  type="button"
                  class="btn btn-primary btn-abrir-detalhe"
                  data-id="${escapeHtml(item.id)}"
                >
                  Abrir dossiê
                </button>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

    listaEl.querySelectorAll(".btn-abrir-detalhe").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        navegarPara("detalhe", { solicitacaoId: id });
      });
    });
  }

  container.querySelector("#form-filtros").addEventListener("submit", (event) => {
    event.preventDefault();
    filtrosAtuais.status = statusSelect.value;
    filtrosAtuais.curso = container.querySelector("#filtro-curso")?.value.trim() || "";
    filtrosAtuais.busca = container.querySelector("#filtro-busca")?.value.trim() || "";
    atualizarTabela();
  });

  await atualizarTabela();
}