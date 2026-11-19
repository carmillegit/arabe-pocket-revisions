// Tracé libre sur modèle, avec auto-évaluation.
// Étape 1 : la forme (squelette sans points ni voyelles). Étape 2, facultative : points et voyelles.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { LETTER_BY_CHAR, POSITION_LABEL, letterForm, type Position } from '../../domain/letters';
import { skeleton } from '../../domain/positions';
import { STROKES } from '../../domain/strokes';
import type { Word } from '../../domain/types';
import { VisualBadge } from '../common';

type Pt = { x: number; y: number };
type Pass = 'forme' | 'complet';

const FONT_FAMILY = '"Noto Naskh Arabic", serif';

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

interface Layout {
  w: number;
  h: number;
  size: number;
  x: number;
  y: number;
  /** Boîte englobante du glyphe complet (pour les flèches). */
  box: { l: number; r: number; t: number; b: number };
}

/** Taille et position du modèle : calées sur le texte complet, pour que squelette et flèches s'alignent. */
function computeLayout(ctx: CanvasRenderingContext2D, text: string, w: number, h: number, isLetter: boolean): Layout {
  ctx.font = `100px ${FONT_FAMILY}`;
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText(text);
  const tw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight || m.width;
  const th = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || 100;
  const scale = Math.min((w * (isLetter ? 0.62 : 0.86)) / tw, (h * (isLetter ? 0.72 : 0.6)) / th);
  const size = Math.max(40, Math.min(isLetter ? 420 : 260, 100 * scale));
  const k = size / 100;
  const asc = m.actualBoundingBoxAscent * k;
  const desc = m.actualBoundingBoxDescent * k;
  const x = w / 2;
  const y = h / 2 + (asc - desc) / 2;
  return {
    w,
    h,
    size,
    x,
    y,
    box: { l: x - m.actualBoundingBoxLeft * k, r: x + m.actualBoundingBoxRight * k, t: y - asc, b: y + desc },
  };
}

function drawArrow(ctx: CanvasRenderingContext2D, pts: Pt[], color: string, n: number, lw: number) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([lw * 1.6, lw * 1.6]);
  // Courbe lissée passant par les milieux : suit mieux l'arrondi des lettres.
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  ctx.stroke();
  ctx.setLineDash([]);
  // Pointe de flèche à la fin du trait.
  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const hl = lw * 4;
  ctx.beginPath();
  ctx.moveTo(b.x + Math.cos(ang) * lw, b.y + Math.sin(ang) * lw);
  ctx.lineTo(b.x - hl * Math.cos(ang - 0.5), b.y - hl * Math.sin(ang - 0.5));
  ctx.lineTo(b.x - hl * Math.cos(ang + 0.5), b.y - hl * Math.sin(ang + 0.5));
  ctx.closePath();
  ctx.fill();
  // Pastille numérotée au départ.
  const r = lw * 3.2;
  ctx.beginPath();
  ctx.arc(pts[0].x, pts[0].y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(r * 1.3)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'ltr';
  ctx.fillText(String(n), pts[0].x, pts[0].y + 1);
  ctx.restore();
}

/** Trait lissé : courbes passant par les milieux des points successifs. */
function drawStroke(ctx: CanvasRenderingContext2D, s: Pt[]) {
  if (s.length === 1) {
    ctx.beginPath();
    ctx.arc(s[0].x, s[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(s[0].x, s[0].y);
  for (let i = 1; i < s.length - 1; i++) {
    const mx = (s[i].x + s[i + 1].x) / 2;
    const my = (s[i].y + s[i + 1].y) / 2;
    ctx.quadraticCurveTo(s[i].x, s[i].y, mx, my);
  }
  const last = s[s.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

function setupCanvas(c: HTMLCanvasElement, w: number, h: number) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  c.style.width = `${w}px`;
  c.style.height = `${h}px`;
  const ctx = c.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function Trace({
  word,
  letter,
  showArrows: arrowsDefault,
  memory,
  onAnswer,
}: {
  word?: Word;
  letter?: string;
  showArrows: boolean;
  /** Niveau « de mémoire » : écrire la lettre dans cette position, sans modèle, puis révéler. */
  memory?: Position;
  onAnswer: (ok: boolean) => void;
}) {
  const full = letter && memory ? letterForm(letter, memory) : (letter ?? word!.arabicVoweled);
  const skel = skeleton(full);
  const info = letter ? LETTER_BY_CHAR.get(letter) : undefined;

  const wrapRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<Layout | null>(null);
  const strokes = useRef<Pt[][]>([]);
  const current = useRef<Pt[] | null>(null);

  const [count, setCount] = useState(0);
  const [pass, setPass] = useState<Pass>(memory ? 'complet' : 'forme');
  const [modelVisible, setModelVisible] = useState(!memory);
  const [revealed, setRevealed] = useState(false);
  const [compare, setCompare] = useState(false);
  const [arrows, setArrows] = useState(arrowsDefault);
  const [fontReady, setFontReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const lineWidth = () => Math.max(6, (layoutRef.current?.size ?? 120) * (letter ? 0.05 : 0.065));

  const redrawInk = () => {
    const c = inkRef.current;
    const l = layoutRef.current;
    if (!c || !l) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, l.w, l.h);
    ctx.strokeStyle = cssVar('--ink');
    ctx.fillStyle = cssVar('--ink');
    ctx.lineWidth = lineWidth();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of strokes.current) drawStroke(ctx, s);
  };

  const redrawModel = () => {
    const c = modelRef.current;
    const l = layoutRef.current;
    if (!c || !l) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, l.w, l.h);
    if (!modelVisible && !compare) return;
    ctx.font = `${l.size}px ${FONT_FAMILY}`;
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = compare ? cssVar('--accent') : cssVar('--model');
    ctx.fillText(pass === 'forme' ? skel : full, l.x, l.y);
    if (letter && arrows && pass === 'forme' && !compare) {
      const strokesData = STROKES[letter] ?? [];
      const { box } = l;
      const lw = Math.max(2.5, l.size * 0.012);
      strokesData.forEach((s, i) =>
        drawArrow(
          ctx,
          s.map(([u, v]) => ({ x: box.l + u * (box.r - box.l), y: box.t + v * (box.b - box.t) })),
          i === 0 ? cssVar('--arrow-1') : cssVar('--arrow-2'),
          i + 1,
          lw,
        ),
      );
    }
  };

  // Chargement de la police avant de dessiner le modèle.
  useEffect(() => {
    let alive = true;
    const done = () => alive && setFontReady(true);
    if (document.fonts?.load) document.fonts.load(`100px ${FONT_FAMILY}`, full).then(done, done);
    else done();
    return () => {
      alive = false;
    };
  }, []);

  // Dimensionnement des deux calques (modèle dessous, encre dessus).
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !fontReady) return;
    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (!w || !h) return;
      const prev = layoutRef.current;
      const mctx = setupCanvas(modelRef.current!, w, h);
      setupCanvas(inkRef.current!, w, h);
      layoutRef.current = computeLayout(mctx, full, w, h, !!letter);
      // Si la taille change (rotation), on remet les traits à l'échelle.
      if (prev && (prev.w !== w || prev.h !== h)) {
        const sx = w / prev.w;
        const sy = h / prev.h;
        strokes.current = strokes.current.map((s) => s.map((p) => ({ x: p.x * sx, y: p.y * sy })));
      }
      redrawModel();
      redrawInk();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [fontReady]);

  useEffect(redrawModel, [pass, modelVisible, compare, arrows, fontReady]);

  // Saisie au doigt ou au stylet.
  useEffect(() => {
    const c = inkRef.current;
    if (!c) return;
    const point = (e: PointerEvent): Pt => {
      const r = c.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const down = (e: PointerEvent) => {
      if (!e.isPrimary || current.current) return;
      e.preventDefault();
      c.setPointerCapture(e.pointerId);
      current.current = [point(e)];
      setCompare(false);
    };
    const move = (e: PointerEvent) => {
      const s = current.current;
      if (!s) return;
      e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      const ctx = c.getContext('2d')!;
      ctx.strokeStyle = cssVar('--ink');
      ctx.lineWidth = lineWidth();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const ev of evs.length ? evs : [e]) {
        const p = point(ev);
        const prev = s[s.length - 1];
        if (Math.hypot(p.x - prev.x, p.y - prev.y) < 1.5) continue;
        // Segment lissé incrémental : du milieu précédent au nouveau milieu.
        const before = s[s.length - 2] ?? prev;
        const m1 = { x: (before.x + prev.x) / 2, y: (before.y + prev.y) / 2 };
        const m2 = { x: (prev.x + p.x) / 2, y: (prev.y + p.y) / 2 };
        ctx.beginPath();
        ctx.moveTo(s.length > 1 ? m1.x : prev.x, s.length > 1 ? m1.y : prev.y);
        ctx.quadraticCurveTo(prev.x, prev.y, m2.x, m2.y);
        ctx.stroke();
        s.push(p);
      }
    };
    const up = () => {
      const s = current.current;
      if (!s) return;
      current.current = null;
      strokes.current.push(s);
      setCount(strokes.current.length);
      redrawInk(); // redessine proprement le trait complet (fin du trait comprise)
    };
    c.addEventListener('pointerdown', down);
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    return () => {
      c.removeEventListener('pointerdown', down);
      c.removeEventListener('pointermove', move);
      c.removeEventListener('pointerup', up);
      c.removeEventListener('pointercancel', up);
    };
  }, []);

  const undo = () => {
    strokes.current.pop();
    setCount(strokes.current.length);
    redrawInk();
  };
  const clear = () => {
    strokes.current = [];
    setCount(0);
    redrawInk();
  };
  const answer = (ok: boolean) => {
    if (busy) return;
    setBusy(true);
    onAnswer(ok);
  };

  return (
    <div class="exercise trace">
      <div class="trace-head">
        {memory && info ? (
          <div class="memory-prompt">
            <p class="prompt-label">Écris de mémoire</p>
            <p class="memory-name">
              {info.name} <span class="translit">({info.sound})</span>
            </p>
            <p class="memory-pos">{POSITION_LABEL[memory]}</p>
          </div>
        ) : letter ? (
          <p class="prompt-label">
            Trace la lettre <strong>{info?.name}</strong>
          </p>
        ) : (
          <div class="trace-word">
            <VisualBadge visual={word!.visual} size={32} />
            <span>
              <strong>{word!.french}</strong> · <em>{word!.transliteration}</em>
            </span>
          </div>
        )}
        {!memory && (
        <div class="seg-ctl" role="group" aria-label="Étape">
          <button type="button" aria-pressed={pass === 'forme'} onClick={() => setPass('forme')}>1. Forme</button>
          <button type="button" aria-pressed={pass === 'complet'} onClick={() => setPass('complet')}>
            2. {letter ? 'Points' : 'Points et voyelles'}
          </button>
        </div>
        )}
      </div>

      <div ref={wrapRef} class={`trace-pad ${compare ? 'is-compare' : ''}`}>
        <canvas ref={modelRef} class="trace-model" aria-hidden="true" />
        <canvas ref={inkRef} class="trace-ink" aria-label="Zone de tracé" role="img" />
        {!memory && pass === 'complet' && info && info.dots.count > 0 && (
          <p class="trace-tip">
            {info.dots.count} point{info.dots.count > 1 ? 's' : ''} {info.dots.position}
          </p>
        )}
        {!memory && !modelVisible && !compare && <p class="trace-tip">De mémoire</p>}
        {memory && revealed && <p class="trace-tip">Modèle en violet : compare et note-toi</p>}
      </div>

      <div class="trace-tools">
        <button type="button" class="tool" onClick={undo} disabled={count === 0}>Annuler</button>
        <button type="button" class="tool" onClick={clear} disabled={count === 0}>Effacer</button>
        {memory ? (
          <button type="button" class="tool tool-primary" aria-pressed={compare} onClick={() => { setRevealed(true); setCompare(!compare); }} disabled={count === 0}>
            {compare ? 'Masquer la correction' : 'Révéler'}
          </button>
        ) : (
        <button type="button" class="tool" aria-pressed={!modelVisible} onClick={() => { setModelVisible(!modelVisible); setCompare(false); }}>
          {modelVisible ? 'Masquer le modèle' : 'Montrer le modèle'}
        </button>
        )}
        {!memory && !modelVisible && (
          <button type="button" class="tool" aria-pressed={compare} onClick={() => setCompare(!compare)} disabled={count === 0}>
            Comparer
          </button>
        )}
        {letter && STROKES[letter] && modelVisible && pass === 'forme' && (
          <button type="button" class="tool" aria-pressed={arrows} onClick={() => setArrows(!arrows)}>
            Sens du tracé
          </button>
        )}
      </div>

      <div class="actions">
        <button type="button" class="btn btn-bad" onClick={() => answer(false)} disabled={count === 0 || (!!memory && !revealed)}>À refaire</button>
        <button type="button" class="btn btn-good" onClick={() => answer(true)} disabled={count === 0 || (!!memory && !revealed)}>Réussi</button>
      </div>
    </div>
  );
}
