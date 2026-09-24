"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { formatarData } from "@/lib/format";

type Vantagem = {
  id: number;
  tipo: string;
  nomeVantagem: string;
  dataVigencia?: string;
  proximaVigencia?: string;
  periodoFinal?: string;
  diasParaVencer: number;
  vencido: boolean;
  diasVencido: number;
  status: 'vencido' | 'critico' | 'alerta' | 'ok';
};

type Props = {
  servidorId: number;
};

export function VantagensVencimento({ servidorId }: Props) {
  const [vantagens, setVantagens] = useState<Vantagem[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch(`/api/vantagens/vencimento?servidorId=${servidorId}&diasAlerta=90`);
        const data = await res.json();
      const todas = [...data.ats, ...data.licencasPremio, ...data.evolucoesFuncionais];
      // Mostra apenas as que estão vencidas ou com alerta (90 dias)
      const relevantes = todas.filter((v: Vantagem) => v.vencido || v.diasParaVencer <= 90);
        setVantagens(relevantes);
      } catch (err) {
        console.error("Erro ao carregar vantagens:", err);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [servidorId]);

  function getStatusColor(status: string) {
    switch (status) {
      case 'vencido':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'critico':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'alerta':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'vencido':
        return '🔴';
      case 'critico':
        return '🟠';
      case 'alerta':
        return '🟡';
      default:
        return '🟢';
    }
  }

  function getStatusText(status: string, dias: number, vencido: boolean) {
    if (vencido) {
      return `Vencido há ${Math.abs(dias)} dias`;
    }
    if (dias === 0) return 'Vence hoje';
    if (dias === 1) return 'Vence amanhã';
    return `Vence em ${dias} dias`;
  }

  if (carregando) {
    return (
      <Card titulo="⏰ Vantagens com Vencimento" className="lg:col-span-3">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Card>
    );
  }

  if (vantagens.length === 0) {
    return null; // Não mostra o card se não há vantagens com alerta
  }

  const vencidas = vantagens.filter(v => v.vencido).length;
  const criticas = vantagens.filter(v => !v.vencido && v.diasParaVencer <= 30).length;

  return (
    <Card 
      titulo="⏰ Vantagens com Vencimento" 
      subtitulo={`${vantagens.length} vantagem(ns) com alerta`}
      className="lg:col-span-3"
      acao={
        <Link
          href="/servidor/requerimentos"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-sm transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          Solicitar Renovação
        </Link>
      }
    >
      {/* Alertas */}
      {vencidas > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-800 font-semibold">
            ⚠️ Você tem {vencidas} vantagem(ns) vencida(s)!
          </p>
          <p className="text-xs text-red-700 mt-1">
            Solicite a renovação o mais rápido possível para não perder seus benefícios.
          </p>
        </div>
      )}

      {criticas > 0 && vencidas === 0 && (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <p className="text-sm text-orange-800 font-semibold">
            🟠 Atenção: {criticas} vantagem(ns) vencendo em breve!
          </p>
          <p className="text-xs text-orange-700 mt-1">
            Prepare sua documentação e solicite a renovação com antecedência.
          </p>
        </div>
      )}

      {/* Lista de vantagens */}
      <div className="space-y-3">
        {vantagens.map((v) => (
          <div 
            key={`${v.tipo}-${v.id}`} 
            className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-sm transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(v.status)}`}>
                    {getStatusIcon(v.status)}
                    {getStatusText(v.status, v.diasParaVencer, v.vencido)}
                  </span>
                  <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                    {v.tipo === 'ATS' ? 'ATS' : v.tipo === 'EVOLUCAO_FUNCIONAL' ? 'Evolução Funcional' : 'Licença Prêmio'}
                  </span>
                </div>
                <h4 className="text-base font-semibold text-slate-900 mb-1">{v.nomeVantagem}</h4>
                <div className="flex items-center gap-3 text-xs text-slate-600 mt-2">
                  {v.dataVigencia && (
                    <div>
                      <span className="font-semibold">Vigência:</span> {formatarData(v.dataVigencia)}
                    </div>
                  )}
                  {v.proximaVigencia && (
                    <div>
                      <span className="font-semibold">Próxima:</span> {formatarData(v.proximaVigencia)}
                    </div>
                  )}
                  {v.periodoFinal && (
                    <div>
                      <span className="font-semibold">Período Final:</span> {formatarData(v.periodoFinal)}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${v.vencido ? 'text-red-600' : v.diasParaVencer <= 30 ? 'text-orange-600' : 'text-slate-600'}`}>
                  {v.vencido ? Math.abs(v.diasParaVencer) : v.diasParaVencer}
                </div>
                <div className="text-xs text-slate-500">
                  {v.vencido ? 'dias atrás' : 'dias'}
                </div>
              </div>
            </div>
            {v.vencido && (
              <div className="mt-3 p-3 bg-white border border-red-200 rounded-lg">
                <p className="text-xs text-red-800">
                  <strong>Ação necessária:</strong> Esta vantagem está vencida. Clique em "Solicitar Renovação" para iniciar o processo.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
