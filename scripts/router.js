import {
  getSessao,
  isAutenticado,
  logout,
  PERFIL_LABELS,
  temPerfil,
} from "../scripts/auth.js";

import { limparAlerta, mostrarAlerta } from "./utils.js";

import { renderLogin } from "../screens/login.js";
import { renderPainel } from "../screens/painel.js";
import { renderSolicitacao } from "../screens/solicitacao.js";
import { renderDetalhe } from "../screens/detalhe.js";
import { renderAdmin } from "../screens/admin.js";

const ROTAS = Object.freeze({
  login: {
    publica: true,
    perfis: [],
    render: renderLogin,
  },
  painel: {
    publica: false,
    perfis: [],
    render: renderPainel,
  },
  solicitacao: {
    publica: false,
    perfis: ["ALUNO"],
    render: renderSolicitacao,
  },
  detalhe: {
    publica: false,
    perfis: [],
    render: renderDetalhe,
  },
  admin: {
    publica: false,
    perfis: ["SECRETARIA", "ADMIN"],
    render: renderAdmin,
  },
});

function atualizarCabecalho(rotaAtual) {
  const header = document.getElementById("app-header");
  const nameEl = document.getElementById("session-user-name");
  const roleEl = document.getElementById("session-user-role");
  const navButtons = document.querySelectorAll("#main-nav .nav-btn");

  const sessao = getSessao();
  if (!sessao) {
    if (header) header.hidden = true;
    return;
  }

  if (header) header.hidden = false;
  if (nameEl) nameEl.textContent = sessao.usuario.nome;
  if (roleEl) {
    roleEl.textContent = PERFIL_LABELS[sessao.usuario.perfil] || sessao.usuario.perfil;
  }

  navButtons.forEach((btn) => {
    const rotaBtn = btn.getAttribute("data-route");
    const rolesAttr = btn.getAttribute("data-roles");
    const permitidos = rolesAttr
      ? rolesAttr.split(",").map((r) => r.trim()).filter(Boolean)
      : [];

    btn.hidden = !temPerfil(permitidos);
    if (rotaBtn === rotaAtual) {
      btn.setAttribute("aria-current", "page");
    } else {
      btn.removeAttribute("aria-current");
    }
  });
}

export async function navegarPara(nomeRota, params = {}) {
  const appEl = document.getElementById("app");
  if (!appEl) return;

  limparAlerta();

  if (!isAutenticado()) {
    atualizarCabecalho("login");
    window.location.hash = "#/login";
    await ROTAS.login.render(appEl, {
      onLoginSuccess: () => navegarPara("painel"),
    });
    appEl.focus();
    return;
  }

  const alvo = ROTAS[nomeRota] && !ROTAS[nomeRota].publica ? nomeRota : "painel";
  const configRota = ROTAS[alvo];

  if (!temPerfil(configRota.perfis)) {
    mostrarAlerta("Seu perfil não tem permissão para acessar esta tela.", "error");
    return navegarPara("painel");
  }

  atualizarCabecalho(alvo);
  window.location.hash = `#/${alvo}`;

  await configRota.render(appEl, {
    params,
    sessao: getSessao(),
    navegarPara,
    mostrarAlerta,
    limparAlerta,
  });

  appEl.focus();
}

function resolverRotaDoHash() {
  const hash = window.location.hash || "";
  const limpa = hash.replace(/^#\/?/, "").split("?")[0];
  return ROTAS[limpa] ? limpa : "painel";
}

function inicializarEventosGlobais() {
  document.querySelectorAll("#main-nav .nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const rota = btn.getAttribute("data-route");
      if (rota) navegarPara(rota);
    });
  });

  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      logout();
      navegarPara("login");
      mostrarAlerta("Sessão encerrada.", "success");
    });
  }

  window.addEventListener("hashchange", () => {
    if (!isAutenticado()) {
      navegarPara("login");
      return;
    }
    navegarPara(resolverRotaDoHash());
  });
}

document.addEventListener("DOMContentLoaded", () => {
  inicializarEventosGlobais();
  if (!isAutenticado()) {
    navegarPara("login");
  } else {
    navegarPara(resolverRotaDoHash());
  }
});