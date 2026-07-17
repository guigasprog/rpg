"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addIniciativa,
  addMapTokenCustom,
  addMapTokenFromLore,
  addMyToken,
  ajustarRecursos,
  carregarCena,
  deleteCena,
  limparTokens,
  salvarCena,
  moveMapToken,
  removeMapToken,
  resizeMapToken,
  setMapFog,
  setRevelado,
  setTokenLado,
  setTokenLuz,
  setTokenLuzCone,
  setTokenLuzCor,
  setTokenLuzDir,
  setTokenLuzTinge,
  setTokenRot,
  setTokenStatus,
  setTokenTipo,
  updateMapSettings,
  usarItemRapido,
} from "@/lib/actions";
import {
  ATTRIBUTES,
  classLabel,
  levelLabel,
  subclassLabel,
} from "@/lib/game";
import { ResourceMeter } from "@/components/ResourceMeter";
import { ConditionBadges, TraumaBadges } from "@/components/Conditions";
import { DiceRoller } from "@/components/DiceRoller";
import { WeaponRoller } from "@/components/WeaponRoller";
import { ChatBox } from "@/components/ChatBox";
import { DiceStage, type StageData } from "@/components/DiceStage";
import { FogCanvas, type Luz } from "@/components/FogCanvas";

function fmtSigned(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

interface FichaRapida {
  id: string;
  ownerId: string | null;
  name: string;
  classe: string;
  subclasse: string | null;
  nivel: number;
  attrInvestigar: number;
  attrCombate: number;
  attrLabia: number;
  attrMente: number;
  especialistaFocos: string[];
  traumas: string[];
  pvAtual: number;
  pvMax: number;
  sanAtual: number;
  sanMax: number;
  condicoes: string[];
  inventory: {
    nome: string;
    dano: string;
    qtd: number;
    usos: number;
    efeitoPv: number;
    efeitoSan: number;
    dadoEfeito?: string;
    baseEfeito?: number;
    recurso?: string;
    especialista?: string;
    bonusEspecialista?: number;
    usosSemEspecialista?: number;
  }[];
}

interface MapCfg {
  id: string;
  backgroundUrl: string | null;
  cols: number;
  rows: number;
  cell: number;
  showGrid: boolean;
  fog: boolean;
  revelado: string[];
}
interface Token {
  id: string;
  nome: string;
  imageUrl: string | null;
  characterId: string | null;
  ownerId: string | null;
  lado: string;
  tipo: string;
  rot: number;
  status: string;
  luz: number;
  luzCor: string;
  luzCone: boolean;
  luzDir: number;
  luzTinge: boolean;
  size: number;
  x: number;
  y: number;
}

const LADOS = [
  { key: "ALIADO", label: "Aliado", cor: "#4ade80" },
  { key: "INIMIGO", label: "Inimigo", cor: "#b0332c" },
  { key: "NEUTRO", label: "Neutro", cor: "#e0c060" },
];

function ladoCor(lado: string): string {
  return LADOS.find((l) => l.key === lado)?.cor ?? "#e0c060";
}

const STATUS = [
  { key: "", label: "Nenhum", icone: "" },
  { key: "MORTO", label: "Morto", icone: "💀" },
  { key: "INCONSCIENTE", label: "Inconsciente", icone: "😵" },
  { key: "FERIDO", label: "Ferido", icone: "🩸" },
  { key: "ENVENENADO", label: "Envenenado", icone: "🤢" },
  { key: "ATORDOADO", label: "Atordoado", icone: "💫" },
  { key: "FUGINDO", label: "Fugindo", icone: "🏃" },
  { key: "ALVO", label: "Alvo", icone: "🎯" },
];

function statusIcone(key: string): string {
  return STATUS.find((s) => s.key === key)?.icone ?? "";
}

// Configuração do token (só o Mestre) na ficha rápida: tipo, lado e iluminação.
function LuzConfig({
  token,
  run,
}: {
  token: Token;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const ehProp = token.tipo === "PROP";
  return (
    <section className="paper paper-edge space-y-3 rounded-md p-3">
      <p className="label">Configuração (Mestre)</p>

      {/* Tipo: token (avatar) ou objeto PNG (girável) */}
      <div className="flex items-center gap-1">
        <span className="typewriter w-14 text-xs text-sepia-ink">Tipo</span>
        <button
          type="button"
          className={`btn tap text-xs ${!ehProp ? "btn-primary" : "btn-dark"}`}
          onClick={() => run(() => setTokenTipo(token.id, "TOKEN"))}
        >
          Token
        </button>
        <button
          type="button"
          className={`btn tap text-xs ${ehProp ? "btn-primary" : "btn-dark"}`}
          onClick={() => run(() => setTokenTipo(token.id, "PROP"))}
        >
          Objeto PNG
        </button>
      </div>

      {/* Lado (cor da borda) — só para tokens */}
      {!ehProp && (
        <div className="flex items-center gap-2">
          <span className="typewriter w-14 text-xs text-sepia-ink">Lado</span>
          {LADOS.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => run(() => setTokenLado(token.id, l.key))}
              title={l.label}
              className="h-4 w-4 rounded-full"
              style={{
                background: l.cor,
                outline:
                  token.lado === l.key
                    ? "2px solid rgba(51,41,27,0.8)"
                    : "none",
                outlineOffset: 1,
              }}
            />
          ))}
        </div>
      )}

      <div className="space-y-2 border-t border-sepia/25 pt-2">
      <p className="label">Iluminação</p>
      <div className="flex items-center gap-2">
        <span className="typewriter text-xs text-sepia-ink">Raio</span>
        <button
          type="button"
          className="btn btn-dark tap px-2 py-0.5 text-xs"
          onClick={() => run(() => setTokenLuz(token.id, Math.max(0, token.luz - 1)))}
        >
          −
        </button>
        <span className="typewriter w-6 text-center text-sm text-sepia-ink">
          {token.luz}
        </span>
        <button
          type="button"
          className="btn btn-dark tap px-2 py-0.5 text-xs"
          onClick={() => run(() => setTokenLuz(token.id, token.luz + 1))}
        >
          ＋
        </button>
        <span className="typewriter text-xs text-sepia">quadros</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="typewriter text-xs text-sepia-ink">Cor</span>
        <input
          type="color"
          value={token.luzCor || "#f2d79a"}
          onChange={(e) => run(() => setTokenLuzCor(token.id, e.target.value))}
          className="h-6 w-8 cursor-pointer rounded border border-sepia/40 bg-transparent p-0"
        />
        <button
          type="button"
          className={`btn tap text-xs ${token.luzCone ? "btn-primary" : "btn-dark"}`}
          onClick={() => run(() => setTokenLuzCone(token.id, !token.luzCone))}
          title="Lanterna (cone) na direção do token"
        >
          🔦 {token.luzCone ? "cone ✓" : "cone"}
        </button>
        <button
          type="button"
          className={`btn tap text-xs ${token.luzTinge ? "btn-primary" : "btn-dark"}`}
          onClick={() => run(() => setTokenLuzTinge(token.id, !token.luzTinge))}
          title="Filtro de cor na área iluminada (opcional)"
        >
          🎨 {token.luzTinge ? "filtro ✓" : "sem filtro"}
        </button>
      </div>
      <p className="typewriter text-[0.65rem] text-sepia-dark">
        Gire o cone pelo pin no mapa. Jogadores só enxergam o próprio brilho e o
        de objetos.
      </p>
      </div>
    </section>
  );
}

interface CharLite {
  id: string;
  name: string;
  portraitUrl: string | null;
}
interface LoreLite {
  id: string;
  titulo: string;
  imagemUrl: string | null;
  categoria: string;
}
interface PlaceItem {
  kind: "char" | "lore";
  id: string;
  name: string;
  portraitUrl: string | null;
}
interface MapData {
  map: MapCfg;
  tokens: Token[];
  turno: string | null;
  scenes?: { id: string; nome: string }[];
  viewerId: string | null;
  isMaster: boolean;
}

const POLL_MS = 4000;

export function CombatMap({
  initial,
  chars,
  lore = [],
}: {
  initial: MapData;
  chars: CharLite[];
  lore?: LoreLite[];
}) {
  const [data, setData] = useState<MapData>(initial);
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>(
    () => {
      const m: Record<string, { x: number; y: number }> = {};
      initial.tokens.forEach((t) => (m[t.id] = { x: t.x, y: t.y }));
      return m;
    },
  );
  const [view, setView] = useState({ scale: 1, tx: 24, ty: 24 });
  const [selIds, setSelIds] = useState<Set<string>>(new Set());
  const [marquee, setMarquee] = useState<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [asideOpen, setAsideOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [stage, setStage] = useState<StageData | null>(null);
  const [modo, setModo] = useState<"normal" | "nevoa" | "medir">("normal");
  const [revelado, setReveladoLocal] = useState<Set<string>>(
    () => new Set(initial.map.revelado),
  );
  const [medida, setMedida] = useState<{ x: number; y: number }[] | null>(null);
  const [rotDrag, setRotDrag] = useState<{ id: string; rot: number } | null>(
    null,
  );
  const [luzDrag, setLuzDrag] = useState<{ id: string; dir: number } | null>(
    null,
  );
  const [ficha, setFicha] = useState<FichaRapida | null>(null);
  const [fichaLoading, setFichaLoading] = useState(false);
  const [fichaTokenId, setFichaTokenId] = useState<string | null>(null);
  const [qtd, setQtd] = useState(1);
  const [placing, setPlacing] = useState<PlaceItem | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    initial.tokens.forEach((t) => (m[t.id] = t.size > 0 ? t.size : initial.map.cell));
    return m;
  });
  const [clip, setClip] = useState<{
    nome: string;
    imageUrl: string | null;
    lado: string;
    tipo: string;
    status: string;
    size: number;
    x: number;
    y: number;
  } | null>(null);

  const [bgUrlInput, setBgUrlInput] = useState(initial.map.backgroundUrl ?? "");
  const [cellInput, setCellInput] = useState(initial.map.cell);
  const [colsInput, setColsInput] = useState(initial.map.cols);
  const [rowsInput, setRowsInput] = useState(initial.map.rows);
  const [tkNome, setTkNome] = useState("");
  const [tkImg, setTkImg] = useState("");
  const [tkLado, setTkLado] = useState("INIMIGO");
  const [tkTipo, setTkTipo] = useState("TOKEN");
  const [cenaNome, setCenaNome] = useState("");

  const isMaster = data.isMaster;
  const cell = data.map.cell;
  const areaW = data.map.cols * cell;
  const areaH = data.map.rows * cell;
  const podeEditar =
    !!ficha && (isMaster || ficha.ownerId === data.viewerId);
  const dtoken = data.tokens.find((x) => x.id === fichaTokenId) ?? null;

  // Fontes de luz visíveis para o viewer: o Mestre vê todas; o jogador só o
  // brilho do próprio token e o de objetos (PROP) — o dos outros fica oculto.
  const luzes: Luz[] = data.tokens
    .filter((t) => t.luz > 0)
    .filter(
      (t) =>
        isMaster || t.ownerId === data.viewerId || t.tipo === "PROP",
    )
    .map((t) => {
      const p = pos[t.id] ?? { x: t.x, y: t.y };
      const sz = sizes[t.id] ?? (t.size > 0 ? t.size : cell);
      return {
        x: p.x + sz / 2,
        y: p.y + sz / 2,
        r: t.luz * cell,
        cor: t.luzCor || "#f2d79a",
        cone: t.luzCone,
        dir: luzDrag?.id === t.id ? luzDrag.dir : t.luzDir,
        tinge: t.luzTinge,
      };
    });

  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    kind:
      | "pan"
      | "token"
      | "resize"
      | "marquee"
      | "nevoa"
      | "medir"
      | "rotate"
      | "luzrot";
    id?: string;
    canMove?: boolean;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
    osize?: number;
    rotVal?: number;
    moved?: boolean;
    shift?: boolean;
    origPos?: Record<string, { x: number; y: number }>;
  } | null>(null);
  const pinnedRef = useRef<Set<string>>(new Set());
  const lastTurnoRef = useRef<string | null>(null);

  const puxar = useCallback(async () => {
    try {
      const res = await fetch("/api/mapa", { cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as MapData;
      setData(d);
      setPos((prev) => {
        const m: Record<string, { x: number; y: number }> = {};
        d.tokens.forEach((t) => {
          m[t.id] =
            pinnedRef.current.has(t.id) || dragRef.current?.id === t.id
              ? (prev[t.id] ?? { x: t.x, y: t.y })
              : { x: t.x, y: t.y };
        });
        return m;
      });
      setSizes((prev) => {
        const m: Record<string, number> = {};
        d.tokens.forEach((t) => {
          const base = t.size > 0 ? t.size : d.map.cell;
          m[t.id] =
            pinnedRef.current.has(t.id) || dragRef.current?.id === t.id
              ? (prev[t.id] ?? base)
              : base;
        });
        return m;
      });
      // Sincroniza névoa (a menos que o Mestre esteja pintando agora).
      if (dragRef.current?.kind !== "nevoa") {
        setReveladoLocal(new Set(d.map.revelado));
      }
    } catch {
      /* ignora */
    }
  }, []);

  useEffect(() => {
    const t = setInterval(puxar, POLL_MS);
    return () => clearInterval(t);
  }, [puxar]);

  const zoom = useCallback((f: number, cx?: number, cy?: number) => {
    setView((v) => {
      const scale = Math.min(2.5, Math.max(0.2, v.scale * f));
      const rect = wrapRef.current?.getBoundingClientRect();
      const px = cx ?? (rect ? rect.width / 2 : 0);
      const py = cy ?? (rect ? rect.height / 2 : 0);
      const wx = (px - v.tx) / v.scale;
      const wy = (py - v.ty) / v.scale;
      return { scale, tx: px - wx * scale, ty: py - wy * scale };
    });
  }, []);

  // Zoom com a roda SOMENTE sobre o mapa (não rola a página).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [zoom]);

  const run = useCallback(
    async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
      setErro(null);
      const r = await fn();
      if (!r.ok) setErro(r.error ?? "Falha.");
      puxar();
    },
    [puxar],
  );

  // Foca (centraliza) o token de quem está no turno quando o turno muda.
  useEffect(() => {
    const turno = data.turno;
    if (!turno || turno === lastTurnoRef.current) return;
    lastTurnoRef.current = turno;
    const alvo = turno.trim().toLowerCase();
    const t = data.tokens.find(
      (x) => x.nome.trim() !== "" && x.nome.trim().toLowerCase() === alvo,
    );
    const el = wrapRef.current;
    if (!t || !el) return;
    const p = pos[t.id] ?? { x: t.x, y: t.y };
    const size = t.size > 0 ? t.size : cell;
    const cx = p.x + size / 2;
    const cy = p.y + size / 2;
    const rect = el.getBoundingClientRect();
    setView((v) => ({
      ...v,
      tx: rect.width / 2 - cx * v.scale,
      ty: rect.height / 2 - cy * v.scale,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.turno, data.tokens, cell]);

  // Trava a rolagem da página enquanto a ficha rápida está aberta (o conteúdo
  // do próprio painel continua rolando).
  useEffect(() => {
    if (!ficha && !fichaLoading) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [ficha, fichaLoading]);

  // Delete/Backspace remove o token selecionado (que você controla).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (selIds.size === 0) return;
      const alvos = data.tokens.filter(
        (t) =>
          selIds.has(t.id) && (isMaster || t.ownerId === data.viewerId),
      );
      if (alvos.length === 0) return;
      e.preventDefault();
      setSelIds(new Set());
      alvos.forEach((t) => void run(() => removeMapToken(t.id)));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selIds, data, isMaster, run]);

  // Ctrl+C / Ctrl+V: copiar e colar token (Mestre).
  useEffect(() => {
    if (!isMaster) return;
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const k = e.key.toLowerCase();
      if (k === "c" && selIds.size === 1) {
        const only = [...selIds][0];
        const t = data.tokens.find((x) => x.id === only);
        if (!t) return;
        const p = pos[t.id] ?? { x: t.x, y: t.y };
        setClip({
          nome: t.nome,
          imageUrl: t.imageUrl,
          lado: t.lado,
          tipo: t.tipo,
          status: t.status,
          size: sizes[t.id] ?? t.size,
          x: p.x,
          y: p.y,
        });
        e.preventDefault();
      } else if (k === "v" && clip) {
        e.preventDefault();
        const nx = clip.x + cell;
        const ny = clip.y + cell;
        setClip({ ...clip, x: nx, y: ny });
        void run(() =>
          addMapTokenCustom(
            clip.nome,
            clip.imageUrl ?? "",
            clip.lado,
            nx,
            ny,
            clip.tipo,
          ),
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMaster, selIds, data, pos, sizes, clip, cell, run]);

  // Arrastar um card (personagem/monstro) e soltar no mapa — pointer capture
  // no próprio card garante que o "puxar" funcione até soltar.
  function iniciarPuxar(item: PlaceItem, e: React.PointerEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setPlacing(item);
    setGhost({ x: e.clientX, y: e.clientY });
  }
  function moverPuxar(e: React.PointerEvent) {
    if (placing) setGhost({ x: e.clientX, y: e.clientY });
  }
  function soltarPuxar(e: React.PointerEvent) {
    if (!placing) return;
    const item = placing;
    setPlacing(null);
    setGhost(null);
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    )
      return; // soltou fora do mapa → cancela
    const wx = (e.clientX - rect.left - view.tx) / view.scale - cell / 2;
    const wy = (e.clientY - rect.top - view.ty) / view.scale - cell / 2;
    const sx = Math.round(wx / cell) * cell;
    const sy = Math.round(wy / cell) * cell;
    void run(() =>
      item.kind === "lore"
        ? addMapTokenFromLore(item.id, sx, sy)
        : addMyToken(item.id, sx, sy),
    );
  }

  function worldDelta(dx: number, dy: number) {
    return { dx: dx / view.scale, dy: dy / view.scale };
  }

  function onDownToken(e: React.PointerEvent, t: Token) {
    // Botão direito sobre o token → não intercepta; deixa o fundo panear.
    if (e.button === 2 || e.button === 1) return;
    // Em modos de névoa/régua, o token não intercepta (o fundo cuida).
    if (modo !== "normal") return;
    e.stopPropagation();
    // Ctrl+Shift+clique: põe o token na ordem de combate (Mestre).
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      if (isMaster && t.nome.trim()) void run(() => addIniciativa(t.nome, 0));
      return;
    }
    // Ctrl+clique: amplia a imagem do token.
    if (e.ctrlKey || e.metaKey) {
      if (t.imageUrl) setZoomUrl(t.imageUrl);
      return;
    }
    const canMove = isMaster || t.ownerId === data.viewerId;
    if (canMove) (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = pos[t.id] ?? { x: t.x, y: t.y };
    // Move em grupo: se o token faz parte de uma seleção múltipla, arrasta
    // todos os selecionados que você controla.
    const grupo =
      selIds.has(t.id) && selIds.size > 1
        ? data.tokens.filter(
            (x) =>
              selIds.has(x.id) && (isMaster || x.ownerId === data.viewerId),
          )
        : [t];
    const origPos: Record<string, { x: number; y: number }> = {};
    grupo.forEach((x) => (origPos[x.id] = pos[x.id] ?? { x: x.x, y: x.y }));
    dragRef.current = {
      kind: "token",
      id: t.id,
      canMove,
      startX: e.clientX,
      startY: e.clientY,
      ox: p.x,
      oy: p.y,
      moved: false,
      shift: e.shiftKey,
      origPos,
    };
  }

  function pontoMundo(e: { clientX: number; clientY: number }) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left - view.tx) / view.scale,
      y: (e.clientY - rect.top - view.ty) / view.scale,
    };
  }

  function pintarCelula(e: { clientX: number; clientY: number }) {
    const w = pontoMundo(e);
    const col = Math.floor(w.x / cell);
    const row = Math.floor(w.y / cell);
    if (col < 0 || row < 0 || col >= data.map.cols || row >= data.map.rows) return;
    setReveladoLocal((prev) => {
      const n = new Set(prev);
      n.add(`${col},${row}`);
      return n;
    });
  }

  function onDownBg(e: React.PointerEvent) {
    // Botão direito/meio/toque → arrasta o tabuleiro (em qualquer modo).
    const panear = e.button === 2 || e.button === 1 || e.pointerType === "touch";
    if (panear) {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      dragRef.current = {
        kind: "pan",
        startX: e.clientX,
        startY: e.clientY,
        ox: view.tx,
        oy: view.ty,
      };
      return;
    }
    // Régua: mede distância em quadros (botão direito adiciona vértice).
    if (modo === "medir") {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      const w = pontoMundo(e);
      dragRef.current = { kind: "medir", startX: e.clientX, startY: e.clientY, ox: 0, oy: 0 };
      setMedida([w, { ...w }]);
      return;
    }
    // Névoa (Mestre): pinta células reveladas.
    if (modo === "nevoa" && isMaster) {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      dragRef.current = { kind: "nevoa", startX: e.clientX, startY: e.clientY, ox: 0, oy: 0 };
      pintarCelula(e);
      return;
    }
    // Normal: caixa de seleção múltipla.
    if (!e.shiftKey) setSelIds(new Set());
    dragRef.current = {
      kind: "marquee",
      startX: e.clientX,
      startY: e.clientY,
      ox: 0,
      oy: 0,
      shift: e.shiftKey,
    };
    setMarquee({ x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY });
  }

  function onDownResize(e: React.PointerEvent, t: Token) {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      kind: "resize",
      id: t.id,
      startX: e.clientX,
      startY: e.clientY,
      ox: 0,
      oy: 0,
      osize: sizes[t.id] ?? (t.size > 0 ? t.size : cell),
    };
  }

  function onDownRot(e: React.PointerEvent, t: Token) {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const rect = wrapRef.current?.getBoundingClientRect();
    const p = pos[t.id] ?? { x: t.x, y: t.y };
    const sz = sizes[t.id] ?? (t.size > 0 ? t.size : cell);
    const cx = (rect?.left ?? 0) + view.tx + (p.x + sz / 2) * view.scale;
    const cy = (rect?.top ?? 0) + view.ty + (p.y + sz / 2) * view.scale;
    dragRef.current = {
      kind: "rotate",
      id: t.id,
      startX: e.clientX,
      startY: e.clientY,
      ox: cx,
      oy: cy,
      rotVal: t.rot,
    };
    setRotDrag({ id: t.id, rot: t.rot });
  }

  function onDownLuz(e: React.PointerEvent, t: Token) {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const rect = wrapRef.current?.getBoundingClientRect();
    const p = pos[t.id] ?? { x: t.x, y: t.y };
    const sz = sizes[t.id] ?? (t.size > 0 ? t.size : cell);
    const cx = (rect?.left ?? 0) + view.tx + (p.x + sz / 2) * view.scale;
    const cy = (rect?.top ?? 0) + view.ty + (p.y + sz / 2) * view.scale;
    dragRef.current = {
      kind: "luzrot",
      id: t.id,
      startX: e.clientX,
      startY: e.clientY,
      ox: cx,
      oy: cy,
      rotVal: t.luzDir,
    };
    setLuzDrag({ id: t.id, dir: t.luzDir });
  }

  function onMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    if ((d.kind === "rotate" || d.kind === "luzrot") && d.id) {
      let deg =
        (Math.atan2(e.clientY - d.oy, e.clientX - d.ox) * 180) / Math.PI + 90;
      deg = ((Math.round(deg) % 360) + 360) % 360;
      if (d.kind === "rotate" && !e.shiftKey) deg = Math.round(deg / 90) * 90;
      d.rotVal = deg;
      const id = d.id;
      if (d.kind === "rotate") setRotDrag({ id, rot: deg });
      else setLuzDrag({ id, dir: deg });
      return;
    }
    if (d.kind === "pan") {
      setView((v) => ({
        ...v,
        tx: d.ox + (e.clientX - d.startX),
        ty: d.oy + (e.clientY - d.startY),
      }));
    } else if (d.kind === "marquee") {
      setMarquee((mq) =>
        mq ? { ...mq, x1: e.clientX, y1: e.clientY } : mq,
      );
    } else if (d.kind === "medir") {
      const w = pontoMundo(e);
      setMedida((m) => {
        if (!m || m.length === 0) return m;
        const n = m.slice();
        n[n.length - 1] = w; // último ponto acompanha o cursor
        return n;
      });
    } else if (d.kind === "nevoa") {
      pintarCelula(e);
    } else if (d.kind === "token" && d.id && d.canMove) {
      if (Math.abs(e.clientX - d.startX) > 2 || Math.abs(e.clientY - d.startY) > 2)
        d.moved = true;
      d.shift = e.shiftKey; // Shift ao mover = posição livre (sem encaixe)
      const { dx, dy } = worldDelta(e.clientX - d.startX, e.clientY - d.startY);
      const orig = d.origPos ?? {};
      setPos((m) => {
        const next = { ...m };
        for (const id of Object.keys(orig)) {
          next[id] = { x: orig[id].x + dx, y: orig[id].y + dy };
        }
        return next;
      });
    } else if (d.kind === "resize" && d.id) {
      const delta =
        Math.max(e.clientX - d.startX, e.clientY - d.startY) / view.scale;
      let ns = (d.osize ?? cell) + delta;
      // Sem Shift: encaixa em múltiplos do quadro. Com Shift: livre.
      ns = e.shiftKey
        ? Math.max(16, ns)
        : Math.max(cell, Math.round(ns / cell) * cell);
      const id = d.id;
      setSizes((m) => ({ ...m, [id]: ns }));
    }
  }

  function onUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.kind === "rotate" && d.id) {
      const id = d.id;
      const r = d.rotVal ?? 0;
      void (async () => {
        await setTokenRot(id, r);
        await puxar();
        setRotDrag(null);
      })();
      return;
    }
    if (d?.kind === "luzrot" && d.id) {
      const id = d.id;
      const r = d.rotVal ?? 0;
      void (async () => {
        await setTokenLuzDir(id, r);
        await puxar();
        setLuzDrag(null);
      })();
      return;
    }
    if (d?.kind === "nevoa") {
      setReveladoLocal((atual) => {
        void run(() => setRevelado([...atual]));
        return atual;
      });
      return;
    }
    if (d?.kind === "medir") {
      return; // mantém a medida na tela até a próxima
    }
    if (d?.kind === "marquee") {
      const mq = marquee;
      setMarquee(null);
      const el = wrapRef.current;
      if (mq && el) {
        const rect = el.getBoundingClientRect();
        const minX = Math.min(mq.x0, mq.x1);
        const maxX = Math.max(mq.x0, mq.x1);
        const minY = Math.min(mq.y0, mq.y1);
        const maxY = Math.max(mq.y0, mq.y1);
        const dentro = new Set<string>(d.shift ? selIds : []);
        for (const t of data.tokens) {
          const p = pos[t.id] ?? { x: t.x, y: t.y };
          const size = t.size > 0 ? t.size : cell;
          const scx = rect.left + view.tx + (p.x + size / 2) * view.scale;
          const scy = rect.top + view.ty + (p.y + size / 2) * view.scale;
          if (scx >= minX && scx <= maxX && scy >= minY && scy <= maxY)
            dentro.add(t.id);
        }
        setSelIds(dentro);
      }
      return;
    }
    if (d?.kind === "token" && d.id) {
      if (d.canMove && d.moved) {
        const orig = d.origPos ?? {};
        const livre = d.shift; // Shift = ignora o encaixe na grade
        setPos((m) => {
          const next = { ...m };
          for (const id of Object.keys(orig)) {
            const p = next[id];
            if (!p) continue;
            const sx = livre ? Math.round(p.x) : Math.round(p.x / cell) * cell;
            const sy = livre ? Math.round(p.y) : Math.round(p.y / cell) * cell;
            next[id] = { x: sx, y: sy };
            pinnedRef.current.add(id);
            setTimeout(() => pinnedRef.current.delete(id), 6000);
            void run(() => moveMapToken(id, sx, sy));
          }
          return next;
        });
      } else {
        // clique curto → seleciona (Shift alterna dentro do conjunto)
        const id = d.id;
        setSelIds((prev) => {
          if (d.shift) {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
          }
          return new Set([id]);
        });
      }
    } else if (d?.kind === "resize" && d.id) {
      const id = d.id;
      const s = sizes[id];
      pinnedRef.current.add(id);
      setTimeout(() => pinnedRef.current.delete(id), 6000);
      if (typeof s === "number") void run(() => resizeMapToken(id, Math.round(s)));
    }
  }

  async function abrirFicha(characterId: string) {
    setFichaLoading(true);
    setFicha(null);
    try {
      const res = await fetch(`/api/ficha?id=${encodeURIComponent(characterId)}`, {
        cache: "no-store",
      });
      if (res.ok) setFicha((await res.json()) as FichaRapida);
      else setErro("Não foi possível abrir a ficha.");
    } catch {
      setErro("Falha ao abrir a ficha.");
    } finally {
      setFichaLoading(false);
    }
  }

  // Abre o drawer para um token (personagem → ficha; objeto → só iluminação/GM).
  function abrirTokenDrawer(t: Token) {
    setFichaTokenId(t.id);
    if (t.characterId) {
      void abrirFicha(t.characterId);
    } else {
      setFicha(null);
      setFichaLoading(false);
    }
  }

  function fecharDrawer() {
    setFicha(null);
    setFichaLoading(false);
    setFichaTokenId(null);
  }

  async function ajustar(dPv: number, dSan: number) {
    if (!ficha) return;
    const id = ficha.id;
    // Atualização otimista dos números no drawer.
    setFicha((f) =>
      f ? { ...f, pvAtual: f.pvAtual + dPv, sanAtual: f.sanAtual + dSan } : f,
    );
    await run(() => ajustarRecursos(id, dPv, dSan));
    void abrirFicha(id);
  }

  const jaTenhoToken = (charId: string) =>
    data.tokens.some((t) => t.characterId === charId);

  return (
    <div className="lg:flex lg:items-start lg:gap-3">
      {/* Painel de customização (recolhível) */}
      {!asideOpen && (
        <button
          type="button"
          onClick={() => setAsideOpen(true)}
          className="btn btn-dark tap mb-3 text-xs lg:mb-0"
          title="Abrir painel"
        >
          » Painel
        </button>
      )}
      <aside
        className={`mb-3 space-y-3 lg:mb-0 lg:max-h-[80vh] lg:shrink-0 lg:overflow-y-auto ${asideOpen ? "lg:w-72" : "hidden"}`}
      >
        <div className="flex items-center justify-between">
          <span className="label">Painel</span>
          <button
            type="button"
            onClick={() => setAsideOpen(false)}
            className="btn btn-ghost tap text-xs"
            title="Recolher painel"
          >
            « ocultar
          </button>
        </div>
        {chars.length > 0 && (
          <section className="paper paper-edge rounded-md p-3">
            <p className="label mb-2">
              {isMaster ? "Colocar personagem" : "Seus personagens"}
            </p>
            <p className="typewriter mb-1 text-[0.65rem] text-sepia-dark">
              Arraste o card para o mapa, no lugar onde o token deve ficar.
            </p>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {chars.map((c) => {
                const on = jaTenhoToken(c.id);
                return (
                  <div
                    key={c.id}
                    onPointerDown={(e) =>
                      iniciarPuxar(
                        {
                          kind: "char",
                          id: c.id,
                          name: c.name,
                          portraitUrl: c.portraitUrl,
                        },
                        e,
                      )
                    }
                    onPointerMove={moverPuxar}
                    onPointerUp={soltarPuxar}
                    className={`flex touch-none cursor-grab select-none items-center gap-2 rounded border border-sepia/25 bg-black/[0.03] p-1.5 active:cursor-grabbing ${placing?.kind === "char" && placing.id === c.id ? "opacity-40" : ""}`}
                  >
                    <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-black/15">
                      {c.portraitUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.portraitUrl}
                          alt=""
                          draggable={false}
                          className="h-full w-full object-cover grayscale"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs text-sepia/50">
                          ?
                        </span>
                      )}
                    </span>
                    <span className="typewriter min-w-0 flex-1 truncate text-sm text-sepia-ink">
                      {c.name}
                    </span>
                    <span className="typewriter shrink-0 text-[0.65rem] text-sepia">
                      {on ? "no mapa ✓ ↦" : "↦ arraste"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {isMaster && (
          <>
            <section className="paper paper-edge space-y-2 rounded-md p-3">
              <p className="label">Campo (quadros)</p>
              <div className="flex items-end gap-2">
                <div className="w-16">
                  <label className="label">X (col)</label>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    className="field mt-1 text-sm"
                    value={colsInput}
                    onChange={(e) => setColsInput(Number(e.target.value) || 1)}
                  />
                </div>
                <div className="w-16">
                  <label className="label">Y (lin)</label>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    className="field mt-1 text-sm"
                    value={rowsInput}
                    onChange={(e) => setRowsInput(Number(e.target.value) || 1)}
                  />
                </div>
                <div className="w-20">
                  <label className="label">Quadro px</label>
                  <input
                    type="number"
                    min={16}
                    max={240}
                    className="field mt-1 text-sm"
                    value={cellInput}
                    onChange={(e) => setCellInput(Number(e.target.value) || 64)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-dark tap text-xs"
                  onClick={() =>
                    run(() =>
                      updateMapSettings({
                        cols: colsInput,
                        rows: rowsInput,
                        cell: cellInput,
                      }),
                    )
                  }
                >
                  Gerar campo
                </button>
                <button
                  type="button"
                  className={`btn tap text-xs ${data.map.showGrid ? "btn-primary" : "btn-dark"}`}
                  onClick={() =>
                    run(() => updateMapSettings({ showGrid: !data.map.showGrid }))
                  }
                >
                  {data.map.showGrid ? "grade ✓" : "grade off"}
                </button>
              </div>
            </section>

            <section className="paper paper-edge space-y-2 rounded-md p-3">
              <p className="label">Imagem de fundo</p>
              <input
                className="field text-sm"
                value={bgUrlInput}
                onChange={(e) => setBgUrlInput(e.target.value)}
                placeholder="https://… (vazio = sem imagem)"
              />
              <p className="typewriter text-[0.65rem] text-sepia-dark">
                A imagem se encaixa exatamente no campo {data.map.cols}×
                {data.map.rows}.
              </p>
              <button
                type="button"
                className="btn btn-dark tap text-xs"
                onClick={() =>
                  run(() => updateMapSettings({ backgroundUrl: bgUrlInput }))
                }
              >
                Definir fundo
              </button>
            </section>

            <section className="paper paper-edge space-y-2 rounded-md p-3">
              <p className="label">Token avulso / objeto</p>
              <input
                className="field text-sm"
                value={tkNome}
                onChange={(e) => setTkNome(e.target.value)}
                placeholder="Nome"
              />
              <input
                className="field text-sm"
                value={tkImg}
                onChange={(e) => setTkImg(e.target.value)}
                placeholder="Imagem (URL/PNG, opcional)"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTkTipo("TOKEN")}
                  className={`btn tap text-[0.65rem] ${tkTipo === "TOKEN" ? "btn-primary" : "btn-dark"}`}
                >
                  Token
                </button>
                <button
                  type="button"
                  onClick={() => setTkTipo("PROP")}
                  className={`btn tap text-[0.65rem] ${tkTipo === "PROP" ? "btn-primary" : "btn-dark"}`}
                  title="Objeto/cenário: PNG completo, girável (ex.: tocha, poste, lampião)"
                >
                  Objeto PNG
                </button>
              </div>
              {tkTipo === "TOKEN" && (
              <div className="flex items-center gap-1">
                {LADOS.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => setTkLado(l.key)}
                    className={`typewriter rounded-full px-2 py-0.5 text-[0.65rem] ${tkLado === l.key ? "text-ink" : "text-sepia"}`}
                    style={{
                      background: tkLado === l.key ? l.cor : "transparent",
                      border: `1px solid ${l.cor}`,
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-dark tap text-xs"
                  disabled={!tkNome.trim() && !tkImg.trim()}
                  onClick={() =>
                    run(async () => {
                      const r = await addMapTokenCustom(
                        tkNome,
                        tkImg,
                        tkLado,
                        undefined,
                        undefined,
                        tkTipo,
                      );
                      if (r.ok) {
                        setTkNome("");
                        setTkImg("");
                      }
                      return r;
                    })
                  }
                >
                  {tkTipo === "PROP" ? "＋ Objeto" : "＋ Token"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost tap text-xs"
                  onClick={() => {
                    if (confirm("Limpar TODOS os tokens do mapa?"))
                      run(limparTokens);
                  }}
                >
                  Limpar tokens
                </button>
              </div>
            </section>

            {lore.length > 0 && (
              <section className="paper paper-edge rounded-md p-3">
                <p className="label mb-1">Do Livro (monstros/PNJs)</p>
                <p className="typewriter mb-1 text-[0.65rem] text-sepia-dark">
                  Arraste para o mapa.
                </p>
                <div className="max-h-56 space-y-1 overflow-y-auto">
                  {lore.map((l) => (
                    <div
                      key={l.id}
                      onPointerDown={(e) =>
                        iniciarPuxar(
                          {
                            kind: "lore",
                            id: l.id,
                            name: l.titulo,
                            portraitUrl: l.imagemUrl,
                          },
                          e,
                        )
                      }
                      onPointerMove={moverPuxar}
                      onPointerUp={soltarPuxar}
                      className={`flex touch-none cursor-grab select-none items-center gap-2 rounded border border-sepia/25 bg-black/[0.03] p-1.5 active:cursor-grabbing ${placing?.kind === "lore" && placing.id === l.id ? "opacity-40" : ""}`}
                    >
                      <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-black/15">
                        {l.imagemUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={l.imagemUrl}
                            alt=""
                            draggable={false}
                            className="h-full w-full object-cover grayscale"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs text-sepia/50">
                            ?
                          </span>
                        )}
                      </span>
                      <span className="typewriter min-w-0 flex-1 truncate text-sm text-sepia-ink">
                        {l.titulo}
                      </span>
                      <span className="typewriter shrink-0 text-[0.65rem] text-sepia">
                        ↦
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Cenas: salvar/arquivar o mapa e puxar a mesa */}
            <section className="paper paper-edge space-y-2 rounded-md p-3">
              <p className="label">Cenas do mapa</p>
              <div className="flex gap-1">
                <input
                  className="field text-sm"
                  value={cenaNome}
                  onChange={(e) => setCenaNome(e.target.value)}
                  placeholder="Nome da cena"
                />
                <button
                  type="button"
                  className="btn btn-dark tap text-xs"
                  disabled={!cenaNome.trim()}
                  onClick={() =>
                    run(async () => {
                      const r = await salvarCena(cenaNome);
                      if (r.ok) setCenaNome("");
                      return r;
                    })
                  }
                >
                  Salvar
                </button>
              </div>
              {(data.scenes ?? []).length === 0 ? (
                <p className="typewriter text-[0.65rem] text-sepia-dark">
                  Nenhuma cena salva.
                </p>
              ) : (
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {(data.scenes ?? []).map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-1 rounded border border-sepia/25 bg-black/[0.03] p-1"
                    >
                      <span className="typewriter min-w-0 flex-1 truncate text-xs text-sepia-ink">
                        {s.nome}
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary tap text-[0.65rem]"
                        title="Carregar (puxa a mesa para esta cena)"
                        onClick={() => {
                          if (confirm(`Carregar "${s.nome}"? Substitui o mapa e os tokens atuais.`))
                            run(() => carregarCena(s.id));
                        }}
                      >
                        Carregar
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost tap text-[0.65rem]"
                        onClick={() => {
                          if (confirm(`Apagar a cena "${s.nome}"?`))
                            run(() => deleteCena(s.id));
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {LADOS.map((l) => (
            <span
              key={l.key}
              className="typewriter inline-flex items-center gap-1 text-[0.65rem] text-paper/60"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: l.cor }}
              />
              {l.label}
            </span>
          ))}
        </div>
        <p className="typewriter text-[0.7rem] text-paper/45">
          <strong>Botão direito</strong> arrasta o tabuleiro; arrastar com o{" "}
          <strong>esquerdo</strong> faz uma caixa de seleção (vários tokens).
          Arraste um token para mover (segure <strong>Shift</strong> para soltar
          em qualquer lugar, sem grade). <strong>Delete</strong> remove os
          selecionados; a alça ◢ redimensiona. Duplo-clique abre a ficha rápida;
          Ctrl+clique amplia a imagem.{" "}
          {isMaster
            ? "Ctrl+Shift+clique põe na iniciativa; Ctrl+C / Ctrl+V copia e cola. "
            : ""}
          A câmera foca quem está no turno. A roda do mouse dá zoom só sobre o
          mapa. Barra de modos (canto sup. esq.): 📏 régua mede em quadros
          {isMaster ? "; 🌫️ pinta a névoa e o botão liga/desliga a névoa de guerra" : ""}.
        </p>
        {erro && <p className="typewriter text-xs text-stamp">{erro}</p>}
      </aside>

      {/* Mapa */}
      <div className="relative flex-1">
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
          <button
            type="button"
            onClick={() => zoom(1 / 1.2)}
            className="btn btn-dark tap text-xs"
          >
            −
          </button>
          <span className="typewriter w-11 rounded bg-ink/70 text-center text-xs text-paper/80">
            {Math.round(view.scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => zoom(1.2)}
            className="btn btn-dark tap text-xs"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setView({ scale: 1, tx: 24, ty: 24 })}
            className="btn btn-ghost tap text-xs"
          >
            Centralizar
          </button>
        </div>

        {/* Modos: seleção / névoa (GM) / régua */}
        <div className="absolute left-2 top-2 z-10 flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setModo("normal")}
            className={`btn tap text-xs ${modo === "normal" ? "btn-primary" : "btn-dark"}`}
          >
            ✋
          </button>
          <button
            type="button"
            onClick={() => {
              setModo("medir");
              setMedida(null);
            }}
            className={`btn tap text-xs ${modo === "medir" ? "btn-primary" : "btn-dark"}`}
            title="Régua: arraste p/ medir; botão direito adiciona um vértice (dobra)"
          >
            📏
          </button>
          {isMaster && (
            <>
              <button
                type="button"
                onClick={() => setModo("nevoa")}
                className={`btn tap text-xs ${modo === "nevoa" ? "btn-primary" : "btn-dark"}`}
                title="Névoa: pinte as células reveladas"
              >
                🌫️
              </button>
              <button
                type="button"
                onClick={() => run(() => setMapFog(!data.map.fog))}
                className={`btn tap text-xs ${data.map.fog ? "btn-primary" : "btn-dark"}`}
                title="Ligar/desligar névoa de guerra"
              >
                {data.map.fog ? "névoa ✓" : "névoa"}
              </button>
              {data.map.fog && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const todas: string[] = [];
                      for (let c = 0; c < data.map.cols; c++)
                        for (let r = 0; r < data.map.rows; r++)
                          todas.push(`${c},${r}`);
                      setReveladoLocal(new Set(todas));
                      run(() => setRevelado(todas));
                    }}
                    className="btn btn-ghost tap text-xs"
                  >
                    revelar tudo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReveladoLocal(new Set());
                      run(() => setRevelado([]));
                    }}
                    className="btn btn-ghost tap text-xs"
                  >
                    ocultar tudo
                  </button>
                </>
              )}
            </>
          )}
        </div>

        <div
          ref={wrapRef}
          onPointerDown={onDownBg}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          onDoubleClick={(e) => e.preventDefault()}
          onContextMenu={(e) => {
            e.preventDefault();
            // Régua: com o esquerdo segurado, o direito fixa um vértice.
            if (dragRef.current?.kind === "medir") {
              setMedida((m) =>
                m && m.length ? [...m, { ...m[m.length - 1] }] : m,
              );
            }
          }}
          className={`quadro relative h-[80vh] w-full touch-none select-none overflow-hidden rounded-md ${placing ? "ring-2 ring-stamp-bright" : ""}`}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
            }}
          >
            {/* Fundo (encaixado no campo) */}
            {data.map.backgroundUrl && (
              <div
                className="pointer-events-none absolute left-0 top-0 overflow-hidden"
                style={{ width: areaW, height: areaH }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.map.backgroundUrl}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-fill"
                />
              </div>
            )}

            {/* Grade */}
            {data.map.showGrid && (
              <div
                className="pointer-events-none absolute left-0 top-0"
                style={{
                  width: areaW,
                  height: areaH,
                  backgroundImage:
                    "linear-gradient(to right, rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.16) 1px, transparent 1px)",
                  backgroundSize: `${cell}px ${cell}px`,
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              />
            )}

            {/* Régua (polilinha com vértices) */}
            {medida && medida.length >= 2 && (
              <svg
                className="pointer-events-none absolute left-0 top-0 overflow-visible"
                width={1}
                height={1}
              >
                <polyline
                  points={medida.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="rgba(224,192,96,0.95)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
                {medida.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={3}
                    fill="rgba(224,192,96,0.95)"
                  />
                ))}
                {(() => {
                  let total = 0;
                  for (let i = 1; i < medida.length; i++) {
                    total += Math.max(
                      Math.abs(Math.round((medida[i].x - medida[i - 1].x) / cell)),
                      Math.abs(Math.round((medida[i].y - medida[i - 1].y) / cell)),
                    );
                  }
                  const last = medida[medida.length - 1];
                  return (
                    <text
                      x={last.x + 8}
                      y={last.y - 8}
                      className="fill-paper-light"
                      style={{ fontSize: 14, paintOrder: "stroke" }}
                      stroke="rgba(10,9,8,0.9)"
                      strokeWidth={4}
                    >
                      {total} quadros
                    </text>
                  );
                })()}
              </svg>
            )}

            {/* Tokens */}
            {data.tokens.map((t) => {
              const p = pos[t.id] ?? { x: t.x, y: t.y };
              const meu = isMaster || t.ownerId === data.viewerId;
              const ehTurno =
                !!data.turno &&
                t.nome.trim() !== "" &&
                t.nome.trim().toLowerCase() === data.turno.trim().toLowerCase();
              const tsize = sizes[t.id] ?? (t.size > 0 ? t.size : cell);
              const isSel = selIds.has(t.id);
              const controles = isSel && selIds.size === 1 && meu;
              const ringos = [`0 0 0 3px ${ladoCor(t.lado)}`];
              if (isSel) ringos.push("0 0 0 6px rgba(231,220,196,0.9)");
              if (ehTurno) ringos.push("0 0 18px 5px rgba(224,192,96,0.9)");
              const icone = statusIcone(t.status);
              const ehProp = t.tipo === "PROP";
              const rotVal = rotDrag?.id === t.id ? rotDrag.rot : t.rot;
              const mostrarPinLuz = controles && t.luz > 0 && t.luzCone;
              const luzDirAtual =
                luzDrag?.id === t.id ? luzDrag.dir : t.luzDir;
              const luzL = (t.luz * cell) / 2;
              const luzPinX =
                tsize / 2 + Math.sin((luzDirAtual * Math.PI) / 180) * luzL;
              const luzPinY =
                tsize / 2 - Math.cos((luzDirAtual * Math.PI) / 180) * luzL;
              return (
                <div
                  key={t.id}
                  onPointerDown={(e) => onDownToken(e, t)}
                  onDoubleClick={() => abrirTokenDrawer(t)}
                  title="Duplo-clique: ficha / iluminação"
                  style={{ left: p.x, top: p.y, width: tsize, height: tsize }}
                  className={`absolute select-none ${meu ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                >
                  <div
                    className={`relative h-full w-full ${ehProp ? "" : "token overflow-hidden rounded-full"} ${ehTurno ? "turno-pulse" : ""}`}
                    style={
                      ehProp
                        ? {
                            transform: `rotate(${rotVal}deg)`,
                            boxShadow: isSel
                              ? "0 0 0 2px rgba(231,220,196,0.9)"
                              : undefined,
                          }
                        : { boxShadow: ringos.join(", ") }
                    }
                  >
                    {t.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.imageUrl}
                        alt={t.nome}
                        draggable={false}
                        className={
                          ehProp
                            ? "h-full w-full object-contain"
                            : "h-full w-full object-cover grayscale"
                        }
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-sepia-ink text-paper-light">
                        {t.nome.slice(0, 2) || "?"}
                      </span>
                    )}
                    {!ehProp && t.status === "MORTO" && (
                      <span
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background:
                            "radial-gradient(circle at 50% 45%, rgba(176,51,44,0.35), rgba(90,10,10,0.72))",
                          mixBlendMode: "multiply",
                        }}
                      />
                    )}
                  </div>

                  {/* Ícone de status no canto direito */}
                  {icone && (
                    <span
                      className="pointer-events-none absolute -right-1 -top-1 flex items-center justify-center rounded-full bg-ink leading-none ring-1 ring-paper-light/40"
                      style={{
                        width: Math.max(16, tsize * 0.34),
                        height: Math.max(16, tsize * 0.34),
                        fontSize: Math.max(11, tsize * 0.22),
                      }}
                    >
                      {icone}
                    </span>
                  )}

                  {/* Alça de redimensionar */}
                  {controles && (
                    <span
                      onPointerDown={(e) => onDownResize(e, t)}
                      className="absolute -bottom-1 -right-1 h-4 w-4 cursor-nwse-resize rounded-sm bg-paper-light text-center text-[0.6rem] leading-4 text-ink"
                      title="Arraste para redimensionar (Shift = livre)"
                    >
                      ◢
                    </span>
                  )}

                  {/* Status + atalho de configuração (token selecionado) */}
                  {controles && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-1"
                      style={{ top: -tsize * 0.5 - 22 }}
                    >
                      <div className="flex items-center gap-1 rounded-full bg-ink/90 px-1.5 py-1 shadow">
                        <button
                          type="button"
                          onClick={() => setStatusOpen((o) => !o)}
                          title="Status/efeito"
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[0.7rem] leading-none ${statusOpen ? "bg-stamp/50" : "bg-paper/15"}`}
                        >
                          {statusIcone(t.status) || "⚑"}
                        </button>
                        {isMaster && (
                          <button
                            type="button"
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-paper/15 text-[0.7rem] leading-none"
                            title="Configuração (tipo, lado, iluminação)"
                            onClick={() => abrirTokenDrawer(t)}
                          >
                            ⚙
                          </button>
                        )}
                      </div>
                      {statusOpen && (
                        <div className="flex max-w-[168px] flex-wrap justify-center gap-0.5 rounded bg-ink/90 px-1 py-0.5 shadow">
                          {STATUS.map((s) => (
                            <button
                              key={s.key || "none"}
                              type="button"
                              onClick={() =>
                                run(() => setTokenStatus(t.id, s.key))
                              }
                              title={s.label}
                              className={`h-5 w-5 rounded text-xs leading-5 ${t.status === s.key ? "bg-stamp/40" : ""}`}
                            >
                              {s.icone || "∅"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pin de giro: gira o TOKEN (Shift = livre; sem = 90°) */}
                  {controles && (
                    <span
                      onPointerDown={(e) => onDownRot(e, t)}
                      className="absolute left-1/2 z-20 flex h-4 w-4 -translate-x-1/2 cursor-grab items-center justify-center rounded-full bg-paper-light text-[0.6rem] leading-none text-ink shadow active:cursor-grabbing"
                      style={{ top: -tsize * 0.5 - 46 }}
                      title="Girar o token (Shift = qualquer ângulo; sem Shift = 90°)"
                    >
                      ⟳
                    </span>
                  )}

                  {/* Pin da luz: mira o cone (fica no meio da luz) */}
                  {mostrarPinLuz && (
                    <span
                      onPointerDown={(e) => onDownLuz(e, t)}
                      className="absolute z-20 flex h-5 w-5 cursor-grab items-center justify-center rounded-full text-[0.65rem] leading-none shadow active:cursor-grabbing"
                      style={{
                        left: luzPinX - 10,
                        top: luzPinY - 10,
                        background: t.luzCor || "#f2d79a",
                        color: "#1a1206",
                      }}
                      title="Arraste para mirar a luz (cone)"
                    >
                      🔦
                    </span>
                  )}

                  {ehTurno && !isSel && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 font-bold text-ink"
                      style={{
                        top: -tsize * 0.36,
                        background: "#e0c060",
                        fontSize: Math.max(8, cell * 0.14),
                      }}
                    >
                      ▶ turno
                    </div>
                  )}
                  {t.nome && (
                    <div
                      className="typewriter mt-0.5 truncate text-center text-paper-light"
                      style={{ fontSize: Math.max(9, cell * 0.16) }}
                    >
                      {t.nome}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Névoa de guerra com luz em degradê (lanternas/lampiões). */}
            {data.map.fog && (
              <FogCanvas
                areaW={areaW}
                areaH={areaH}
                cell={cell}
                revelado={[...revelado]}
                luzes={luzes}
                isMaster={isMaster}
              />
            )}
          </div>
        </div>
      </div>

      {/* Chat ancorado à direita (recolhível) */}
      {chatOpen ? (
        <div className="mt-3 lg:mt-0 lg:w-80 lg:shrink-0">
          <div className="h-[80vh] overflow-hidden rounded-md border border-sepia/50 bg-ink/95">
            <ChatBox onClose={() => setChatOpen(false)} />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="btn btn-dark tap mt-3 text-xs lg:mt-0"
          title="Abrir chat"
        >
          💬 Chat
        </button>
      )}

      {/* Caixa de seleção múltipla */}
      {marquee && (
        <div
          className="pointer-events-none fixed z-[80] border border-stamp-bright bg-stamp/10"
          style={{
            left: Math.min(marquee.x0, marquee.x1),
            top: Math.min(marquee.y0, marquee.y1),
            width: Math.abs(marquee.x1 - marquee.x0),
            height: Math.abs(marquee.y1 - marquee.y0),
          }}
        />
      )}

      {/* Fantasma do card sendo arrastado */}
      {placing && ghost && (
        <div
          className="pointer-events-none fixed z-[95]"
          style={{ left: ghost.x - 24, top: ghost.y - 24, width: 48, height: 48 }}
        >
          <div className="token h-full w-full overflow-hidden rounded-full opacity-85">
            {placing.portraitUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={placing.portraitUrl}
                alt=""
                className="h-full w-full object-cover grayscale"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-sepia-ink text-xs text-paper-light">
                {placing.name.slice(0, 2)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Ctrl+clique: imagem do token em tela cheia */}
      {zoomUrl && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomUrl}
            alt=""
            className="max-h-full max-w-full object-contain grayscale"
          />
          <button
            type="button"
            className="absolute right-4 top-4 rounded bg-ink/80 px-3 py-1 text-paper-light"
            onClick={() => setZoomUrl(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Animação de rolagem (uso de item) */}
      <DiceStage data={stage} onClose={() => setStage(null)} />

      {/* Ficha rápida (duplo-clique no token) */}
      {(ficha || fichaLoading) && (
        <div
          className="fixed inset-0 z-[85] flex justify-end bg-black/60"
          onClick={fecharDrawer}
        >
          <div
            className="h-full w-[min(92vw,24rem)] overflow-y-auto bg-ink/95 shadow-2xl backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            {fichaLoading || !ficha ? (
              <p className="typewriter p-6 text-sm text-paper/60">
                Abrindo ficha…
              </p>
            ) : (
              <div className="space-y-4 p-4">
                {isMaster && dtoken && <LuzConfig token={dtoken} run={run} />}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="display text-xl text-paper-light">
                      {ficha.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span
                        className={`badge ${ficha.classe === "OCULTISTA" ? "badge-ocultista" : "badge-classe"}`}
                      >
                        {classLabel(ficha.classe)}
                      </span>
                      {ficha.subclasse && (
                        <span className="badge badge-classe">
                          {subclassLabel(ficha.subclasse)}
                        </span>
                      )}
                      <span className="badge badge-nivel">
                        {levelLabel(ficha.nivel)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={fecharDrawer}
                    className="rounded bg-black/40 px-2 text-paper/70"
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>

                {(ficha.condicoes.length > 0 || ficha.traumas.length > 0) && (
                  <div className="flex flex-wrap gap-1">
                    <ConditionBadges condicoes={ficha.condicoes} />
                    <TraumaBadges traumas={ficha.traumas} />
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2">
                  {ATTRIBUTES.map((a) => {
                    const val = (ficha as unknown as Record<string, number>)[
                      a.key
                    ];
                    return (
                      <div key={a.key} className="text-center">
                        <div className="attr-stamp mx-auto flex h-12 w-12 items-center justify-center bg-paper-light">
                          <span className="typewriter text-lg">
                            {fmtSigned(val)}
                          </span>
                        </div>
                        <div className="typewriter mt-1 text-[0.6rem] text-paper/60">
                          {a.code}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="paper paper-edge space-y-3 rounded-md p-3">
                  <ResourceMeter
                    kind="pv"
                    current={ficha.pvAtual}
                    max={ficha.pvMax}
                  />
                  <ResourceMeter
                    kind="san"
                    current={ficha.sanAtual}
                    max={ficha.sanMax}
                  />
                  {podeEditar && (
                    <div className="space-y-2 border-t border-sepia/30 pt-3">
                      <div className="flex items-center gap-2">
                        <span className="label">Quantidade</span>
                        <input
                          type="number"
                          min={1}
                          className="field w-20 text-sm"
                          value={qtd}
                          onChange={(e) =>
                            setQtd(Math.max(1, Math.trunc(Number(e.target.value) || 1)))
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="btn btn-dark tap flex-1 px-0 py-1 text-sm"
                            onClick={() => ajustar(-qtd, 0)}
                            title="Dano"
                          >
                            −
                          </button>
                          <span className="label w-8 text-center text-sepia-ink">
                            PV
                          </span>
                          <button
                            type="button"
                            className="btn btn-primary tap flex-1 px-0 py-1 text-sm"
                            onClick={() => ajustar(qtd, 0)}
                            title="Cura"
                          >
                            ＋
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="btn btn-dark tap flex-1 px-0 py-1 text-sm"
                            onClick={() => ajustar(0, -qtd)}
                            title="Perda de Sanidade"
                          >
                            −
                          </button>
                          <span className="label w-10 text-center text-sepia-ink">
                            SAN
                          </span>
                          <button
                            type="button"
                            className="btn btn-primary tap flex-1 px-0 py-1 text-sm"
                            onClick={() => ajustar(0, qtd)}
                            title="Recuperar Sanidade"
                          >
                            ＋
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Rolagens e itens — painel claro (componentes de papel) */}
                <div className="paper paper-edge space-y-4 rounded-md p-3">
                  <DiceRoller
                    attrs={{
                      attrInvestigar: ficha.attrInvestigar,
                      attrCombate: ficha.attrCombate,
                      attrLabia: ficha.attrLabia,
                      attrMente: ficha.attrMente,
                    }}
                    focos={
                      ficha.classe === "ESPECIALISTA"
                        ? ficha.especialistaFocos
                        : []
                    }
                    personagem={ficha.name}
                  />

                  <div>
                    <p className="label mb-1">Itens</p>
                    {ficha.inventory.length === 0 ? (
                      <p className="typewriter text-sm text-sepia-dark">
                        Bolsos vazios.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {ficha.inventory.map((it, i) => {
                          const temEfeito =
                            it.efeitoPv !== 0 || it.efeitoSan !== 0;
                          return (
                            <li
                              key={i}
                              className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-sepia/30 py-2"
                            >
                              <span className="typewriter text-sm text-sepia-ink">
                                — {it.nome}
                                {it.qtd > 1 ? (
                                  <span className="text-sepia"> ×{it.qtd}</span>
                                ) : null}
                                {temEfeito && (
                                  <span className="ml-2 text-[0.65rem] text-emerald-800">
                                    {it.efeitoPv !== 0
                                      ? `${it.efeitoPv > 0 ? "+" : ""}${it.efeitoPv} PV`
                                      : ""}
                                    {it.efeitoPv !== 0 && it.efeitoSan !== 0
                                      ? " · "
                                      : ""}
                                    {it.efeitoSan !== 0
                                      ? `${it.efeitoSan > 0 ? "+" : ""}${it.efeitoSan} SAN`
                                      : ""}
                                  </span>
                                )}
                                {it.dadoEfeito && (
                                  <span className="ml-2 text-[0.65rem] text-emerald-800">
                                    {it.dadoEfeito}
                                    {it.baseEfeito
                                      ? `${it.baseEfeito >= 0 ? "+" : ""}${it.baseEfeito}`
                                      : ""}{" "}
                                    {it.recurso}
                                    {it.especialista
                                      ? ` · esp: ${subclassLabel(it.especialista)}`
                                      : ""}
                                  </span>
                                )}
                                <span className="ml-2 text-[0.6rem] text-sepia-dark">
                                  usos: {it.usos}
                                </span>
                              </span>
                              <div className="flex items-center gap-2">
                                {podeEditar && it.usos > 0 && (
                                  <button
                                    type="button"
                                    className="btn btn-primary tap px-2 py-1 text-xs"
                                    onClick={async () => {
                                      setErro(null);
                                      const r = await usarItemRapido(ficha.id, i);
                                      if (!r.ok) {
                                        setErro(r.error ?? "Falha.");
                                        return;
                                      }
                                      const ef = r.efeito;
                                      if (ef && (ef.dPv || ef.dSan)) {
                                        const val = ef.dPv || ef.dSan;
                                        setStage({
                                          dados: ef.rolls.length ? ef.rolls : [val],
                                          total: val,
                                          label: `${r.nome} · ${ef.recurso}`,
                                          resultado: `${val >= 0 ? "+" : ""}${val} ${ef.recurso}`,
                                          tom: ef.especialista === false ? "parcial" : "ok",
                                        });
                                      }
                                      void abrirFicha(ficha.id);
                                      puxar();
                                    }}
                                    title="Usar item (rola o efeito e gasta usos)"
                                  >
                                    Usar
                                  </button>
                                )}
                                {it.dano ? (
                                  <WeaponRoller
                                    dieCode={it.dano}
                                    combate={ficha.attrCombate}
                                    advantage={ficha.classe === "COMBATENTE"}
                                    nome={it.nome}
                                    personagem={ficha.name}
                                  />
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drawer de objeto (token sem personagem) — iluminação do Mestre. */}
      {fichaTokenId && !ficha && !fichaLoading && (
        <div
          className="fixed inset-0 z-[85] flex justify-end bg-black/60"
          onClick={fecharDrawer}
        >
          <div
            className="h-full w-[min(92vw,24rem)] space-y-4 overflow-y-auto bg-ink/95 p-4 shadow-2xl backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="display text-xl text-paper-light">
                {dtoken?.nome || "Objeto"}
              </h3>
              <button
                type="button"
                onClick={fecharDrawer}
                className="rounded bg-black/40 px-2 text-paper/70"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            {isMaster && dtoken ? (
              <LuzConfig token={dtoken} run={run} />
            ) : (
              <p className="typewriter text-sm text-paper/50">
                Sem configurações para este item.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
