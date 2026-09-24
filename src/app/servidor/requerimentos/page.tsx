"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { formatarData } from "@/lib/format";

type Requerimento = {
  id: number;
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
};

const TIPOS_REQUERIMENTO = [
  "Declaração de Vínculo",
  "Declaração de Rendimentos",
  "Solicitação de Vantagem",
  "Cópia de Ficha Funcional",
  "Outros",
];

export default function RequerimentosPage() {
  const router = useRouter();
  const [sessao, setSessao] = useState<any>(null);
  const [requerimentos, setRequerimentos] = useState<Requerimento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState<Requerimento | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Form novo requerimento
  const [form, setForm] = useState({
    tipo: "",
    assunto: "",
    descricao: "",
    documentoUrl: "",
    documentoNome: "",
  });

  useEffect(() => {
    async function carregar() {
      try {
        const authRes = await fetch("/api/auth");
        const auth = await authRes.json();
        if (!auth.logado || auth.papel !== "servidor") {
          router.replace("/login?papel=servidor");
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.tipo || !form.assunto || !form.descricao) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/requerimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar requerimento");
      }

      setModalNovo(false);
      setForm({ tipo: "", assunto: "", descricao: "", documentoUrl: "", documentoNome: "" });
      
      // Recarregar lista
      const listaRes = await fetch("/api/requerimentos");
      const lista = await listaRes.json();
      setRequerimentos(lista);
      
      alert("Requerimento enviado com sucesso!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("tipo", "solicitacao");

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
      setForm({ ...form, documentoUrl: data.url, documentoNome: data.nome });
      alert("Documento anexado com sucesso!");
    } catch (err: any) {
      alert(err.message);
    }
  }

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

  if (!sessao) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header nome={sessao.nome} papel="servidor" voltarPara="/servidor" />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Meus Requerimentos</h1>
            <p className="text-sm text-slate-500 mt-1">
              Solicite documentos e vantagens à gestão
            </p>
          </div>
          <button
            onClick={() => setModalNovo(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo Requerimento
          </button>
        </div>

        {/* Lista de requerimentos */}
        {carregando ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-12 h-12 mx-auto border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-600">Carregando requerimentos...</p>
          </div>
        ) : requerimentos.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-4xl mb-4">
              📋
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum requerimento</h3>
            <p className="text-slate-600 mb-4">Você ainda não fez nenhuma solicitação</p>
            <button
              onClick={() => setModalNovo(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm transition"
            >
              Criar primeiro requerimento
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {requerimentos.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition cursor-pointer"
                onClick={() => setModalDetalhes(req)}
              >
                <div className="flex items-start justify-between gap-4">
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
                    <p className="text-sm text-slate-500 line-clamp-2">{req.descricao}</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-slate-400 flex-shrink-0">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Novo Requerimento */}
      <Modal
        aberto={modalNovo}
        onClose={() => setModalNovo(false)}
        titulo="Novo Requerimento"
        largura="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Tipo de Requerimento *
            </label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="input-modern"
              required
            >
              <option value="">Selecione...</option>
              {TIPOS_REQUERIMENTO.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Assunto *
            </label>
            <input
              type="text"
              value={form.assunto}
              onChange={(e) => setForm({ ...form, assunto: e.target.value })}
              placeholder="Ex: Solicitação de declaração de vínculo"
              className="input-modern"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Descrição Detalhada *
            </label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Descreva detalhadamente o que você precisa..."
              rows={5}
              className="input-modern"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Documento de Suporte (opcional)
            </label>
            <input
              type="file"
              onChange={handleUpload}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="input-modern"
            />
            {form.documentoNome && (
              <p className="text-sm text-emerald-600 mt-2">
                ✅ {form.documentoNome}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              PDF, DOC, DOCX, JPG ou PNG (máx. 10MB)
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setModalNovo(false)}
              className="flex-1 px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex-1 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm transition disabled:opacity-50"
            >
              {enviando ? "Enviando..." : "Enviar Requerimento"}
            </button>
          </div>
        </form>
      </Modal>

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
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Análise da Gestão</h4>
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
    </div>
  );
}
