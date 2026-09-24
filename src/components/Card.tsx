interface CardProps {
  titulo?: string;
  subtitulo?: string;
  children: React.ReactNode;
  className?: string;
  acao?: React.ReactNode;
}

export function Card({ titulo, subtitulo, children, className = "", acao }: CardProps) {
  return (
    <div className={`card-modern p-6 ${className}`}>
      {(titulo || acao) && (
        <div className="flex items-start justify-between mb-4 pb-4 border-b border-slate-200/60">
          <div>
            {titulo && (
              <h3 className="text-lg font-bold text-slate-900">{titulo}</h3>
            )}
            {subtitulo && (
              <p className="text-sm text-slate-500 mt-1">{subtitulo}</p>
            )}
          </div>
          {acao && <div>{acao}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

interface CampoProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function Campo({ label, children, className = "" }: CampoProps) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </dt>
      <dd className="text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}
