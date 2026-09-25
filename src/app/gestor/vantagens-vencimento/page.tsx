"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { formatarData } from "@/lib/format";

type Vantagem = {
  id: number;
  servidorId: number;
  tipo: string;
  nomeVantagem: string;
  dataVigencia?: string;
  proximaVigencia?: string;
  periodoFinal?: string;
  diasParaVencer: number;
  vencido: boolean;
  diasVencido: number;
  status: 'vencido' | 'critico' | 'alerta' | 'ok';
  servidor?: {
    nomeCompleto: string;
    matricula: string;
    cargo: string;
  };
};

type Resultado = {
  ats: Vantagem[];
  licencasPremio: Vantagem[];
  evolucoesFuncionais: Vantagem[];
  resumo: {
    totalVencidas: number;
    totalAVencer: number;
    totalCritico: number;
  };
};

export default function VantagensVencimentoPage() {
  const router = useRouter();
  const [sessao, setSessao] = useState<any>(null);
  const [dados, setDados] = useState<Resultado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<'ats' | 'evolucao' | 'licenca'>('ats');
  const [diasAlerta, setDiasAlerta] = useState(90);

  useEffect(() => {
    async function carregar() {
      try {
        const auth = await (await fetch("/api/auth")).json();
        if (!auth.logado || auth.papel !== "gestor") {
          router.replace("/login?papel=gestor");
          return;
        }
        setSessao(auth);
        await buscarDados();
      } catch (err) {
        console.error("Erro:", err);
      }
    }
    carregar();
  }, [router, diasAlerta]);

  async function buscarDados() {
    setCarregando(true);
    try {
      const res = await fetch(`/api/vantagens/vencimento?diasAlerta=${diasAlerta}`);
      const data = await res.json();
      setDados(data);
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
    } finally {
      setCarregando(false);
    }
  }

  function ordenarVantagens(vantagens: Vantagem[]) {
    return [...vantagens].sort((a, b) => {
      if (a.vencido && !b.vencido) return -1;
      if (!a.vencido && b.vencido) return 1;
      if (a.vencido && b.vencido) return b.diasVencido - a.diasVencido;
      return a.diasParaVencer - b.diasParaVencer;
    });
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'vencido': return 'bg-red-100 text-red-800 border-red-300';
      case 'critico': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'alerta': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-green-100 text-green-800 border-green-300';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'vencido': return '🔴';
      case 'critico': return '🟠';
      case 'alerta': return '🟡';
      default: return '🟢';
    }
  }

  function getStatusText(status: string, dias: number, vencido: boolean) {
    if (vencido) return `Vencido há ${Math.abs(dias)} dias`;
    if (dias === 0) return 'Vence hoje';
    if (dias === 1) return 'Vence amanhã';
    return `Vence em ${dias} dias`;
  }

  if (!sessao) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const vantagensAtuais = aba === 'ats' 
    ? dados?.ats || []
    : aba === 'evolucao'
    ? dados?.evolucoesFuncionais || []
    : dados?.licencasPremio || [];

  const vantagensOrdenadas = ordenarVantagens(vantagensAtuais);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header nome={sessao.nome} papel="gestor" voltarPara="/gestor" />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Monitoramento de Vantagens
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Acompanhe vantagens vencidas e próximas do vencimento
          </p>
        </div>

        <div className="card-modern p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setAba('ats')}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${
                  aba === 'ats' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                🧮 ATS
              </button>
              <button
                onClick={() => setAba('evolucao')}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${
                  aba === 'evolucao' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                📈 Evolução Funcional
              </button>
              <button
                onClick={() => setAba('licenca')}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${
                  aba === 'licenca' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                🏖️ Licença Prêmio
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Alerta até:</label>
              <select
                value={diasAlerta}
                onChange={(e) => setDiasAlerta(parseInt(e.target.value))}
                className="input-modern py-2 text-sm"
              >
                <option value={30}>30 dias</option>
                <option value={60}>60 dias</option>
                <option value={90}>90 dias</option>
                <option value={180}>180 dias</option>
                <option value={365}>1 ano</option>
              </select>
            </div>
          </div>
        </div>

        {dados && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card-modern p-5">
              <p className="text-sm text-slate-600 mb-1">Total de Vantagens</p>
              <p className="text-3xl font-bold text-slate-900">{vantagensAtuais.length}</p>
            </div>
            <div className="card-modern p-5 bg-red-50 border-red-200">
              <p className="text-sm text-red-700 mb-1">🔴 Vencidas</p>
              <p className="text-3xl font-bold text-red-900">
                {vantagensOrdenadas.filter(v => v.vencido).length}
              </p>
            </div>
            <div className="card-modern p-5 bg-orange-50 border-orange-200">
              <p className="text-sm text-orange-700 mb-1">🟠 Críticas (≤30 dias)</p>
              <p className="text-3xl font-bold text-orange-900">
                {vantagensOrdenadas.filter(v => !v.vencido && v.diasParaVencer <= 30).length}
              </p>
            </div>
            <div className="card-modern p-5 bg-yellow-50 border-yellow-200">
              <p className="text-sm text-yellow-700 mb-1">🟡 A Vencer (≤{diasAlerta} dias)</p>
              <p className="text-3xl font-bold text-yellow-900">
                {vantagensOrdenadas.filter(v => !v.vencido && v.diasParaVencer <= diasAlerta).length}
              </p>
            </div>
          </div>
        )}

        {carregando ? (
          <div className="card-modern p-12 text-center">
            <div className="w-12 h-12 mx-auto border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-600">Carregando dados...</p>
          </div>
        ) : vantagensOrdenadas.length === 0 ? (
          <div className="card-modern p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center text-4xl mb-4">
              ✅
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Tudo em dia!</h3>
            <p className="text-slate-600">
              Nenhuma vantagem com vencimento próximo nesta categoria
            </p>
          </div>
        ) : (
          <div className="card-modern overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Servidor</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Vantagem</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Vigência</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Dias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vantagensOrdenadas.map((v) => (
                    <tr key={`${v.tipo}-${v.id}`} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{v.servidor?.nomeCompleto}</div>
                        <div className="text-xs text-slate-500">{v.servidor?.matricula} · {v.servidor?.cargo}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{v.nomeVantagem}</div>
                        <div className="text-xs text-slate-500">{v.tipo}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {v.dataVigencia ? formatarData(v.dataVigencia) : 
                         v.proximaVigencia ? formatarData(v.proximaVigencia) :
                         v.periodoFinal ? formatarData(v.periodoFinal) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(v.status)}`}>
                          {getStatusIcon(v.status)}
                          {getStatusText(v.status, v.diasParaVencer, v.vencido)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {v.vencido ? (
                          <span className="font-semibold text-red-700">
                            {Math.abs(v.diasParaVencer)} dias
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-700">
                            {v.diasParaVencer} dias
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
