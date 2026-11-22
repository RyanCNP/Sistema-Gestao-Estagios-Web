import {
  alternarSituacaoMatriculaDemo,
  atualizarParametroCursoDemo,
  criarContaDemo,
  listarContasDemo,
  listarCursosParametros,
} from "../scripts/api.js";
import { PERFIS, PERFIL_LABELS } from "../scripts/auth.js";
import { escapeHtml } from "../scripts/utils.js";

export async function renderAdmin(
  container,
  { sessao, navegarPara, mostrarAlerta, limparAlerta }
) {
  const usuario = sessao.usuario;

  if (![PERFIS.SECRETARIA, PERFIS.ADMIN].includes(usuario.perfil)) {
    mostrarAlerta?.("Acesso restrito à Secretaria e ao Administrador técnico.", "error");
    return navegarPara("painel");
  }

  async function renderizarConteudo() {
    const resContas = await listarContasDemo(usuario);
    const resCursos = await listarCursosParametros(usuario);

    if (!resContas.ok || !resCursos.ok) {
      mostrarAlerta?.(resContas.mensagem || resCursos.mensagem, "error");
      return navegarPara("painel");
    }

    const contas = resContas.contas;
    const cursos = resCursos.cursos;

    container.innerHTML = `
      <section class="card" aria-labelledby="admin-title">
        <div class="card-header">
          <div>
            <h1 id="admin-title">Cadastros, Perfis e Parâmetros</h1>
            <p>
              Gestão de contas fictícias de demonstração, situação de matrícula e parâmetros por curso.
            </p>
          </div>
          <button type="button" id="btn-voltar-painel" class="btn btn-outline">
            Voltar ao Início
          </button>
        </div>
      </section>

      <section class="card" aria-labelledby="nova-conta-title">
        <h2 id="nova-conta-title">Cadastrar Conta Demonstrativa</h2>
        <form id="form-nova-conta" novalidate>
          <div class="form-group">
            <label for="cad-nome">Nome completo (fictício)</label>
            <input id="cad-nome" type="text" placeholder="Ex.: Beatriz Almeida" required />
          </div>

          <div class="form-group">
            <label for="cad-email">E-mail de acesso</label>
            <input id="cad-email" type="email" placeholder="beatriz.exemplo@fatec.demo" required />
          </div>

          <div class="form-group">
            <label for="cad-perfil">Perfil</label>
            <select id="cad-perfil">
              <option value="ALUNO">Aluno</option>
              <option value="SECRETARIA">Secretaria / Setor de Estágios</option>
              <option value="PROFESSOR">Professor responsável</option>
              <option value="COORDENACAO">Coordenação</option>
              <option value="DIRECAO">Direção</option>
              <option value="ADMIN">Administrador técnico</option>
            </select>
          </div>

          <div id="campos-aluno">
            <div class="form-group">
              <label for="cad-matricula">Matrícula (RA fictício)</label>
              <input id="cad-matricula" type="text" placeholder="Ex.: 20261099" />
            </div>

            <div class="form-group">
              <label for="cad-curso">Curso</label>
              <select id="cad-curso">
                ${cursos
                  .map(
                    (c) =>
                      `<option value="${escapeHtml(c.nome)}">${escapeHtml(c.nome)}</option>`
                  )
                  .join("")}
              </select>
            </div>

            <div class="form-group">
              <label for="cad-situacao">Situação inicial da matrícula</label>
              <select id="cad-situacao">
                <option value="REGULAR">REGULAR</option>
                <option value="IRREGULAR">IRREGULAR</option>
              </select>
            </div>
          </div>

          <button type="submit" class="btn btn-primary">Salvar Conta</button>
        </form>
      </section>

      <section class="card" aria-labelledby="contas-lista-title">
        <h2 id="contas-lista-title">Contas Cadastradas (Simulação Local)</h2>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Matrícula / Curso</th>
                <th>Situação</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              ${contas
                .map(
                  (c) => `
                <tr>
                  <td><strong>${escapeHtml(c.nome)}</strong></td>
                  <td>${escapeHtml(c.email)}</td>
                  <td>${escapeHtml(PERFIL_LABELS[c.perfil] || c.perfil)}</td>
                  <td>
                    ${
                      c.perfil === PERFIS.ALUNO
                        ? `${escapeHtml(c.matricula || "—")} — <small>${escapeHtml(c.curso || "—")}</small>`
                        : "—"
                    }
                  </td>
                  <td>
                    ${
                      c.perfil === PERFIS.ALUNO
                        ? `<span class="badge-demo">${escapeHtml(c.situacaoMatricula || "REGULAR")}</span>`
                        : "Ativo"
                    }
                  </td>
                  <td>
                    ${
                      c.perfil === PERFIS.ALUNO
                        ? `<button
                            type="button"
                            class="btn btn-outline btn-toggle-mat"
                            data-id="${escapeHtml(c.id)}"
                          >
                            Alternar Matrícula
                          </button>`
                        : "—"
                    }
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>

      <section class="card" aria-labelledby="cursos-param-title">
        <h2 id="cursos-param-title">Parâmetros por Curso (PPC Demonstrativo)</h2>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Curso</th>
                <th>Carga Horária de Estágio</th>
                <th>Equiparação no PPC</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              ${cursos
                .map(
                  (cur) => `
                <tr>
                  <td><strong>${escapeHtml(cur.nome)}</strong></td>
                  <td>${escapeHtml(cur.cargaHorariaEstagio)}h</td>
                  <td>
                    <span class="badge-demo">${cur.permiteEquiparacao ? "Permitida" : "Não prevista"}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      class="btn btn-outline btn-toggle-ppc"
                      data-id="${escapeHtml(cur.id)}"
                      data-permite="${cur.permiteEquiparacao ? "true" : "false"}"
                    >
                      ${cur.permiteEquiparacao ? "Marcar Não Prevista" : "Marcar Permitida"}
                    </button>
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;

    const perfilSelect = container.querySelector("#cad-perfil");
    const camposAluno = container.querySelector("#campos-aluno");

    function sincronizarCamposAluno() {
      camposAluno.hidden = perfilSelect.value !== PERFIS.ALUNO;
    }

    sincronizarCamposAluno();
    perfilSelect.addEventListener("change", sincronizarCamposAluno);

    container.querySelector("#btn-voltar-painel")?.addEventListener("click", () => {
      navegarPara("painel");
    });

    container.querySelector("#form-nova-conta")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      limparAlerta?.();

      const res = await criarContaDemo(usuario, {
        nome: container.querySelector("#cad-nome").value,
        email: container.querySelector("#cad-email").value,
        perfil: perfilSelect.value,
        matricula: container.querySelector("#cad-matricula")?.value,
        curso: container.querySelector("#cad-curso")?.value,
        situacaoMatricula: container.querySelector("#cad-situacao")?.value,
      });

      if (!res.ok) {
        mostrarAlerta?.(res.mensagem, "error");
        return;
      }

      mostrarAlerta?.(`Conta "${res.conta.nome}" cadastrada no ambiente local.`, "success");
      await renderizarConteudo();
    });

    container.querySelectorAll(".btn-toggle-mat").forEach((btn) => {
      btn.addEventListener("click", async () => {
        limparAlerta?.();
        const id = btn.getAttribute("data-id");
        const res = await alternarSituacaoMatriculaDemo(usuario, id);
        if (!res.ok) {
          mostrarAlerta?.(res.mensagem, "error");
          return;
        }
        mostrarAlerta?.(
          `Situação de matrícula atualizada para ${res.conta.situacaoMatricula}.`,
          "success"
        );
        await renderizarConteudo();
      });
    });

    container.querySelectorAll(".btn-toggle-ppc").forEach((btn) => {
      btn.addEventListener("click", async () => {
        limparAlerta?.();
        const id = btn.getAttribute("data-id");
        const atual = btn.getAttribute("data-permite") === "true";
        const res = await atualizarParametroCursoDemo(usuario, id, !atual);
        if (!res.ok) {
          mostrarAlerta?.(res.mensagem, "error");
          return;
        }
        mostrarAlerta?.(
          `Parâmetro de equiparação do curso "${res.curso.nome}" atualizado.`,
          "success"
        );
        await renderizarConteudo();
      });
    });
  }

  await renderizarConteudo();
}