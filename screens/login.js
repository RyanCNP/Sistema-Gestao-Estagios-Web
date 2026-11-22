import { loginComCredenciais } from "../scripts/auth.js";

export async function renderLogin(container, { onLoginSuccess, mostrarAlerta, limparAlerta }) {
  container.innerHTML = `
    <section class="card" aria-labelledby="login-title">
      <div class="card-header">
        <div>
          <h1 id="login-title">Acesso ao Sistema de Estágios</h1>
          <p>Autenticação obrigatória para acessar o ambiente demonstrativo.</p>
        </div>
        <span class="badge-demo">Ambiente Demonstrativo</span>
      </div>

      <form id="form-login" novalidate>
        <div class="form-group">
          <label for="login-email">E-mail institucional</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autocomplete="username"
            placeholder="*fulano@aluno.cps.sp.gov.br"
            required
          />
        </div>

        <div class="form-group">
          <label for="login-senha">Senha</label>
          <input
            id="login-senha"
            name="senha"
            type="password"
            autocomplete="current-password"
            placeholder="*Digite sua senha"
            required
          />
        </div>

        <button type="submit" class="btn btn-primary">
          Entrar
        </button>
      </form>
    </section>
  `;

  const form = container.querySelector("#form-login");
  const emailInput = container.querySelector("#login-email");
  const senhaInput = container.querySelector("#login-senha");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    limparAlerta?.();

    const resultado = loginComCredenciais(emailInput.value, senhaInput.value);
    if (!resultado.ok) {
      mostrarAlerta?.(resultado.mensagem, "error");
      return;
    }

    mostrarAlerta?.(`Bem-vindo, ${resultado.sessao.usuario.nome}.`, "success");
    onLoginSuccess?.(resultado.sessao);
  });
}