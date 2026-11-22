import { PERFIS, PERFIL_LABELS, USUARIOS_DEMO } from "../auth.js";
import { CURSOS_DEMO } from "./api-seed.js";

const CONTAS_KEY = "estagios_demo_contas_v1";
const CURSOS_KEY = "estagios_demo_cursos_v1";

function carregarContas() {
  try {
    const raw = localStorage.getItem(CONTAS_KEY);
    if (!raw) {
      localStorage.setItem(CONTAS_KEY, JSON.stringify(USUARIOS_DEMO));
      return [...USUARIOS_DEMO];
    }
    return JSON.parse(raw);
  } catch {
    return [...USUARIOS_DEMO];
  }
}

function persistirContas(lista) {
  localStorage.setItem(CONTAS_KEY, JSON.stringify(lista));
}

function carregarCursosConfig() {
  try {
    const raw = localStorage.getItem(CURSOS_KEY);
    if (!raw) {
      localStorage.setItem(CURSOS_KEY, JSON.stringify(CURSOS_DEMO));
      return [...CURSOS_DEMO];
    }
    return JSON.parse(raw);
  } catch {
    return [...CURSOS_DEMO];
  }
}

function persistirCursosConfig(lista) {
  localStorage.setItem(CURSOS_KEY, JSON.stringify(lista));
}

function podeGerenciarCadastros(usuario) {
  return Boolean(usuario && [PERFIS.SECRETARIA, PERFIS.ADMIN].includes(usuario.perfil));
}

export async function listarContasDemo(usuario) {
  if (!podeGerenciarCadastros(usuario)) {
    return { ok: false, mensagem: "Acesso negado para gerenciar contas." };
  }
  return { ok: true, contas: carregarContas() };
}

export async function criarContaDemo(usuario, dados) {
  if (!podeGerenciarCadastros(usuario)) {
    return { ok: false, mensagem: "Acesso negado: apenas Secretaria ou Administrador técnico podem cadastrar contas." };
  }

  const nome = String(dados.nome || "").trim();
  const email = String(dados.email || "").trim().toLowerCase();
  const perfil = dados.perfil || PERFIS.ALUNO;
  const matricula = String(dados.matricula || "").trim();
  const curso = String(dados.curso || "").trim();
  const situacaoMatricula = dados.situacaoMatricula === "IRREGULAR" ? "IRREGULAR" : "REGULAR";

  if (!nome || !email || !PERFIL_LABELS[perfil]) {
    return { ok: false, mensagem: "Informe nome, e-mail válido e perfil." };
  }

  if (perfil === PERFIS.ALUNO && !matricula) {
    return { ok: false, mensagem: "Informe a matrícula fictícia para o perfil Aluno." };
  }

  const contas = carregarContas();
  if (contas.some((c) => c.email.toLowerCase() === email)) {
    return { ok: false, mensagem: "Já existe uma conta cadastrada com este e-mail." };
  }

  const novaConta = {
    id: `usr-demo-${Date.now()}`,
    nome: nome.includes("(Exemplo)") ? nome : `${nome} (Exemplo)`,
    email,
    perfil,
    ...(perfil === PERFIS.ALUNO
      ? {
          matricula,
          curso: curso || "Desenvolvimento de Software Multiplataforma",
          situacaoMatricula,
        }
      : {}),
  };

  contas.push(novaConta);
  persistirContas(contas);
  return { ok: true, conta: novaConta };
}

export async function alternarSituacaoMatriculaDemo(usuario, contaId) {
  if (!podeGerenciarCadastros(usuario)) {
    return { ok: false, mensagem: "Acesso negado para alterar situação de matrícula." };
  }

  const contas = carregarContas();
  const idx = contas.findIndex((c) => c.id === contaId);
  if (idx < 0) {
    return { ok: false, mensagem: "Conta não encontrada." };
  }

  const atual = contas[idx];
  if (atual.perfil !== PERFIS.ALUNO) {
    return { ok: false, mensagem: "Apenas contas de aluno possuem situação de matrícula." };
  }

  const novaSituacao = atual.situacaoMatricula === "REGULAR" ? "IRREGULAR" : "REGULAR";
  contas[idx] = { ...atual, situacaoMatricula: novaSituacao };
  persistirContas(contas);
  return { ok: true, conta: contas[idx] };
}

export async function listarCursosParametros(usuario) {
  if (!podeGerenciarCadastros(usuario)) {
    return { ok: false, mensagem: "Acesso negado." };
  }
  return { ok: true, cursos: carregarCursosConfig() };
}

export async function atualizarParametroCursoDemo(usuario, cursoId, permiteEquiparacao) {
  if (!podeGerenciarCadastros(usuario)) {
    return { ok: false, mensagem: "Acesso negado para alterar parâmetros de curso." };
  }

  const cursos = carregarCursosConfig();
  const idx = cursos.findIndex((c) => c.id === cursoId);
  if (idx < 0) {
    return { ok: false, mensagem: "Curso não encontrado." };
  }

  cursos[idx] = {
    ...cursos[idx],
    permiteEquiparacao: Boolean(permiteEquiparacao),
  };
  persistirCursosConfig(cursos);
  return { ok: true, curso: cursos[idx] };
}