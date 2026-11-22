import {
  listarCursos,
  obterSolicitacaoPorId,
  salvarSolicitacao,
} from "../scripts/api.js";
import { escapeHtml } from "../scripts/utils.js";

export async function renderSolicitacao(
  container,
  { params, sessao, navegarPara, mostrarAlerta, limparAlerta }
) {
  const usuario = sessao.usuario;
  const cursos = await listarCursos();

  let existente = null;
  if (params?.solicitacaoId) {
    const resp = await obterSolicitacaoPorId(params.solicitacaoId, usuario);
    if (!resp.ok) {
      mostrarAlerta?.(resp.mensagem, "error");
      return navegarPara("painel");
    }
    existente = resp.solicitacao;
  }

  const docsIniciais = Array.isArray(existente?.documentos)
    ? [...existente.documentos]
    : [];

  let documentosSelecionados = docsIniciais;

  container.innerHTML = `
    <section class="card" aria-labelledby="solicitacao-title">
      <div class="card-header">
        <div>
          <h1 id="solicitacao-title">
            ${
              existente
                ? `Editar Solicitação ${escapeHtml(existente.id)}`
                : "Nova Solicitação de Estágio"
            }
          </h1>
          <p>
            Preencha os dados da modalidade, plano de atividades (PAE) e anexos de exemplo.
          </p>
        </div>
        <button type="button" id="btn-voltar-painel" class="btn btn-outline">
          Voltar ao Painel
        </button>
      </div>

      ${
        existente?.pendenciaAtual
          ? `<div class="alert alert-warning" role="alert">
              <strong>Pendência apontada para correção:</strong> ${escapeHtml(existente.pendenciaAtual)}
            </div>`
          : ""
      }

      ${
        usuario.situacaoMatricula && usuario.situacaoMatricula !== "REGULAR"
          ? `<div class="alert alert-error" role="alert">
              <strong>Atenção:</strong> Matrícula em situação <strong>${escapeHtml(usuario.situacaoMatricula)}</strong>. O envio de Estágio Regular será bloqueado até regularização.
            </div>`
          : ""
      }

      <form id="form-solicitacao" novalidate>
        <div class="form-group">
          <label for="sol-curso">Curso</label>
          <select id="sol-curso" name="cursoId" required>
            ${cursos
              .map(
                (c) => `
              <option
                value="${escapeHtml(c.id)}"
                ${
                  (existente?.cursoId || "cur-dsm") === c.id ? "selected" : ""
                }
              >
                ${escapeHtml(c.nome)} (${c.cargaHorariaEstagio}h | Equiparação no PPC: ${
                  c.permiteEquiparacao ? "Sim" : "Não"
                })
              </option>
            `
              )
              .join("")}
          </select>
        </div>

        <div class="form-group">
          <label for="sol-modalidade">Modalidade</label>
          <select id="sol-modalidade" name="modalidade" required>
            <option value="ESTAGIO_REGULAR" ${
              existente?.modalidade === "ESTAGIO_REGULAR" ? "selected" : ""
            }>
              Estágio Regular
            </option>
            <option value="EQUIVALENCIA" ${
              existente?.modalidade === "EQUIVALENCIA" ? "selected" : ""
            }>
              Equivalência (experiência profissional)
            </option>
            <option value="EQUIPARACAO" ${
              existente?.modalidade === "EQUIPARACAO" ? "selected" : ""
            }>
              Equiparação (atividades acadêmicas no PPC)
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="sol-concedente">Empresa Concedente / Instituição / Atividade (Exemplo)</label>
          <input
            id="sol-concedente"
            name="concedente"
            type="text"
            value="${escapeHtml(existente?.concedente || "")}"
            placeholder="Ex.: Empresa Modelo Ltda (Exemplo)"
            required
          />
        </div>

        <div class="form-group">
          <label for="sol-inicio">Data de início prevista</label>
          <input
            id="sol-inicio"
            name="periodoInicio"
            type="date"
            value="${escapeHtml(existente?.periodoInicio || "2026-12-01")}"
            required
          />
        </div>

        <div class="form-group">
          <label for="sol-fim">Data de término prevista</label>
          <input
            id="sol-fim"
            name="periodoFim"
            type="date"
            value="${escapeHtml(existente?.periodoFim || "2027-05-31")}"
            required
          />
        </div>

        <div class="form-group">
          <label for="sol-horas">Carga horária prevista / a reconhecer (horas)</label>
          <input
            id="sol-horas"
            name="horasPrevistas"
            type="number"
            min="1"
            max="1000"
            value="${escapeHtml(existente?.horasPrevistas ?? 240)}"
            required
          />
        </div>

        <div id="grupo-seguro" class="form-group">
          <label for="sol-seguro">Seguro contra acidentes pessoais (registro demonstrativo)</label>
          <input
            id="sol-seguro"
            name="seguroInfo"
            type="text"
            value="${escapeHtml(existente?.seguroInfo || "")}"
            placeholder="Ex.: Apólice demonstrativa / conferência pela Secretaria"
          />
        </div>

        <fieldset class="card">
          <legend><strong>Plano de Atividades (PAE) / Descrição Técnica</strong></legend>

          <div class="form-group">
            <label for="pae-descricao">Descrição das atividades a desenvolver</label>
            <textarea
              id="pae-descricao"
              name="descricao"
              rows="3"
              required
            >${escapeHtml(existente?.pae?.descricao || "")}</textarea>
          </div>

          <div class="form-group">
            <label for="pae-tecnicas">Técnicas, ferramentas ou metodologias</label>
            <textarea
              id="pae-tecnicas"
              name="tecnicas"
              rows="2"
              required
            >${escapeHtml(existente?.pae?.tecnicas || "")}</textarea>
          </div>

          <div class="form-group">
            <label for="pae-compatibilidade">Compatibilidade com o curso e cronograma</label>
            <textarea
              id="pae-compatibilidade"
              name="compatibilidade"
              rows="2"
              required
            >${escapeHtml(existente?.pae?.compatibilidade || "")}</textarea>
          </div>
        </fieldset>

        <fieldset class="card">
          <legend><strong>Documentos anexados (arquivos fictícios de exemplo)</strong></legend>

          <div class="form-group">
            <label for="doc-tipo">Tipo de documento</label>
            <select id="doc-tipo">
              <option value="TCE">TCE (Exemplo)</option>
              <option value="PAE">PAE (Exemplo)</option>
              <option value="COMPROVANTE_VINCULO">Comprovante de Vínculo / Atividade (Exemplo)</option>
              <option value="RELATORIO_ORIENTADOR">Documento do Orientador / PPC (Exemplo)</option>
              <option value="OUTRO">Outro Comprovante (Exemplo)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="doc-arquivo">Selecionar arquivo fictício (.pdf, .png, .jpg)</label>
            <input
              id="doc-arquivo"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
            />
          </div>

          <button type="button" id="btn-anexar-doc" class="btn btn-outline">
            Adicionar documento à solicitação
          </button>

          <ul id="lista-documentos"></ul>
        </fieldset>

        <div class="card-header">
          <button type="button" id="btn-salvar-rascunho" class="btn btn-outline">
            Salvar Rascunho
          </button>
          <button type="submit" id="btn-enviar-solicitacao" class="btn btn-primary">
            ${
              existente?.status === "AGUARDANDO_CORRECAO"
                ? "Reenviar Correção"
                : "Enviar Solicitação"
            }
          </button>
        </div>
      </form>
    </section>
  `;

  const form = container.querySelector("#form-solicitacao");
  const modalidadeSelect = container.querySelector("#sol-modalidade");
  const grupoSeguro = container.querySelector("#grupo-seguro");
  const listaDocsEl = container.querySelector("#lista-documentos");

  function sincronizarCamposModalidade() {
    const isRegular = modalidadeSelect.value === "ESTAGIO_REGULAR";
    grupoSeguro.hidden = !isRegular;
  }

  function renderListaDocumentos() {
    if (!documentosSelecionados.length) {
      listaDocsEl.innerHTML = `<li>Nenhum documento anexado até o momento.</li>`;
      return;
    }

    listaDocsEl.innerHTML = documentosSelecionados
      .map(
        (doc, idx) => `
      <li>
        <strong>[${escapeHtml(doc.tipo)}]</strong> ${escapeHtml(doc.nome)}
        <button type="button" class="btn btn-outline btn-remover-doc" data-idx="${idx}">
          Remover
        </button>
      </li>
    `
      )
      .join("");

    listaDocsEl.querySelectorAll(".btn-remover-doc").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-idx"));
        documentosSelecionados.splice(idx, 1);
        renderListaDocumentos();
      });
    });
  }

  sincronizarCamposModalidade();
  renderListaDocumentos();

  modalidadeSelect.addEventListener("change", sincronizarCamposModalidade);

  container.querySelector("#btn-voltar-painel").addEventListener("click", () => {
    navegarPara("painel");
  });

  container.querySelector("#btn-anexar-doc").addEventListener("click", () => {
    limparAlerta?.();
    const tipo = container.querySelector("#doc-tipo").value;
    const inputFile = container.querySelector("#doc-arquivo");
    const arquivoReal = inputFile.files?.[0];

    const nomeArquivo = arquivoReal
      ? arquivoReal.name
      : `${tipo}_Exemplo_${documentosSelecionados.length + 1}.pdf`;

    const extensaoValida = /\.(pdf|png|jpg|jpeg)$/i.test(nomeArquivo);
    if (!extensaoValida) {
      mostrarAlerta?.("Formato inválido. Utilize apenas arquivos PDF, PNG ou JPG.", "error");
      return;
    }

    documentosSelecionados.push({ nome: nomeArquivo, tipo });
    inputFile.value = "";
    renderListaDocumentos();
    mostrarAlerta?.(`Documento "${nomeArquivo}" anexado (exemplo).`, "success");
  });

  function coletarPayload() {
    return {
      id: existente?.id || null,
      cursoId: container.querySelector("#sol-curso").value,
      modalidade: modalidadeSelect.value,
      concedente: container.querySelector("#sol-concedente").value.trim(),
      periodoInicio: container.querySelector("#sol-inicio").value,
      periodoFim: container.querySelector("#sol-fim").value,
      horasPrevistas: container.querySelector("#sol-horas").value,
      seguroInfo: container.querySelector("#sol-seguro").value.trim(),
      pae: {
        descricao: container.querySelector("#pae-descricao").value.trim(),
        tecnicas: container.querySelector("#pae-tecnicas").value.trim(),
        compatibilidade: container.querySelector("#pae-compatibilidade").value.trim(),
      },
      documentos: [...documentosSelecionados],
    };
  }

  async function processarSalvamento(enviar) {
    limparAlerta?.();
    const payload = coletarPayload();
    const res = await salvarSolicitacao(payload, usuario, { enviar });

    if (!res.ok) {
      mostrarAlerta?.(res.mensagem, "error");
      return;
    }

    mostrarAlerta?.(
      enviar
        ? `Solicitação ${res.solicitacao.id} enviada com sucesso.`
        : `Rascunho ${res.solicitacao.id} salvo.`,
      "success"
    );
    navegarPara("detalhe", { solicitacaoId: res.solicitacao.id });
  }

  container.querySelector("#btn-salvar-rascunho").addEventListener("click", () => {
    processarSalvamento(false);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    processarSalvamento(true);
  });
}