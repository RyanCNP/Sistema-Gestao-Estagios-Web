export const STORAGE_KEY = "estagios_demo_solicitacoes_v1";

export const CURSOS_DEMO = Object.freeze([
  {
    id: "cur-dsm",
    nome: "Desenvolvimento de Software Multiplataforma",
    cargaHorariaEstagio: 240,
    permiteEquiparacao: true,
  },
  {
    id: "cur-ge",
    nome: "Gestão Empresarial",
    cargaHorariaEstagio: 240,
    permiteEquiparacao: false,
  },
]);

export const SEED_SOLICITACOES = [
  {
    id: "SOL-2026-001",
    alunoId: "usr-aluno-1",
    alunoNome: "Lucas Mendes (Exemplo)",
    matricula: "20261001",
    situacaoMatricula: "REGULAR",
    cursoId: "cur-dsm",
    curso: "Desenvolvimento de Software Multiplataforma",
    modalidade: "ESTAGIO_REGULAR",
    concedente: "TechVotorantim Sistemas Ltda (Exemplo)",
    periodoInicio: "2026-12-01",
    periodoFim: "2027-05-31",
    horasPrevistas: 240,
    horasCumpridas: 0,
    seguroInfo: "Apólice demonstrativa #DEMO-SEG-01 (conferência pela Secretaria)",
    pae: {
      descricao: "Desenvolvimento e manutenção de módulos web e APIs supervisionados.",
      tecnicas: "TypeScript, Node.js, testes unitários e controle de versão com Git.",
      compatibilidade: "Alinhado às disciplinas de Engenharia de Software e Banco de Dados.",
    },
    documentos: [
      { nome: "TCE_Exemplo_Assinaturas_Previas.pdf", tipo: "TCE" },
      { nome: "PAE_Exemplo_Plano_Atividades.pdf", tipo: "PAE" },
    ],
    status: "EM_CONFERENCIA",
    criadaEm: "2026-11-10T09:30:00Z",
    enviadaEm: "2026-11-10T10:15:00Z",
    pendenciaAtual: null,
    historico: [
      {
        dataHora: "2026-11-10T10:15:00Z",
        autor: "Lucas Mendes (Exemplo)",
        statusAnterior: "RASCUNHO",
        statusNovo: "EM_CONFERENCIA",
        motivo: "Solicitação enviada para conferência documental inicial.",
      },
    ],
  },
  {
    id: "SOL-2026-002",
    alunoId: "usr-aluno-1",
    alunoNome: "Lucas Mendes (Exemplo)",
    matricula: "20261001",
    situacaoMatricula: "REGULAR",
    cursoId: "cur-dsm",
    curso: "Desenvolvimento de Software Multiplataforma",
    modalidade: "EQUIVALENCIA",
    concedente: "InovaSoft Soluções S.A. (Exemplo)",
    periodoInicio: "2025-01-10",
    periodoFim: "2025-12-20",
    horasPrevistas: 240,
    horasCumpridas: 240,
    seguroInfo: "",
    pae: {
      descricao: "Atuação profissional como desenvolvedor júnior em aplicações web.",
      tecnicas: "JavaScript, SQL, APIs REST e revisão de código.",
      compatibilidade: "Experiência profissional correlata ao eixo tecnológico do curso.",
    },
    documentos: [
      { nome: "Declaracao_Vinculo_Exemplo.pdf", tipo: "COMPROVANTE_VINCULO" },
    ],
    status: "AGUARDANDO_CORRECAO",
    criadaEm: "2026-11-05T14:00:00Z",
    enviadaEm: "2026-11-05T14:20:00Z",
    pendenciaAtual: "Anexar descrição técnica detalhada das atividades e comprovante de vínculo.",
    historico: [
      {
        dataHora: "2026-11-05T14:20:00Z",
        autor: "Lucas Mendes (Exemplo)",
        statusAnterior: "RASCUNHO",
        statusNovo: "EM_CONFERENCIA",
        motivo: "Pedido de equivalência enviado.",
      },
      {
        dataHora: "2026-11-06T11:00:00Z",
        autor: "Carla Souza (Exemplo)",
        statusAnterior: "EM_CONFERENCIA",
        statusNovo: "AGUARDANDO_CORRECAO",
        motivo: "Anexar descrição técnica detalhada das atividades e comprovante de vínculo.",
      },
    ],
  },
];