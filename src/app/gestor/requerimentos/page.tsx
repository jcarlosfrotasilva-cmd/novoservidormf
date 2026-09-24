"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { formatarData } from "@/lib/format";

type Requerimento = {
  id: number;
  servidorId: number;
  tipo: string;
  assunto: string;
  descricao: string;
  documentoUrl: string | null;
  documentoNome: string | null;
  status: string;
  dataAnalise: string | null;
  analisadoPor: string | null;
  feedback: string | null;
  documentoRetornoUrl: string | null;
  documentoRetornoNome: string | null;
  criadoEm: string;
  servidor: {
    nome: string;
    matricula: string;
    cargo: string;
  };
};

export default function GestorRequerimentosPage() {
  const router = useRouter();
  const [sessao, setSessao] = useState<any>(null);
  const [requerimentos, setRequerimentos] = useState<Requerimento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<string>("todos");
  const [modalDetalhes, setModalDetalhes] = useState<Requerimento | null>(null);
  const [modalAnalise, setModalAnalise] = useState<Requerimento | null>(null);
  const [analisando, setAnalisando] = useState(false);

  // Form análise
  const [form, setForm] = useState({
    status: "",
    feedback: "",
    documentoRetornoUrl: "",
    documentoRetornoNome: "",
  });

  useEffect(() => {
    async function carregar() {
      try {
        const authRes = await fetch("/api/auth");
        const auth = await authRes.json();
        if (!auth.logado || auth.papel !== "gestor") {
          router.replace("/login?papel=gestor");
          return;
        }
        setSessao(auth);

        const res = await fetch("/api/requerimentos");
        const data = await res.json();
        setRequerimentos(data);
      } catch (err) {
        console.error("Erro ao carregar:", err);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [router]);

  async function handleUploadRetorno(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("tipo", "retorno");

    try {
      const res = await fetch("/api/requerimentos/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao fazer upload");
      }

      const data = await res.json();
      setForm({ ...form, documentoRetornoUrl: data.url, documentoRetornoNome: data.nome });
      alert("Documento anexado com sucesso!");
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleAnalise(e: FormEvent) {
    e.preventDefault();
    if (!form.status || !form.feedback) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    setAnalisando(true);
    try {
      const res = await fetch(`/api/requerimentos?id=${modalAnalise!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao analisar requerimento");
      }

      setModalAnalise(null);
      setForm({ status: "", feedback: "", documentoRetornoUrl: "", documentoRetornoNome: "" });
      
      // Recarregar lista
      const listaRes = await fetch("/api/requerimentos");
      const lista = await listaRes.json();
      setRequerimentos(lista);
      
      alert("Requerimento analisado com sucesso!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAnalisando(false);
    }
  }

  function abrirAnalise(req: Requerimento) {
    setModalDetalhes(null);
    setModalAnalise(req);
    setForm({
      status: "",
      feedback: "",
      documentoRetornoUrl: "",
      documentoRetornoNome: "",
    });
  }

  const requerimentosFiltrados = requerimentos.filter((req) => {
    if (filtro === "todos") return true;
    return req.status === filtro;
  });

  function getStatusColor(status: string) {
    switch (status) {
      case "pendente":
        return "bg-amber-100 text-amber-800 ring-amber-200";
      case "aprovado":
        return "bg-emerald-100 text-emerald-800 ring-emerald-200";
      case "rejeitado":
        return "bg-rose-100 text-rose-800 ring-rose-200";
      default:
        return "bg-slate-100 text-slate-800 ring-slate-200";
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "pendente":
        return "⏳";
      case "aprovado":
        return "✅";
      case "rejeitado":
        return "❌";
      default:
        return "📋";
    }
  }

  const pendentes = requerimentos.filter((r) => r.status === "pendente").length;
  const aprovados = requerimentos.filter((r) => r.status === "aprovado").length;
  const rejeitados = requerimentos.filter((r) => r.status === "rejeitado").length;

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
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Requerimentos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Analise e responda às solicitações dos servidores
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <p className="text-sm text-slate-600 mb-1">Total</p>
            <p className="text-3xl font-bold text-slate-900">{requerimentos.length}</p>
          </div>
          <div className="bg-amber-50 rounded-2xl shadow-sm border border-amber-200 p-5">
            <p className="text-sm text-amber-700 mb-1">Pendentes</p>
            <p className="text-3xl font-bold text-amber-900">{pendentes}</p>
          </div>
          <div className="bg-emerald-50 rounded-2xl shadow-sm border border-emerald-200 p-5">
            <p className="text-sm text-emerald-700 mb-1">Aprovados</p>
            <p className="text-3xl font-bold text-emerald-900">{aprovados}</p>
          </div>
          <div className="bg-rose-50 rounded-2xl shadow-sm border border-rose-200 p-5">
            <p className="text-sm text-rose-700 mb-1">Rejeitados</p>
            <p className="text-3xl font-bold text-rose-900">{rejeitados}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {["todos", "pendente", "aprovado", "rejeitado"].map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${
                filtro === f
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Lista */}
        {carregando ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-12 h-12 mx-auto border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-600">Carregando requerimentos...</p>
          </div>
        ) : requerimentosFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-4xl mb-4">
              📋
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum requerimento</h3>
            <p className="text-slate-600">
              {filtro === "todos"
                ? "Não há requerimentos no sistema"
                : `Não há requerimentos com status "${filtro}"`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requerimentosFiltrados.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ring-1 ${getStatusColor(req.status)}`}>
                        {getStatusIcon(req.status)}
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatarData(req.criadoEm)}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{req.assunto}</h3>
                    <p className="text-sm text-slate-600 mb-2">{req.tipo}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span>{req.servidor.nome}</span>
                      <span>·</span>
                      <span>{req.servidor.matricula}</span>
                      <span>·</span>
                      <span>{req.servidor.cargo}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setModalDetalhes(req)}
                    className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition"
                  >
                    Ver Detalhes
                  </button>
                  {req.status === "pendente" && (
                    <button
                      onClick={() => abrirAnalise(req)}
                      className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-sm transition"
                    >
                      Analisar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Detalhes */}
      <Modal
        aberto={!!modalDetalhes}
        onClose={() => setModalDetalhes(null)}
        titulo="Detalhes do Requerimento"
        largura="max-w-3xl"
      >
        {modalDetalhes && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ring-1 ${getStatusColor(modalDetalhes.status)}`}>
                  {getStatusIcon(modalDetalhes.status)}
                  {modalDetalhes.status.charAt(0).toUpperCase() + modalDetalhes.status.slice(1)}
                </span>
                <span className="text-sm text-slate-500">
                  Solicitado em {formatarData(modalDetalhes.criadoEm)}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">{modalDetalhes.assunto}</h3>
              <p className="text-sm text-slate-600">{modalDetalhes.tipo}</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Servidor</h4>
              <div className="space-y-1 text-sm">
                <p><span className="font-semibold">Nome:</span> {modalDetalhes.servidor.nome}</p>
                <p><span className="font-semibold">Matrícula:</span> {modalDetalhes.servidor.matricula}</p>
                <p><span className="font-semibold">Cargo:</span> {modalDetalhes.servidor.cargo}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Descrição</h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{modalDetalhes.descricao}</p>
            </div>

            {modalDetalhes.documentoUrl && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Documento Anexado</h4>
                <a
                  href={modalDetalhes.documentoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  {modalDetalhes.documentoNome}
                </a>
              </div>
            )}

            {modalDetalhes.status !== "pendente" && (
              <div className="border-t border-slate-200 pt-6">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Análise Realizada</h4>
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Analisado por:</span>
                    <span className="text-slate-600">{modalDetalhes.analisadoPor}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Data:</span>
                    <span className="text-slate-600">{formatarData(modalDetalhes.dataAnalise)}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-slate-700 mb-1">Feedback:</span>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{modalDetalhes.feedback}</p>
                  </div>
                  {modalDetalhes.documentoRetornoUrl && (
                    <div>
                      <span className="block text-sm font-semibold text-slate-700 mb-2">Documento de Retorno:</span>
                      <a
                        href={modalDetalhes.documentoRetornoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 rounded-lg text-sm font-medium text-emerald-700 transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        {modalDetalhes.documentoRetornoNome}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Análise */}
      <Modal
        aberto={!!modalAnalise}
        onClose={() => setModalAnalise(null)}
        titulo="Analisar Requerimento"
        largura="max-w-2xl"
      >
        {modalAnalise && (
          <form onSubmit={handleAnalise} className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Requerimento</h4>
              <p className="text-sm font-semibold text-slate-900 mb-1">{modalAnalise.assunto}</p>
              <p className="text-sm text-slate-600">{modalAnalise.tipo}</p>
              <p className="text-sm text-slate-500 mt-2">{modalAnalise.descricao}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Decisão *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, status: "aprovado" })}
                  className={`p-4 rounded-xl border-2 transition ${
                    form.status === "aprovado"
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="text-2xl mb-2">✅</div>
                  <p className="font-semibold text-slate-900">Aprovar</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Solicitação atendida
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, status: "rejeitado" })}
                  className={`p-4 rounded-xl border-2 transition ${
                    form.status === "rejeitado"
                      ? "border-rose-500 bg-rose-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="text-2xl mb-2">❌</div>
                  <p className="font-semibold text-slate-900">Rejeitar</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Solicitação negada
                  </p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Feedback *
              </label>
              <textarea
                value={form.feedback}
                onChange={(e) => setForm({ ...form, feedback: e.target.value })}
                placeholder="Informe o motivo da decisão e orientações ao servidor..."
                rows={5}
                className="input-modern"
                required
              />
            </div>

            {form.status === "aprovado" && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Documento de Retorno (opcional)
                </label>
                <input
                  type="file"
                  onChange={handleUploadRetorno}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="input-modern"
                />
                {form.documentoRetornoNome && (
                  <p className="text-sm text-emerald-600 mt-2">
                    ✅ {form.documentoRetornoNome}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  PDF, DOC, DOCX, JPG ou PNG (máx. 10MB)
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setModalAnalise(null)}
                className="flex-1 px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={analisando || !form.status}
                className="flex-1 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm transition disabled:opacity-50"
              >
                {analisando ? "Analisando..." : "Confirmar Análise"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
