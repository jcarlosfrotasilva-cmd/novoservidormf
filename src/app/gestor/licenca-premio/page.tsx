"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { formatarData } from "@/lib/format";

const SALDO_INICIAL = 90;
const DIAS_VALIDOS = [15, 30, 45, 60, 75, 90];

type Certidao = {
  id: number;
  numero: number;
  ano: number;
  periodoInicial: string;
  periodoFinal: string;
  dataDoe: string | null;
  saldoInicial: number;
  saldoAtual: number;
  saldoConsumido: number;
  ehUltima: boolean;
  proximoPeriodoInicial: string | null;
  observacao: string | null;
  fruicoes: Fruicao[];
};

type Fruicao = {
  id: number;
  tipo: "gozo" | "pecunia";
  dias: number;
  dataInicio: string | null;
  dataFim: string | null;
  dataDoeAutorizacao: string | null;
  anoPecunia: number | null;
  observacao: string | null;
  criadoEm: string;
};

type ServidorInfo = {
  id: number;
  nome: string;
  matricula: string;
  cargo: string;
  categoria: string | null;
  podeTerLicencaPremio: boolean;
};

type ResumoItem = {
  servidor: ServidorInfo;
  totalCertidoes: number;
  certidoesZeradas: number;
  saldoTotal: number;
};

export default function LicencaPremioPage() {
  const router = useRouter();
  const [sessao, setSessao] = useState<any>(null);
  const [aba, setAba] = useState<"certidoes" | "resumo">("certidoes");

  // Aba Certidões
  const [servidores, setServidores] = useState<any[]>([]);
  const [servidorSelecionado, setServidorSelecionado] = useState<string>("");
  const [servidorInfo, setServidorInfo] = useState<ServidorInfo | null>(null);
  const [certidoes, setCertidoes] = useState<Certidao[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Modais
  const [modalCertidao, setModalCertidao] = useState(false);
  const [certidaoEditando, setCertidaoEditando] = useState<Certidao | null>(null);
  const [formCertidao, setFormCertidao] = useState({
    numero: "",
    ano: new Date().getFullYear(),
    periodoInicial: "",
    periodoFinal: "",
    dataDoe: "",
    ehUltima: false,
    observacao: "",
  });

  const [modalFruicao, setModalFruicao] = useState(false);
  const [fruicaoEditando, setFruicaoEditando] = useState<Fruicao | null>(null);
  const [certidaoFruicao, setCertidaoFruicao] = useState<Certidao | null>(null);
  const [tipoFruicao, setTipoFruicao] = useState<"gozo" | "pecunia">("gozo");
  const [formFruicao, setFormFruicao] = useState({
    dias: 30,
    dataInicio: "",
    dataFim: "",
    dataDoeAutorizacao: "",
    anoPecunia: new Date().getFullYear(),
    observacao: "",
  });

  // Resumo
  const [resumos, setResumos] = useState<ResumoItem[]>([]);

  useEffect(() => {
    async function carregar() {
      try {
        const auth = await (await fetch("/api/auth")).json();
        if (!auth.logado || auth.papel !== "gestor") {
          router.replace("/login?papel=gestor");
          return;
        }
        setSessao(auth);

        const srvs = await (await fetch("/api/servidores")).json();
        setServidores(srvs);
      } catch (err) {
        console.error("Erro:", err);
      }
    }
    carregar();
  }, [router]);

  async function carregarCertidoes(servidorId: string) {
    if (!servidorId) {
      setServidorInfo(null);
      setCertidoes([]);
      return;
    }
    setCarregando(true);
    try {
      const res = await fetch(`/api/licenca-premio?tipo=certidoes&servidorId=${servidorId}`);
      const data = await res.json();
      setServidorInfo(data.servidor);
      setCertidoes(data.certidoes || []);
    } catch (err) {
      console.error("Erro ao carregar certidões:", err);
    } finally {
      setCarregando(false);
    }
  }

  function abrirEditarCertidao(certidao: Certidao) {
    setCertidaoEditando(certidao);
    setFormCertidao({
      numero: String(certidao.numero),
      ano: certidao.ano,
      periodoInicial: certidao.periodoInicial,
      periodoFinal: certidao.periodoFinal,
      dataDoe: certidao.dataDoe || "",
      ehUltima: certidao.ehUltima || false,
      observacao: certidao.observacao || "",
    });
    setModalCertidao(true);
  }

  function abrirEditarFruicao(fruicao: Fruicao, certidao: Certidao) {
    setFruicaoEditando(fruicao);
    setCertidaoFruicao(certidao);
    setTipoFruicao(fruicao.tipo);
    setFormFruicao({
      dias: fruicao.dias,
      dataInicio: fruicao.dataInicio || "",
      dataFim: fruicao.dataFim || "",
      dataDoeAutorizacao: fruicao.dataDoeAutorizacao || "",
      anoPecunia: fruicao.anoPecunia || new Date().getFullYear(),
      observacao: fruicao.observacao || "",
    });
    setModalFruicao(true);
  }

  async function abrirNovaCertidao() {
    if (!servidorInfo) return;
    setCertidaoEditando(null);
    setFormCertidao({
      numero: "",
      ano: new Date().getFullYear(),
      periodoInicial: "",
      periodoFinal: "",
      dataDoe: "",
      ehUltima: false,
      observacao: "",
    });
    setModalCertidao(true);
  }

  async function abrirNovaFruicao(certidao: Certidao) {
    setFruicaoEditando(null);
    setCertidaoFruicao(certidao);
    setTipoFruicao("gozo");
    setFormFruicao({
      dias: 30,
      dataInicio: "",
      dataFim: "",
      dataDoeAutorizacao: "",
      anoPecunia: new Date().getFullYear(),
      observacao: "",
    });
    setModalFruicao(true);
  }

  async function salvarCertidao(e: FormEvent) {
    e.preventDefault();
    if (!servidorInfo) return;

    const method = certidaoEditando ? "PUT" : "POST";
    const body = certidaoEditando
      ? { id: certidaoEditando.id, ...formCertidao }
      : { servidorId: servidorInfo.id, ...formCertidao };

    const res = await fetch("/api/licenca-premio?tipo=certidao", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Erro ao salvar certidão");
      return;
    }

    setModalCertidao(false);
    carregarCertidoes(String(servidorInfo.id));
  }

  async function salvarFruicao(e: FormEvent) {
    e.preventDefault();
    if (!certidaoFruicao || !servidorInfo) return;

    const method = fruicaoEditando ? "PUT" : "POST";
    const body = fruicaoEditando
      ? { id: fruicaoEditando.id, ...formFruicao, tipoFruicao }
      : { certidaoId: certidaoFruicao.id, ...formFruicao, tipoFruicao };

    const res = await fetch("/api/licenca-premio?tipo=fruicao", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Erro ao salvar fruição");
      return;
    }

    setModalFruicao(false);
    carregarCertidoes(String(servidorInfo.id));
  }

  async function excluirCertidao(id: number) {
    if (!confirm("Excluir esta certidão? Todas as fruições vinculadas serão removidas.")) return;
    await fetch(`/api/licenca-premio?id=${id}&tipo=certidao`, { method: "DELETE" });
    carregarCertidoes(String(servidorInfo!.id));
  }

  async function excluirFruicao(id: number) {
    if (!confirm("Excluir esta fruição? O saldo será recalculado.")) return;
    await fetch(`/api/licenca-premio?id=${id}&tipo=fruicao`, { method: "DELETE" });
    carregarCertidoes(String(servidorInfo!.id));
  }

  useEffect(() => {
    if (aba === "resumo") {
      fetch("/api/licenca-premio?tipo=resumo")
        .then((r) => r.json())
        .then(setResumos);
    }
  }, [aba]);

  if (!sessao) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header nome={sessao.nome} papel="gestor" voltarPara="/gestor" />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Licença Prêmio
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Certidões e fruições de licença prêmio
          </p>
        </div>

        <div className="card-modern p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setAba('certidoes')}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${
                  aba === 'certidoes' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                📋 Certidões
              </button>
              <button
                onClick={() => setAba('resumo')}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${
                  aba === 'resumo' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                📊 Resumo Geral
              </button>
            </div>
          </div>
        </div>

        {aba === "certidoes" && (
          <>
            <div className="card-modern p-4 mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Selecione o servidor
              </label>
              <select
                value={servidorSelecionado}
                onChange={(e) => {
                  setServidorSelecionado(e.target.value);
                  carregarCertidoes(e.target.value);
                }}
                className="input-modern"
              >
                <option value="">-- Selecione --</option>
                {servidores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nomeCompleto} - {s.cargo}
                  </option>
                ))}
              </select>
            </div>

            {servidorInfo && !servidorInfo.podeTerLicencaPremio && (
              <div className="card-modern p-4 mb-6 bg-amber-50 border-amber-200">
                <p className="text-sm text-amber-900">
                  <strong>Atenção:</strong> Este servidor não tem direito à Licença Prêmio (categoria: {servidorInfo.categoria}).
                </p>
              </div>
            )}

            {servidorInfo && servidorInfo.podeTerLicencaPremio && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Certidões de {servidorInfo.nome}
                  </h2>
                  <button
                    onClick={abrirNovaCertidao}
                    className="btn-primary"
                  >
                    + Nova Certidão
                  </button>
                </div>

                {carregando ? (
                  <div className="card-modern p-8 text-center">
                    <div className="w-10 h-10 mx-auto border-4 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : certidoes.length === 0 ? (
                  <div className="card-modern p-8 text-center text-slate-500">
                    Nenhuma certidão cadastrada
                  </div>
                ) : (
                  <div className="space-y-4">
                    {certidoes.map((c) => (
                      <div key={c.id} className="card-modern p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">
                              Certidão nº {c.numero}/{c.ano}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                              Período: {formatarData(c.periodoInicial)} até {formatarData(c.periodoFinal)}
                            </p>
                            {c.dataDoe && (
                              <p className="text-sm text-slate-600">DOE: {formatarData(c.dataDoe)}</p>
                            )}
                            {c.ehUltima && c.proximoPeriodoInicial && (
                              <p className="text-sm text-indigo-600 font-semibold mt-2">
                                📅 Próximo período aquisitivo: {formatarData(c.proximoPeriodoInicial)}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => abrirEditarCertidao(c)}
                              className="btn-secondary"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => excluirCertidao(c.id)}
                              className="btn-secondary text-red-600 hover:bg-red-50"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-slate-700">
                              Saldo: {c.saldoAtual} / {c.saldoInicial} dias
                            </span>
                            <span className="text-sm text-slate-500">
                              {Math.round((c.saldoConsumido / c.saldoInicial) * 100)}% utilizado
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full transition-all"
                              style={{ width: `${(c.saldoConsumido / c.saldoInicial) * 100}%` }}
                            ></div>
                          </div>
                        </div>

                        {c.fruicoes && c.fruicoes.length > 0 && (
                          <div className="mt-4">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="text-sm font-semibold text-slate-700">
                                Fruições ({c.fruicoes.length})
                              </h4>
                              <button
                                onClick={() => abrirNovaFruicao(c)}
                                disabled={c.saldoAtual === 0}
                                className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                + Nova Fruição
                              </button>
                            </div>
                            <div className="space-y-2">
                              {c.fruicoes.map((f) => (
                                <div
                                  key={f.id}
                                  className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"
                                >
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                      {f.tipo === "gozo" ? "🏖️ Gozo" : "💰 Pecúnia"} - {f.dias} dias
                                    </p>
                                    {f.tipo === "gozo" && f.dataInicio && f.dataFim && (
                                      <p className="text-xs text-slate-600">
                                        {formatarData(f.dataInicio)} até {formatarData(f.dataFim)}
                                      </p>
                                    )}
                                    {f.tipo === "pecunia" && f.anoPecunia && (
                                      <p className="text-xs text-slate-600">Ano: {f.anoPecunia}</p>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => abrirEditarFruicao(f, c)}
                                      className="text-sm text-indigo-600 hover:text-indigo-800"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => excluirFruicao(f.id)}
                                      className="text-sm text-red-600 hover:text-red-800"
                                    >
                                      Excluir
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {aba === "resumo" && (
          <div className="card-modern p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Resumo Geral</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 font-semibold text-slate-700">Servidor</th>
                    <th className="text-center py-3 px-3 font-semibold text-slate-700">Total Certidões</th>
                    <th className="text-center py-3 px-3 font-semibold text-slate-700">Zeradas</th>
                    <th className="text-center py-3 px-3 font-semibold text-slate-700">Saldo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resumos.map((r) => (
                    <tr key={r.servidor.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900">{r.servidor.nome}</p>
                        <p className="text-xs text-slate-500">{r.servidor.cargo}</p>
                      </td>
                      <td className="text-center py-3 px-3">{r.totalCertidoes}</td>
                      <td className="text-center py-3 px-3">{r.certidoesZeradas}</td>
                      <td className="text-center py-3 px-3 font-semibold">{r.saldoTotal} dias</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal Certidão */}
      <Modal
        aberto={modalCertidao}
        onClose={() => setModalCertidao(false)}
        titulo={certidaoEditando ? "Editar Certidão" : "Nova Certidão"}
      >
        <form onSubmit={salvarCertidao} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Número *</label>
              <input
                type="text"
                value={formCertidao.numero}
                onChange={(e) => setFormCertidao({ ...formCertidao, numero: e.target.value })}
                className="input-modern"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Ano *</label>
              <input
                type="number"
                value={formCertidao.ano}
                onChange={(e) => setFormCertidao({ ...formCertidao, ano: Number(e.target.value) })}
                className="input-modern"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Período Inicial *</label>
              <input
                type="date"
                value={formCertidao.periodoInicial}
                onChange={(e) => setFormCertidao({ ...formCertidao, periodoInicial: e.target.value })}
                className="input-modern"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Período Final *</label>
              <input
                type="date"
                value={formCertidao.periodoFinal}
                onChange={(e) => setFormCertidao({ ...formCertidao, periodoFinal: e.target.value })}
                className="input-modern"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Data DOE</label>
            <input
              type="date"
              value={formCertidao.dataDoe}
              onChange={(e) => setFormCertidao({ ...formCertidao, dataDoe: e.target.value })}
              className="input-modern"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ehUltima"
              checked={formCertidao.ehUltima}
              onChange={(e) => setFormCertidao({ ...formCertidao, ehUltima: e.target.checked })}
              className="w-4 h-4 text-indigo-600"
            />
            <label htmlFor="ehUltima" className="text-sm font-semibold text-slate-700">
              Última Certidão?
            </label>
          </div>

          {formCertidao.ehUltima && formCertidao.periodoFinal && (
            <div className="p-3 bg-indigo-50 rounded-lg text-sm text-indigo-900">
              📅 Próximo período aquisitivo:{" "}
              <strong>
                {formatarData(
                  new Date(new Date(formCertidao.periodoFinal).getTime() + (1 + 1825) * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0]
                )}
              </strong>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Observação</label>
            <textarea
              value={formCertidao.observacao}
              onChange={(e) => setFormCertidao({ ...formCertidao, observacao: e.target.value })}
              className="input-modern"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setModalCertidao(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Salvar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Fruição */}
      <Modal
        aberto={modalFruicao}
        onClose={() => setModalFruicao(false)}
        titulo={fruicaoEditando ? "Editar Fruição" : "Nova Fruição"}
      >
        <form onSubmit={salvarFruicao} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="gozo"
                  checked={tipoFruicao === "gozo"}
                  onChange={(e) => setTipoFruicao("gozo")}
                  className="w-4 h-4"
                />
                <span className="text-sm">Gozo</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="pecunia"
                  checked={tipoFruicao === "pecunia"}
                  onChange={(e) => setTipoFruicao("pecunia")}
                  className="w-4 h-4"
                />
                <span className="text-sm">Pecúnia</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Dias *</label>
            <select
              value={formFruicao.dias}
              onChange={(e) => setFormFruicao({ ...formFruicao, dias: Number(e.target.value) })}
              className="input-modern"
              required
            >
              {DIAS_VALIDOS.map((d) => (
                <option key={d} value={d}>
                  {d} dias
                </option>
              ))}
            </select>
          </div>

          {tipoFruicao === "gozo" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Data Início *</label>
                  <input
                    type="date"
                    value={formFruicao.dataInicio}
                    onChange={(e) => setFormFruicao({ ...formFruicao, dataInicio: e.target.value })}
                    className="input-modern"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Data Fim *</label>
                  <input
                    type="date"
                    value={formFruicao.dataFim}
                    onChange={(e) => setFormFruicao({ ...formFruicao, dataFim: e.target.value })}
                    className="input-modern"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Data DOE Autorização</label>
                <input
                  type="date"
                  value={formFruicao.dataDoeAutorizacao}
                  onChange={(e) => setFormFruicao({ ...formFruicao, dataDoeAutorizacao: e.target.value })}
                  className="input-modern"
                />
              </div>
            </>
          )}

          {tipoFruicao === "pecunia" && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Ano *</label>
              <input
                type="number"
                value={formFruicao.anoPecunia}
                onChange={(e) => setFormFruicao({ ...formFruicao, anoPecunia: Number(e.target.value) })}
                className="input-modern"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Observação</label>
            <textarea
              value={formFruicao.observacao}
              onChange={(e) => setFormFruicao({ ...formFruicao, observacao: e.target.value })}
              className="input-modern"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setModalFruicao(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Salvar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
