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
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'vencido' | 'critico' | 'alerta'>('todos');
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

  function filtrarVantagens(vantagens: Vantagem[]) {
    if (filtroStatus === 'todos') return vantagens;
    return vantagens.filter(v => v.status === filtroStatus);
  }

  if (!sessao) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const todasVantagens = dados ? [...dados.ats, ...dados.licencasPremio, ...dados.evolucoesFuncionais] : [];
  const vantagensFiltradas = filtrarVantagens(todasVantagens);

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

        {/* Controles */}
        <div className="card-modern p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2">
              {(['todos', 'vencido', 'critico', 'alerta'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFiltroStatus(status)}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${
                    filtroStatus === status
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {status === 'todos' && 'Todos'}
                  {status === 'vencido' && '🔴 Vencidos'}
                  {status === 'critico' && '🟠 Críticos (≤30 dias)'}
                  {status === 'alerta' && `🟡 Alerta (≤${diasAlerta} dias)`}
                </button>
              ))}
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

        {/* Cards de resumo */}
        {dados && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card-modern p-5">
              <p className="text-sm text-slate-600 mb-1">Total de Vantagens</p>
              <p className="text-3xl font-bold text-slate-900">{todasVantagens.length}</p>
            </div>
            <div className="card-modern p-5 bg-red-50 border-red-200">
              <p className="text-sm text-red-700 mb-1">🔴 Vencidas</p>
              <p className="text-3xl font-bold text-red-900">{dados.resumo.totalVencidas}</p>
            </div>
            <div className="card-modern p-5 bg-orange-50 border-orange-200">
              <p className="text-sm text-orange-700 mb-1">🟠 Críticas (≤30 dias)</p>
              <p className="text-3xl font-bold text-orange-900">{dados.resumo.totalCritico}</p>
            </div>
            <div className="card-modern p-5 bg-yellow-50 border-yellow-200">
              <p className="text-sm text-yellow-700 mb-1">🟡 A Vencer (≤{diasAlerta} dias)</p>
              <p className="text-3xl font-bold text-yellow-900">{dados.resumo.totalAVencer}</p>
            </div>
          </div>
        )}

        {/* Lista de vantagens */}
        {carregando ? (
          <div className="card-modern p-12 text-center">
            <div className="w-12 h-12 mx-auto border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-600">Carregando dados...</p>
          </div>
        ) : vantagensFiltradas.length === 0 ? (
          <div className="card-modern p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center text-4xl mb-4">
              ✅
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Tudo em dia!</h3>
            <p className="text-slate-600">
              {filtroStatus === 'todos' 
                ? 'Nenhuma vantagem com vencimento próximo'
                : `Nenhuma vantagem com status "${filtroStatus}"`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {vantagensFiltradas.map((v) => (
              <div key={`${v.tipo}-${v.id}`} className="card-modern p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(v.status)}`}>
                        {getStatusIcon(v.status)}
                        {getStatusText(v.status, v.diasParaVencer, v.vencido)}
                      </span>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        {v.tipo === 'ATS' ? 'ATS' : v.tipo === 'EVOLUCAO_FUNCIONAL' ? 'Evolução Funcional' : 'Licença Prêmio'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{v.nomeVantagem}</h3>
                    {v.servidor && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span className="font-medium">{v.servidor.nomeCompleto}</span>
                        <span>·</span>
                        <span>{v.servidor.matricula}</span>
                        <span>·</span>
                        <span>{v.servidor.cargo}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm text-slate-600 mt-3">
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
                    <div className={`text-3xl font-bold ${v.vencido ? 'text-red-600' : v.diasParaVencer <= 30 ? 'text-orange-600' : 'text-slate-600'}`}>
                      {v.vencido ? Math.abs(v.diasParaVencer) : v.diasParaVencer}
                    </div>
                    <div className="text-xs text-slate-500">
                      {v.vencido ? 'dias atrás' : 'dias'}
                    </div>
                  </div>
                </div>
                {v.vencido && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      ⚠️ <strong>Atenção:</strong> Esta vantagem está vencida há {Math.abs(v.diasParaVencer)} dias. 
                      Entre em contato com o servidor para regularização.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
