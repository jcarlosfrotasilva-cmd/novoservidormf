import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { requerimentos, servidores } from "@/db/schema";
import { obterSessao } from "@/lib/auth";

// ============================================================
// GET - Listar requerimentos
// ============================================================
export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  // Buscar um requerimento específico
  if (id) {
    const [requerimento] = await db
      .select({
        id: requerimentos.id,
        servidorId: requerimentos.servidorId,
        tipo: requerimentos.tipo,
        assunto: requerimentos.assunto,
        descricao: requerimentos.descricao,
        documentoUrl: requerimentos.documentoUrl,
        documentoNome: requerimentos.documentoNome,
        status: requerimentos.status,
        dataAnalise: requerimentos.dataAnalise,
        analisadoPor: requerimentos.analisadoPor,
        feedback: requerimentos.feedback,
        documentoRetornoUrl: requerimentos.documentoRetornoUrl,
        documentoRetornoNome: requerimentos.documentoRetornoNome,
        criadoEm: requerimentos.criadoEm,
        servidor: {
          nome: servidores.nomeCompleto,
          matricula: servidores.matricula,
          cargo: servidores.cargo,
        },
      })
      .from(requerimentos)
      .leftJoin(servidores, eq(requerimentos.servidorId, servidores.id))
      .where(eq(requerimentos.id, Number(id)))
      .limit(1);

    if (!requerimento) {
      return NextResponse.json({ error: "Requerimento não encontrado" }, { status: 404 });
    }

    // Servidor só pode ver seus próprios requerimentos
    if (sessao.papel === "servidor" && requerimento.servidorId !== sessao.servidorId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    return NextResponse.json(requerimento);
  }

  // Listar requerimentos
  if (sessao.papel === "servidor") {
    // Servidor vê apenas seus requerimentos
    const lista = await db
      .select()
      .from(requerimentos)
      .where(eq(requerimentos.servidorId, sessao.servidorId!))
      .orderBy(desc(requerimentos.criadoEm));

    return NextResponse.json(lista);
  }

  // Gestor vê todos os requerimentos
  const lista = await db
    .select({
      id: requerimentos.id,
      servidorId: requerimentos.servidorId,
      tipo: requerimentos.tipo,
      assunto: requerimentos.assunto,
      status: requerimentos.status,
      criadoEm: requerimentos.criadoEm,
      servidor: {
        nome: servidores.nomeCompleto,
        matricula: servidores.matricula,
        cargo: servidores.cargo,
      },
    })
    .from(requerimentos)
    .leftJoin(servidores, eq(requerimentos.servidorId, servidores.id))
    .orderBy(desc(requerimentos.criadoEm));

  return NextResponse.json(lista);
}

// ============================================================
// POST - Criar novo requerimento
// ============================================================
export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao || sessao.papel !== "servidor") {
    return NextResponse.json({ error: "Apenas servidores podem criar requerimentos" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { tipo, assunto, descricao, documentoUrl, documentoNome } = body;

    if (!tipo || !assunto || !descricao) {
      return NextResponse.json(
        { error: "Campos obrigatórios: tipo, assunto, descricao" },
        { status: 400 }
      );
    }

    const [novo] = await db
      .insert(requerimentos)
      .values({
        servidorId: sessao.servidorId!,
        tipo,
        assunto,
        descricao,
        documentoUrl: documentoUrl || null,
        documentoNome: documentoNome || null,
        status: "pendente",
      })
      .returning();

    return NextResponse.json(novo, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/requerimentos] Erro:", error);
    return NextResponse.json(
      { error: `Erro ao criar requerimento: ${error.message}` },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT - Atualizar requerimento (aprovar/rejeitar)
// ============================================================
export async function PUT(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao || sessao.papel !== "gestor") {
    return NextResponse.json({ error: "Apenas gestores podem analisar requerimentos" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    }

    const body = await req.json();
    const { status, feedback, documentoRetornoUrl, documentoRetornoNome } = body;

    if (!status || !["aprovado", "rejeitado"].includes(status)) {
      return NextResponse.json(
        { error: "Status deve ser 'aprovado' ou 'rejeitado'" },
        { status: 400 }
      );
    }

    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback é obrigatório" },
        { status: 400 }
      );
    }

    const [atualizado] = await db
      .update(requerimentos)
      .set({
        status,
        feedback,
        documentoRetornoUrl: documentoRetornoUrl || null,
        documentoRetornoNome: documentoRetornoNome || null,
        dataAnalise: new Date(),
        analisadoPor: sessao.nome,
        atualizadoEm: new Date(),
      })
      .where(eq(requerimentos.id, Number(id)))
      .returning();

    return NextResponse.json(atualizado);
  } catch (error: any) {
    console.error("[PUT /api/requerimentos] Erro:", error);
    return NextResponse.json(
      { error: `Erro ao atualizar requerimento: ${error.message}` },
      { status: 500 }
    );
  }
}
