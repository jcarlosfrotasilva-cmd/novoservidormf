import { NextRequest, NextResponse } from "next/server";
import { obterSessao } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const tipo = formData.get("tipo") as string; // "solicitacao" ou "retorno"

    if (!file) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }

    // Validações
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Máximo: 10MB" },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido. Use PDF, JPG, PNG ou DOC/DOCX" },
        { status: 400 }
      );
    }

    // Gera nome único
    const timestamp = Date.now();
    const extensao = file.name.split(".").pop();
    const nomeArquivo = `${tipo}_${sessao.papel}_${timestamp}.${extensao}`;

    // Cria diretório se não existir
    const uploadDir = join(process.cwd(), "public", "uploads", "requerimentos");
    await mkdir(uploadDir, { recursive: true });

    // Salva arquivo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const caminho = join(uploadDir, nomeArquivo);
    await writeFile(caminho, buffer);

    // Retorna URL pública
    const url = `/uploads/requerimentos/${nomeArquivo}`;

    return NextResponse.json({
      url,
      nome: file.name,
      tamanho: file.size,
      tipo: file.type,
    });
  } catch (error: any) {
    console.error("[POST /api/requerimentos/upload] Erro:", error);
    return NextResponse.json(
      { error: `Erro ao fazer upload: ${error.message}` },
      { status: 500 }
    );
  }
}
