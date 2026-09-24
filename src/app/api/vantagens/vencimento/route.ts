import { NextRequest, NextResponse } from "next/server";
import { eq, and, or, lte, gte, asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { 
  servidorAts, 
  licencaPremioCertidoes, 
  servidores,
  configVantagensPessoais
} from "@/db/schema";
import { obterSessao } from "@/lib/auth";

// Calcula diferença em dias entre duas datas
function diasEntreDatas(data1: string, data2: string): number {
  const d1 = new Date(data1);
  const d2 = new Date(data2);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Adiciona dias a uma data
function adicionarDias(data: string, dias: number): string {
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const servidorId = url.searchParams.get("servidorId");
  const diasAlerta = parseInt(url.searchParams.get("diasAlerta") || "90"); // Alerta padrão: 90 dias

  const hoje = new Date().toISOString().split('T')[0];
  const dataLimite = adicionarDias(hoje, diasAlerta);

  try {
    let resultado: any = {
      ats: [],
      licencasPremio: [],
      resumo: {
        totalVencidas: 0,
        totalAVencer: 0,
        totalCritico: 0, // 30 dias ou menos
      }
    };

    // Se for servidor, só mostra suas próprias vantagens
    if (sessao.papel === "servidor") {
      if (!sessao.servidorId) {
        return NextResponse.json({ error: "Servidor não associado" }, { status: 400 });
      }
      
      // ATS do servidor
      const atsServidor = await db
        .select()
        .from(servidorAts)
        .where(eq(servidorAts.servidorId, sessao.servidorId))
        .orderBy(asc(servidorAts.numero));

      resultado.ats = atsServidor.map(ats => {
        const proximaVigencia = ats.proximaVigencia || adicionarDias(ats.dataVigencia, 1825); // 5 anos
        const diasParaVencer = diasEntreDatas(hoje, proximaVigencia);
        const vencido = diasParaVencer < 0;
        const diasVencido = vencido ? Math.abs(diasParaVencer) : 0;
        
        return {
          ...ats,
          proximaVigencia,
          diasParaVencer,
          vencido,
          diasVencido,
          status: vencido ? 'vencido' : diasParaVencer <= 30 ? 'critico' : diasParaVencer <= diasAlerta ? 'alerta' : 'ok',
          tipo: 'ATS',
          nomeVantagem: `ATS - ${ats.numero}º Quinquênio`
        };
      });

      // Licenças Prêmio do servidor
      const licencasServidor = await db
        .select()
        .from(licencaPremioCertidoes)
        .where(eq(licencaPremioCertidoes.servidorId, sessao.servidorId))
        .orderBy(asc(licencaPremioCertidoes.ano));

      resultado.licencasPremio = licencasServidor.map(lp => {
        const diasParaVencer = diasEntreDatas(hoje, lp.periodoFinal);
        const vencido = diasParaVencer < 0;
        const diasVencido = vencido ? Math.abs(diasParaVencer) : 0;
        
        return {
          ...lp,
          diasParaVencer,
          vencido,
          diasVencido,
          status: vencido ? 'vencido' : diasParaVencer <= 30 ? 'critico' : diasParaVencer <= diasAlerta ? 'alerta' : 'ok',
          tipo: 'LICENCA_PREMIO',
          nomeVantagem: `Licença Prêmio ${lp.ano}`
        };
      });

    } else {
      // Gestor: mostra de todos os servidores
      const servidorFiltro = servidorId ? eq(servidorAts.servidorId, parseInt(servidorId)) : undefined;

      // ATS de todos os servidores
      const todosAts = servidorId 
        ? await db
            .select()
            .from(servidorAts)
            .where(servidorFiltro!)
            .orderBy(asc(servidorAts.numero))
        : await db
            .select()
            .from(servidorAts)
            .orderBy(asc(servidorAts.numero));

      resultado.ats = await Promise.all(todosAts.map(async (ats) => {
        const proximaVigencia = ats.proximaVigencia || adicionarDias(ats.dataVigencia, 1825);
        const diasParaVencer = diasEntreDatas(hoje, proximaVigencia);
        const vencido = diasParaVencer < 0;
        const diasVencido = vencido ? Math.abs(diasParaVencer) : 0;
        
        // Busca dados do servidor
        const [servidor] = await db
          .select({
            nomeCompleto: servidores.nomeCompleto,
            matricula: servidores.matricula,
            cargo: servidores.cargo,
          })
          .from(servidores)
          .where(eq(servidores.id, ats.servidorId))
          .limit(1);

        return {
          ...ats,
          proximaVigencia,
          diasParaVencer,
          vencido,
          diasVencido,
          status: vencido ? 'vencido' : diasParaVencer <= 30 ? 'critico' : diasParaVencer <= diasAlerta ? 'alerta' : 'ok',
          tipo: 'ATS',
          nomeVantagem: `ATS - ${ats.numero}º Quinquênio`,
          servidor
        };
      }));

      // Licenças Prêmio de todos os servidores
      const todasLicencas = servidorId
        ? await db
            .select()
            .from(licencaPremioCertidoes)
            .where(eq(licencaPremioCertidoes.servidorId, parseInt(servidorId)))
            .orderBy(asc(licencaPremioCertidoes.ano))
        : await db
            .select()
            .from(licencaPremioCertidoes)
            .orderBy(asc(licencaPremioCertidoes.ano));

      resultado.licencasPremio = await Promise.all(todasLicencas.map(async (lp) => {
        const diasParaVencer = diasEntreDatas(hoje, lp.periodoFinal);
        const vencido = diasParaVencer < 0;
        const diasVencido = vencido ? Math.abs(diasParaVencer) : 0;
        
        // Busca dados do servidor
        const [servidor] = await db
          .select({
            nomeCompleto: servidores.nomeCompleto,
            matricula: servidores.matricula,
            cargo: servidores.cargo,
          })
          .from(servidores)
          .where(eq(servidores.id, lp.servidorId))
          .limit(1);

        return {
          ...lp,
          diasParaVencer,
          vencido,
          diasVencido,
          status: vencido ? 'vencido' : diasParaVencer <= 30 ? 'critico' : diasParaVencer <= diasAlerta ? 'alerta' : 'ok',
          tipo: 'LICENCA_PREMIO',
          nomeVantagem: `Licença Prêmio ${lp.ano}`,
          servidor
        };
      }));
    }

    // Calcula resumo
    const todasVantagens = [...resultado.ats, ...resultado.licencasPremio];
    resultado.resumo.totalVencidas = todasVantagens.filter(v => v.vencido).length;
    resultado.resumo.totalAVencer = todasVantagens.filter(v => !v.vencido && v.diasParaVencer <= diasAlerta).length;
    resultado.resumo.totalCritico = todasVantagens.filter(v => !v.vencido && v.diasParaVencer <= 30).length;

    // Ordena por urgência
    resultado.ats.sort((a: any, b: any) => a.diasParaVencer - b.diasParaVencer);
    resultado.licencasPremio.sort((a: any, b: any) => a.diasParaVencer - b.diasParaVencer);

    return NextResponse.json(resultado);

  } catch (error: any) {
    console.error("[GET /api/vantagens/vencimento] Erro:", error);
    return NextResponse.json(
      { error: `Erro ao buscar vantagens: ${error.message}` },
      { status: 500 }
    );
  }
}
