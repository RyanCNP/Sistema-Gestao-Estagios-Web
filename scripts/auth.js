const SESSION_KEY = "estagios_demo_session_v1";

export const PERFIS = Object.freeze({
  ALUNO: "ALUNO",
  SECRETARIA: "SECRETARIA",
  PROFESSOR: "PROFESSOR",
  COORDENACAO: "COORDENACAO",
  DIRECAO: "DIRECAO",
  ADMIN: "ADMIN",
});

export const PERFIL_LABELS = Object.freeze({
  [PERFIS.ALUNO]: "Aluno",
  [PERFIS.SECRETARIA]: "Secretaria / Setor de Estágios",
  [PERFIS.PROFESSOR]: "Professor responsável",
  [PERFIS.COORDENACAO]: "Coordenação",
  [PERFIS.DIRECAO]: "Direção",
  [PERFIS.ADMIN]: "Administrador técnico",
});

export const USUARIOS_DEMO = [
  {
    id: "usr-aluno-1",
    nome: "Lucas Mendes (Exemplo)",
    email: "aluno.exemplo@fatec.demo",
    perfil: PERFIS.ALUNO,
    matricula: "20261001",
    curso: "Desenvolvimento de Software Multiplataforma",
    situacaoMatricula: "REGULAR",
  },
  {
    id: "usr-sec-1",
    nome: "Carla Souza (Exemplo)",
    email: "secretaria.exemplo@fatec.demo",
    perfil: PERFIS.SECRETARIA,
  },
  {
    id: "usr-prof-1",
    nome: "Prof. Marcos Lima (Exemplo)",
    email: "professor.exemplo@fatec.demo",
    perfil: PERFIS.PROFESSOR,
  },
  {
    id: "usr-coord-1",
    nome: "Profª. Ana Paula Costa (Exemplo)",
    email: "coordenacao.exemplo@fatec.demo",
    perfil: PERFIS.COORDENACAO,
  },
  {
    id: "usr-dir-1",
    nome: "Diretoria da Unidade (Exemplo)",
    email: "direcao.exemplo@fatec.demo",
    perfil: PERFIS.DIRECAO,
  },
  {
    id: "usr-admin-1",
    nome: "Admin Técnico (Exemplo)",
    email: "admin.exemplo@fatec.demo",
    perfil: PERFIS.ADMIN,
  },
];

export function getSessao() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.usuario || !parsed.usuario.perfil) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isAutenticado() {
  return Boolean(getSessao());
}

export function loginComCredenciais(email, senha) {
  const emailLimpo = String(email || "").trim().toLowerCase();
  const senhaLimpa = String(senha || "").trim();

  if (!emailLimpo || !senhaLimpa) {
    return { ok: false, mensagem: "Informe e-mail e senha de demonstração." };
  }

  const encontrado = USUARIOS_DEMO.find(
    (u) => u.email.toLowerCase() === emailLimpo
  );

  if (!encontrado || senhaLimpa !== "123456") {
    return {
      ok: false,
      mensagem: "Credenciais inválidas. Verifique o usuário ou use uma conta de exemplo.",
    };
  }

  const sessao = {
    token: `demo-token-${encontrado.id}`,
    loginEm: new Date().toISOString(),
    usuario: encontrado,
  };

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessao));
  return { ok: true, sessao };
}

export function loginRapidoPorPerfil(perfil) {
  const usuario = USUARIOS_DEMO.find((u) => u.perfil === perfil);
  if (!usuario) {
    return { ok: false, mensagem: "Perfil de demonstração não encontrado." };
  }

  const sessao = {
    token: `demo-token-${usuario.id}`,
    loginEm: new Date().toISOString(),
    usuario,
  };

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessao));
  return { ok: true, sessao };
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function temPerfil(perfisPermitidos = []) {
  const sessao = getSessao();
  if (!sessao) return false;
  if (!Array.isArray(perfisPermitidos) || perfisPermitidos.length === 0) return true;
  return perfisPermitidos.includes(sessao.usuario.perfil);
}

const USERS_STORAGE_KEY = "estagios_demo_usuarios_v1";

function carregarUsuariosDemo() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(USUARIOS_DEMO));
      return [...USUARIOS_DEMO];
    }
    return JSON.parse(raw);
  } catch {
    return [...USUARIOS_DEMO];
  }
}

function persistirUsuariosDemo(lista) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(lista));
}

export function listarUsuariosDemo() {
  return carregarUsuariosDemo();
}

export function criarUsuarioDemo(dados) {
  const nome = String(dados.nome || "").trim();
  const email = String(dados.email || "").trim().toLowerCase();
  const perfil = dados.perfil || PERFIS.ALUNO;

  if (!nome || !email) {
    return { ok: false, mensagem: "Informe nome e e-mail institucional de exemplo." };
  }

  const lista = carregarUsuariosDemo();
  const jaExiste = lista.some((u) => u.email.toLowerCase() === email);
  if (jaExiste) {
    return { ok: false, mensagem: "Já existe um usuário de demonstração com este e-mail." };
  }

  const novoUsuario = {
    id: `usr-${perfil.toLowerCase()}-${Date.now()}`,
    nome,
    email,
    perfil,
    matricula: perfil === PERFIS.ALUNO ? String(dados.matricula || "").trim() || "20269999" : undefined,
    curso: perfil === PERFIS.ALUNO ? String(dados.curso || "").trim() || "Desenvolvimento de Software Multiplataforma" : undefined,
    situacaoMatricula: perfil === PERFIS.ALUNO ? (dados.situacaoMatricula || "REGULAR") : undefined,
  };

  lista.push(novoUsuario);
  persistirUsuariosDemo(lista);
  return { ok: true, usuario: novoUsuario };
}

export function alternarSituacaoMatriculaDemo(usuarioId) {
  const lista = carregarUsuariosDemo();
  const idx = lista.findIndex((u) => u.id === usuarioId);
  if (idx < 0) {
    return { ok: false, mensagem: "Usuário não encontrado." };
  }

  const atual = lista[idx];
  if (atual.perfil !== PERFIS.ALUNO) {
    return { ok: false, mensagem: "A situação de matrícula aplica-se apenas a contas de Aluno." };
  }

  const proximaSituacao = atual.situacaoMatricula === "REGULAR" ? "IRREGULAR" : "REGULAR";
  lista[idx] = { ...atual, situacaoMatricula: proximaSituacao };
  persistirUsuariosDemo(lista);

  // Se o próprio usuário logado for esse aluno, atualiza a sessão ativa
  const sessaoAtual = getSessao();
  if (sessaoAtual && sessaoAtual.usuario.id === usuarioId) {
    const novaSessao = { ...sessaoAtual, usuario: lista[idx] };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(novaSessao));
  }

  return { ok: true, usuario: lista[idx] };
}