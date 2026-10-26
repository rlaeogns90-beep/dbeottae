// 제안서 PPT와 같은 배치를 웹에서 그린다. 배치 데이터(src/lib/proposal-deck.json)는
// PPT 제작 스크립트(proposal/source/build.js)를 export-html.js로 실행해 뽑은 것이라, PPT를 고치면 같이 다시 뽑으면 된다.
// 슬라이드는 16:9 상자 안에서 인치 좌표를 %로, 글자 크기(pt)를 슬라이드 너비 기준(cqw)으로 바꿔 어떤 화면 폭에서도 비율이 같다.
import deck from "@/lib/proposal-deck.json";

type Run = { text: string; options?: { bold?: boolean; color?: string; fontSize?: number; breakLine?: boolean } };
type Opts = Record<string, unknown> & {
  x?: number; y?: number; w?: number; h?: number;
  fontSize?: number; bold?: boolean; color?: string; align?: "left" | "center" | "right"; valign?: "top" | "middle" | "bottom";
  lineSpacingMultiple?: number; charSpacing?: number;
  rectRadius?: number; fill?: { color?: string; transparency?: number }; line?: { color?: string; width?: number; transparency?: number; type?: string; endArrowType?: string };
  shadow?: { color: string; opacity: number; blur: number; offset: number };
  colW?: number[]; rowH?: number; margin?: number | number[]; border?: { color?: string; pt?: number };
};
type Item = { kind: string; text?: string | Run[]; o: Opts; shape?: string; src?: string; rows?: { text: string; options?: Opts }[][] };

const W = deck.width;
const H = deck.height;
const SLIDE_PT = W * 72; // 슬라이드 너비를 pt로

const px = (x = 0) => `${(x / W) * 100}%`;
const py = (y = 0) => `${(y / H) * 100}%`;
const pt = (v: number) => `${(v / SLIDE_PT) * 100}cqw`; // pt → 슬라이드 너비 비율
const inch = (v: number) => `${(v / W) * 100}cqw`;
const rgba = (hex = "000000", alpha = 1) => {
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};
const box = (o: Opts): React.CSSProperties => ({ position: "absolute", left: px(o.x), top: py(o.y), width: px(o.w), height: py(o.h) });

function TextBox({ text, o }: { text: string | Run[]; o: Opts }) {
  const runs: Run[] = typeof text === "string" ? [{ text }] : text;
  const size = o.fontSize ?? 12;
  return (
    <div
      style={{
        ...box(o),
        display: "flex",
        flexDirection: "column",
        justifyContent: o.valign === "middle" ? "center" : o.valign === "bottom" ? "flex-end" : "flex-start",
        textAlign: o.align ?? "left",
        color: `#${o.color ?? "222222"}`,
        fontSize: pt(size),
        fontWeight: o.bold ? 700 : 400,
        lineHeight: o.lineSpacingMultiple ?? 1.2,
        letterSpacing: o.charSpacing ? pt(o.charSpacing) : undefined,
        wordBreak: "keep-all",
      }}
    >
      <p style={{ margin: 0 }}>
        {runs.map((r, i) => (
          <span key={i}>
            <span
              style={{
                fontWeight: r.options?.bold === undefined ? undefined : r.options.bold ? 700 : 400,
                color: r.options?.color ? `#${r.options.color}` : undefined,
                fontSize: r.options?.fontSize ? pt(r.options.fontSize) : undefined,
              }}
            >
              {r.text}
            </span>
            {r.options?.breakLine && <br />}
          </span>
        ))}
      </p>
    </div>
  );
}

function Shape({ shape, o }: { shape: string; o: Opts }) {
  const stroke = o.line && o.line.type !== "none" ? o.line : undefined;
  if (shape === "line") {
    const color = rgba(stroke?.color, 1 - (stroke?.transparency ?? 0) / 100);
    const width = pt(stroke?.width ?? 1);
    return (
      <div style={{ ...box({ ...o, h: 0 }), height: 0, borderTop: `${width} solid ${color}` }}>
        {stroke?.endArrowType && (
          <span
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              transform: "translate(30%, -50%)",
              width: 0,
              height: 0,
              borderTop: `${pt(4)} solid transparent`,
              borderBottom: `${pt(4)} solid transparent`,
              borderLeft: `${pt(7)} solid ${color}`,
            }}
          />
        )}
      </div>
    );
  }
  const s = o.shadow;
  return (
    <div
      style={{
        ...box(o),
        background: o.fill?.color ? rgba(o.fill.color, 1 - (o.fill.transparency ?? 0) / 100) : "transparent",
        border: stroke ? `${pt(stroke.width ?? 1)} solid ${rgba(stroke.color, 1 - (stroke.transparency ?? 0) / 100)}` : undefined,
        borderRadius: shape === "ellipse" ? "50%" : shape === "roundRect" ? inch(o.rectRadius ?? 0.1) : 0,
        boxShadow: s ? `0 ${pt(s.offset)} ${pt(s.blur)} ${rgba(s.color, s.opacity)}` : undefined,
        boxSizing: "border-box",
      }}
    />
  );
}

function Table({ rows, o }: { rows: { text: string; options?: Opts }[][]; o: Opts }) {
  const m = Array.isArray(o.margin) ? o.margin : [o.margin ?? 0, o.margin ?? 0, o.margin ?? 0, o.margin ?? 0];
  const line = `${pt(o.border?.pt ?? 0.75)} solid #${o.border?.color ?? "E5E7EB"}`;
  return (
    <table style={{ position: "absolute", left: px(o.x), top: py(o.y), width: px(o.w), borderCollapse: "collapse", tableLayout: "fixed" }}>
      <colgroup>
        {(o.colW ?? []).map((c, i) => (
          <col key={i} style={{ width: `${(c / (o.w ?? W)) * 100}%` }} />
        ))}
      </colgroup>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ height: inch(o.rowH ?? 0.4) }}>
            {r.map((c, j) => (
              <td
                key={j}
                style={{
                  border: line,
                  padding: `${inch(m[0])} ${inch(m[1])} ${inch(m[2])} ${inch(m[3])}`,
                  background: c.options?.fill?.color ? `#${c.options.fill.color}` : undefined,
                  color: `#${c.options?.color ?? "222222"}`,
                  fontSize: pt(c.options?.fontSize ?? 12),
                  fontWeight: c.options?.bold ? 700 : 400,
                  verticalAlign: "middle",
                }}
              >
                {c.text}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function render(it: Item, key: number) {
  if (it.kind === "text") return <TextBox key={key} text={it.text!} o={it.o} />;
  if (it.kind === "shape") return <Shape key={key} shape={it.shape!} o={it.o} />;
  // eslint-disable-next-line @next/next/no-img-element
  if (it.kind === "image") return <img key={key} src={it.src} alt="" loading="lazy" decoding="async" style={{ ...box(it.o), objectFit: "fill" }} />;
  if (it.kind === "table") return <Table key={key} rows={it.rows!} o={it.o} />;
  return null;
}

export function ProposalDeck() {
  const master = deck.masters.CONTENT as unknown as { objects: { kind: string; src?: string; o: Opts }[]; slideNumber: Opts };
  return (
    <div className="flex flex-col gap-6 sm:gap-10">
      {deck.slides.map((slide, i) => {
        const fills = slide.fills as Record<string, { text: string | Run[]; o: Opts }>;
        return (
          <section
            key={i}
            id={`slide-${i + 1}`}
            aria-label={`${i + 1}장`}
            className="relative w-full overflow-hidden rounded-xl bg-white shadow-[0_8px_30px_rgba(25,31,40,0.10)] ring-1 ring-black/5 sm:rounded-2xl"
            style={{ aspectRatio: `${W} / ${H}`, containerType: "inline-size", fontFamily: "Pretendard, 'Pretendard Variable', sans-serif" }}
          >
            {master.objects.map((ob, k) => {
              if (ob.kind === "image") return render({ kind: "image", src: ob.src, o: ob.o }, k);
              const fill = fills[ob.o.name as string];
              if (!fill) return null;
              return <TextBox key={k} text={fill.text} o={{ ...ob.o, ...fill.o }} />;
            })}
            {(slide.items as unknown as Item[]).map(render)}
            <TextBox text={String(i + 1)} o={{ ...master.slideNumber, valign: "middle" }} />
          </section>
        );
      })}
    </div>
  );
}
