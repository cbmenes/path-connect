import type { CSSProperties, ReactNode } from "react";
import { THEME_BLOCK } from "@/lib/path-connect/levels";
import type { ThemeId } from "@/lib/path-connect/styles";

type Slot = "RT" | "RB" | "LT" | "LB" | "T" | "T2" | "B" | "B2";

interface Piece {
  id: string;
  width: number;
  height: number;
  fits: Slot[];
  /** Variants of one kind of item (sofas, fridges, plants) share a group, so a level shows at most one of them. */
  group?: string;
  /** Pieces with lettering keep their orientation on the left side. */
  noFlip?: boolean;
  art: ReactNode;
}

const SHADOW = "rgb(92 58 36 / 0.16)";

function Plant({ pot, rim, leaf, leafDark }: { pot: string; rim: string; leaf: string; leafDark: string }) {
  return (
    <svg viewBox="0 0 90 120">
      <ellipse cx="45" cy="116" rx="28" ry="4" fill={SHADOW} />
      <path d="M45 66C30 52 18 40 16 22c12 4 24 18 29 40z" fill={leafDark} />
      <path d="M46 64c6-22 18-38 34-44-2 20-14 34-34 44z" fill={leaf} />
      <path d="M44 66C40 44 42 22 52 6c8 18 4 40-8 60z" fill={leaf} />
      <path d="M45 66c-10-6-24-8-36-2 10 8 22 8 36 2z" fill={leafDark} />
      <path d="M50 12c-4 12-5 26-4 40" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" fill="none" />
      <path d="M24 68h42l-5 40a8 8 0 0 1-8 7H37a8 8 0 0 1-8-7z" fill={pot} />
      <rect x="20" y="62" width="50" height="10" rx="5" fill={rim} />
      <path d="M24 64.5h40" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
      <path d="M31 76l4 31" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

const LR_PINK = "#e9b7a8";
const LR_PINK_DARK = "#d49c8c";
const LR_PINK_LIGHT = "#f6d3c8";
const LR_SAGE = "#a9bd9f";
const LR_SAGE_DARK = "#869b7d";
const LR_SAGE_LIGHT = "#cfdcc6";
const LR_CREAM = "#f5ead8";
const LR_CREAM_SHADE = "#e3d3ba";
const LR_LEG = "#b98a5e";
const LR_BRASS = "#c9953f";
const LR_BRASS_LIGHT = "#f0cf86";
const LR_BRONZE = "#b07a3e";
const LR_BRONZE_DARK = "#7a4f24";
const LR_BRONZE_LIGHT = "#e8bf86";
const LR_GLOW = "#ffe6a6";

function TaperedLegs({ left, right, top, length }: { left: number; right: number; top: number; length: number }) {
  return (
    <>
      <path d={`M${left} ${top}h6l-4 ${length}h-3z`} fill={LR_LEG} />
      <path d={`M${right} ${top}h-6l4 ${length}h3z`} fill={LR_LEG} />
    </>
  );
}

/** A bronze wire cage around a warm bulb; `top` is where the cap meets the cord. */
function CageLight({ cx, top, w, h, glowId }: { cx: number; top: number; w: number; h: number; glowId: string }) {
  const bottom = top + h;
  return (
    <g>
      <circle cx={cx} cy={top + h * 0.55} r={w * 1.5} fill={`url(#${glowId})`} />
      <ellipse cx={cx} cy={top + h * 0.56} rx={w * 0.28} ry={h * 0.32} fill="#fff3cc" />
      <ellipse cx={cx} cy={top + h * 0.58} rx={w * 0.14} ry={h * 0.16} fill="white" opacity="0.9" />
      {[-0.5, -0.25, 0, 0.25, 0.5].map((t) => (
        <path
          key={t}
          d={`M${cx + t * w * 0.7} ${top + 8}Q${cx + t * w * 1.08} ${top + h * 0.55} ${cx + t * w * 0.72} ${bottom}`}
          fill="none"
          stroke={LR_BRONZE_DARK}
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
      {[0.36, 0.7].map((f) => (
        <path
          key={f}
          d={`M${cx - w * 0.47} ${top + h * f}Q${cx} ${top + h * f + 4} ${cx + w * 0.47} ${top + h * f}`}
          fill="none"
          stroke={LR_BRONZE}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ))}
      <path d={`M${cx - w * 0.38} ${top + 9}Q${cx} ${top - 5} ${cx + w * 0.38} ${top + 9}z`} fill={LR_BRONZE} />
      <path d={`M${cx - w * 0.22} ${top + 4}q${w * 0.12} -4 ${w * 0.26} -4`} stroke={LR_BRONZE_LIGHT} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <rect x={cx - w * 0.4} y={top + 7} width={w * 0.8} height="3.6" rx="1.8" fill={LR_BRONZE_DARK} />
      <rect x={cx - w * 0.4} y={bottom - 1.5} width={w * 0.8} height="5" rx="2.5" fill={LR_BRONZE} />
      <rect x={cx - 3} y={top - 7} width="6" height="5" rx="2" fill={LR_BRONZE_DARK} />
    </g>
  );
}

function GlowDefs({ id }: { id: string }) {
  return (
    <defs>
      <radialGradient id={id}>
        <stop offset="0" stopColor={LR_GLOW} stopOpacity="0.75" />
        <stop offset="1" stopColor={LR_GLOW} stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

interface Upholstery {
  name: string;
  main: string;
  dark: string;
  light: string;
  cushion: string;
  cushionDark: string;
  cushionLight: string;
}

const BLUSH: Upholstery = {
  name: "blush",
  main: LR_PINK,
  dark: LR_PINK_DARK,
  light: LR_PINK_LIGHT,
  cushion: LR_SAGE,
  cushionDark: LR_SAGE_DARK,
  cushionLight: LR_SAGE_LIGHT,
};
const POWDER: Upholstery = {
  name: "powder",
  main: "#a9c4cf",
  dark: "#88a6b2",
  light: "#d4e4ea",
  cushion: "#e6be6a",
  cushionDark: "#c9a04c",
  cushionLight: "#f5dca2",
};
const MUSTARD: Upholstery = {
  name: "mustard",
  main: "#e3bd6c",
  dark: "#c69f4e",
  light: "#f4dba3",
  cushion: "#7fa9a3",
  cushionDark: "#5f8f89",
  cushionLight: "#b9d3cf",
};
const CORAL: Upholstery = {
  name: "coral",
  main: "#e39a82",
  dark: "#c97f68",
  light: "#f4c2b2",
  cushion: LR_CREAM,
  cushionDark: "#e3d3ba",
  cushionLight: "#ffffff",
};
const SAGE_CHAIR: Upholstery = {
  name: "sage",
  main: LR_SAGE,
  dark: LR_SAGE_DARK,
  light: LR_SAGE_LIGHT,
  cushion: LR_PINK,
  cushionDark: LR_PINK_DARK,
  cushionLight: LR_PINK_LIGHT,
};

interface Cabinet {
  name: string;
  main: string;
  dark: string;
  light: string;
}

const SAGE_WOOD: Cabinet = {
  name: "sage",
  main: LR_SAGE,
  dark: LR_SAGE_DARK,
  light: LR_SAGE_LIGHT,
};
const WALNUT: Cabinet = { name: "walnut", main: "#b98a5e", dark: "#94683f", light: "#d9b38a" };
const POWDER_WOOD: Cabinet = { name: "powder", main: "#a9c4cf", dark: "#88a6b2", light: "#d4e4ea" };

interface TableLamp {
  name: string;
  main: string;
  dark: string;
  shade: string;
  shadeDark: string;
  shadeLight: string;
}

const CREAM_SAGE: TableLamp = {
  name: "sage",
  main: LR_CREAM,
  dark: LR_CREAM_SHADE,
  shade: LR_SAGE,
  shadeDark: LR_SAGE_DARK,
  shadeLight: LR_SAGE_LIGHT,
};
const WALNUT_CORAL: TableLamp = {
  name: "coral",
  main: "#d9b38a",
  dark: "#b98a5e",
  shade: "#e39a82",
  shadeDark: "#c97f68",
  shadeLight: "#f4c2b2",
};
const CREAM_MUSTARD: TableLamp = {
  name: "mustard",
  main: LR_CREAM,
  dark: LR_CREAM_SHADE,
  shade: "#e3bd6c",
  shadeDark: "#c69f4e",
  shadeLight: "#f4dba3",
};

function Sofa({ u }: { u: Upholstery }) {
  return (
    <svg viewBox="0 0 160 120">
      <ellipse cx="80" cy="116" rx="72" ry="4" fill={SHADOW} />
      <rect x="14" y="16" width="132" height="58" rx="22" fill={u.main} />
      <path d="M30 21h100" stroke={u.light} strokeWidth="3" strokeLinecap="round" />
      <rect x="28" y="34" width="38" height="30" rx="10" fill={u.cushion} transform="rotate(-6 47 49)" />
      <path d="M34 38c8-2 18-3 26-2" stroke={u.cushionLight} strokeWidth="2.4" strokeLinecap="round" fill="none" transform="rotate(-6 47 49)" />
      <rect x="94" y="34" width="38" height="30" rx="10" fill={u.cushion} transform="rotate(6 113 49)" />
      <path d="M100 38c8-2 18-3 26-2" stroke={u.cushionLight} strokeWidth="2.4" strokeLinecap="round" fill="none" transform="rotate(6 113 49)" />
      <rect x="10" y="60" width="140" height="36" rx="14" fill={u.dark} />
      <rect x="12" y="58" width="136" height="20" rx="10" fill={u.main} />
      <path d="M80 60v16" stroke={u.dark} strokeWidth="2" strokeLinecap="round" />
      <path d="M22 62h48M90 62h48" stroke={u.light} strokeWidth="2.2" strokeLinecap="round" />
      <rect x="2" y="44" width="26" height="54" rx="13" fill={u.main} />
      <rect x="132" y="44" width="26" height="54" rx="13" fill={u.main} />
      <path d="M8 50c4-3 10-3 14 0M138 50c4-3 10-3 14 0" stroke={u.light} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M154 56v36" stroke={u.dark} strokeWidth="3" strokeLinecap="round" />
      <TaperedLegs left={16} right={144} top={96} length={18} />
    </svg>
  );
}

function Armchair({ u }: { u: Upholstery }) {
  return (
    <svg viewBox="0 0 120 120">
      <ellipse cx="60" cy="116" rx="50" ry="4" fill={SHADOW} />
      <rect x="16" y="12" width="88" height="64" rx="26" fill={u.main} />
      <path d="M30 18c18-4 42-4 60 0" stroke={u.light} strokeWidth="3" strokeLinecap="round" fill="none" />
      <rect x="38" y="30" width="44" height="32" rx="11" fill={u.cushion} transform="rotate(-5 60 46)" />
      <path d="M44 34c10-2 22-3 32-2" stroke={u.cushionLight} strokeWidth="2.4" strokeLinecap="round" fill="none" transform="rotate(-5 60 46)" />
      <rect x="12" y="62" width="96" height="34" rx="14" fill={u.dark} />
      <rect x="14" y="60" width="92" height="18" rx="9" fill={u.main} />
      <path d="M26 63h68" stroke={u.light} strokeWidth="2.2" strokeLinecap="round" />
      <rect x="2" y="44" width="24" height="54" rx="12" fill={u.main} />
      <rect x="94" y="44" width="24" height="54" rx="12" fill={u.main} />
      <path d="M7 50c4-3 10-3 14 0M99 50c4-3 10-3 14 0" stroke={u.light} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M114 56v36" stroke={u.dark} strokeWidth="3" strokeLinecap="round" />
      <TaperedLegs left={16} right={104} top={96} length={18} />
    </svg>
  );
}

function Sideboard({ c }: { c: Cabinet }) {
  return (
    <svg viewBox="0 0 130 96">
      <ellipse cx="65" cy="92" rx="56" ry="4" fill={SHADOW} />
      <TaperedLegs left={14} right={116} top={74} length={16} />
      <rect x="6" y="28" width="118" height="48" rx="6" fill={c.main} />
      <path d="M124 34v36a6 6 0 0 1-6 6h-6a6 6 0 0 0 6-6V28a6 6 0 0 1 6 6z" fill={c.dark} opacity="0.5" />
      <path d="M12 31h106" stroke={c.light} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M65 34v38" stroke={c.dark} strokeWidth="1.6" />
      {[16, 24, 32, 40, 48, 82, 90, 98, 106, 114].map((x) => (
        <path key={x} d={`M${x} 38v30`} stroke={c.dark} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      ))}
      <circle cx="59" cy="53" r="2.6" fill={LR_BRASS} />
      <circle cx="71" cy="53" r="2.6" fill={LR_BRASS} />
      <rect x="14" y="20" width="34" height="8" rx="2" fill={LR_CREAM} />
      <rect x="16" y="13" width="30" height="7" rx="2" fill={LR_PINK_LIGHT} />
      <path d="M96 28h20l-2.4-12a3 3 0 0 0-3-2.4h-9.2a3 3 0 0 0-3 2.4z" fill={LR_CREAM} />
      <path d="M106 14c-6-8-14-10-18-8 3 5 10 8 18 8z" fill="#93b47e" />
      <path d="M106 14c4-9 11-12 16-11-2 6-8 10-16 11z" fill="#729760" />
    </svg>
  );
}

function LampTable({ c }: { c: TableLamp }) {
  return (
    <svg viewBox="0 0 120 110" overflow="visible">
      <GlowDefs id={`pc-sur-lamp-${c.name}`} />
      <ellipse cx="60" cy="106" rx="46" ry="4" fill={SHADOW} />
      <circle cx="40" cy="34" r="34" fill={`url(#pc-sur-lamp-${c.name})`} />
      <TaperedLegs left={16} right={104} top={84} length={20} />
      <rect x="12" y="58" width="96" height="28" rx="5" fill={c.dark} />
      <rect x="10" y="52" width="100" height="10" rx="4" fill={c.main} />
      <path d="M16 54.5h88" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
      <rect x="22" y="65" width="76" height="15" rx="3" fill={c.main} />
      <circle cx="60" cy="72.5" r="2.6" fill={LR_BRASS} />
      <ellipse cx="40" cy="51" rx="11" ry="2.8" fill={LR_BRASS} />
      <rect x="38.4" y="26" width="3.2" height="25" rx="1.6" fill={LR_BRASS} />
      <path d="M39.4 28v20" stroke={LR_BRASS_LIGHT} strokeWidth="1" strokeLinecap="round" />
      <path d="M21 30C21 16 29 8 40 8s19 8 19 22z" fill={c.shade} />
      <path d="M59 30C59 18 53 10 44 8.4 50 12 53 20 53 30z" fill={c.shadeDark} opacity="0.5" />
      <path d="M26 24c1-7 6-12 12-13.4" stroke={c.shadeLight} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <ellipse cx="40" cy="30" rx="19" ry="3.2" fill={c.shadeDark} />
      <ellipse cx="40" cy="30.6" rx="14" ry="2" fill="#fff1c2" />
      <circle cx="40" cy="6.6" r="2.2" fill={LR_BRASS} />
      <rect x="70" y="44" width="30" height="8" rx="2" fill={c.shadeLight} />
      <rect x="72" y="37" width="26" height="7" rx="2" fill={LR_PINK_LIGHT} />
      <path d="M74 40.5h22" stroke="white" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

/** A clean 1950s living room in soft pastels; upholstery, wood and lamps come in several palettes so rooms differ level to level. */
const LIGHTS: Piece[] = [
  ...[BLUSH, POWDER, MUSTARD].map((u): Piece => ({
    id: `sofa-${u.name}`,
    group: "sofa",
    width: 160,
    height: 120,
    fits: ["RB", "LB"],
    art: <Sofa u={u} />,
  })),
  {
    id: "cage-floor-lamp",
    width: 96,
    height: 230,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 96 230" overflow="visible">
        <GlowDefs id="pc-sur-cage-floor" />
        <ellipse cx="68" cy="226" rx="24" ry="4" fill={SHADOW} />
        <ellipse cx="68" cy="219" rx="20" ry="6" fill={LR_BRONZE_DARK} />
        <ellipse cx="68" cy="217" rx="17" ry="4.4" fill={LR_BRONZE} />
        <path d="M68 216V44c0-16-10-26-26-28-10-1-16 4-16 12v12" fill="none" stroke={LR_BRONZE_DARK} strokeWidth="5" strokeLinecap="round" />
        <path d="M66.6 210V44c0-12-6-21-18-24" fill="none" stroke={LR_BRONZE_LIGHT} strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
        <CageLight cx={26} top={48} w={34} h={46} glowId="pc-sur-cage-floor" />
      </svg>
    ),
  },
  {
    id: "plant",
    group: "plant",
    width: 90,
    height: 120,
    fits: ["RB", "LB", "B", "B2"],
    art: <Plant pot="#f2e6d5" rim="#e8d6bd" leaf="#93b47e" leafDark="#729760" />,
  },
  ...[CREAM_SAGE, WALNUT_CORAL, CREAM_MUSTARD].map((c): Piece => ({
    id: `lamp-table-${c.name}`,
    group: "lamp-table",
    width: 120,
    height: 110,
    fits: ["RB", "LB"],
    art: <LampTable c={c} />,
  })),
  {
    id: "pendants",
    width: 90,
    height: 104,
    fits: ["RT", "LT", "T", "T2"],
    art: (
      <svg viewBox="0 0 90 104" overflow="visible">
        <GlowDefs id="pc-sur-pendant" />
        <path d="M28 0v40M64 0v26" stroke="#8a6a4a" strokeWidth="1.6" />
        <CageLight cx={28} top={46} w={30} h={42} glowId="pc-sur-pendant" />
        <CageLight cx={64} top={32} w={26} h={36} glowId="pc-sur-pendant" />
      </svg>
    ),
  },
  ...[CORAL, SAGE_CHAIR, POWDER].map((u): Piece => ({
    id: `armchair-${u.name}`,
    group: "armchair",
    width: 120,
    height: 120,
    fits: ["RB", "LB"],
    art: <Armchair u={u} />,
  })),
  {
    id: "vase-stand",
    width: 100,
    height: 96,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 100 96">
        <ellipse cx="50" cy="92" rx="38" ry="4" fill={SHADOW} />
        <TaperedLegs left={20} right={80} top={72} length={18} />
        <rect x="16" y="42" width="68" height="32" rx="5" fill={LR_CREAM_SHADE} />
        <rect x="14" y="38" width="72" height="8" rx="3.5" fill={LR_CREAM} />
        <path d="M20 40h60" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        <rect x="22" y="50" width="56" height="18" rx="3" fill={LR_CREAM} />
        <circle cx="50" cy="59" r="2.4" fill={LR_BRASS} />
        <path d="M44 6c-4 6-8 10-14 12M50 4c0 6 1 10 2 14M56 6c4 4 8 8 14 9" stroke="#8aa77a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        {[
          [30, 18],
          [52, 18],
          [70, 15],
          [42, 10],
        ].map(([x, y]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="4.4" ry="2.4" fill="#9cbc84" transform={`rotate(-24 ${x} ${y})`} />
        ))}
        <path d="M43 18h14c0 3 6 6 6 12s-4 8-6 8H43c-2 0-6-2-6-8s6-9 6-12z" fill="#e8a08e" />
        {[44, 50, 56].map((x) => (
          <path key={x} d={`M${x} 21v15`} stroke="#d4836f" strokeWidth="1.4" strokeLinecap="round" />
        ))}
        <path d="M41 24c-2 2-2.6 5-2 8" stroke="#f6c7b9" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  ...[SAGE_WOOD, WALNUT, POWDER_WOOD].map((c): Piece => ({
    id: `sideboard-${c.name}`,
    group: "sideboard",
    width: 130,
    height: 96,
    fits: ["T", "T2", "RT", "LT"],
    art: <Sideboard c={c} />,
  })),
  {
    id: "ottoman",
    width: 84,
    height: 80,
    fits: ["B", "B2", "RB"],
    art: (
      <svg viewBox="0 -12 84 80">
        <ellipse cx="42" cy="64" rx="34" ry="3.6" fill={SHADOW} />
        <TaperedLegs left={12} right={72} top={46} length={16} />
        <rect x="6" y="14" width="72" height="36" rx="14" fill={MUSTARD.dark} />
        <rect x="6" y="10" width="72" height="28" rx="14" fill={MUSTARD.main} />
        <path d="M18 15h48" stroke={MUSTARD.light} strokeWidth="2.6" strokeLinecap="round" />
        {[26, 42, 58].map((x) => (
          <circle key={x} cx={x} cy="25" r="1.8" fill={MUSTARD.dark} />
        ))}
      </svg>
    ),
  },
  {
    id: "coffee-table",
    width: 130,
    height: 94,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 -30 130 94">
        <ellipse cx="65" cy="60" rx="56" ry="4" fill={SHADOW} />
        <TaperedLegs left={14} right={116} top={34} length={24} />
        <rect x="8" y="28" width="114" height="10" rx="4" fill={LR_CREAM_SHADE} />
        <rect x="6" y="24" width="118" height="9" rx="4" fill={LR_CREAM} />
        <path d="M12 26.4h106" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        <rect x="22" y="17" width="34" height="7" rx="2" fill={LR_SAGE_LIGHT} />
        <rect x="25" y="10" width="30" height="7" rx="2" fill={LR_CREAM_SHADE} />
        <path d="M27 13.5h26" stroke="white" strokeWidth="1" opacity="0.6" />
        <path d="M88 24h14l-1.6-9a3 3 0 0 0-3-2.4h-4.8a3 3 0 0 0-3 2.4z" fill={LR_CREAM} />
        <path d="M95 12c-1-5-5-8-9-8 1 4 4 7 9 8zM95 12c1-6 5-9 9-9-1 5-4 8-9 9z" fill="#93b47e" />
      </svg>
    ),
  },
  {
    id: "nightstand",
    width: 96,
    height: 124,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 96 124" overflow="visible">
        <GlowDefs id="pc-sur-drum-lamp" />
        <ellipse cx="48" cy="120" rx="38" ry="4" fill={SHADOW} />
        <circle cx="48" cy="22" r="32" fill="url(#pc-sur-drum-lamp)" />
        <TaperedLegs left={16} right={80} top={100} length={18} />
        <rect x="12" y="52" width="72" height="50" rx="5" fill={WALNUT.dark} />
        <rect x="10" y="48" width="76" height="8" rx="3.5" fill={WALNUT.main} />
        <path d="M16 50h64" stroke={WALNUT.light} strokeWidth="1.6" strokeLinecap="round" />
        <rect x="18" y="60" width="60" height="16" rx="3" fill={WALNUT.main} />
        <rect x="18" y="80" width="60" height="16" rx="3" fill={WALNUT.main} />
        <circle cx="48" cy="68" r="2.4" fill={LR_BRASS} />
        <circle cx="48" cy="88" r="2.4" fill={LR_BRASS} />
        <ellipse cx="48" cy="47" rx="10" ry="2.6" fill={LR_BRASS} />
        <rect x="46.4" y="30" width="3.2" height="17" rx="1.6" fill={LR_BRASS} />
        <path d="M34 6h28l6 26H28z" fill={LR_CREAM} />
        <path d="M37 9 32 29" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity="0.75" />
        <ellipse cx="48" cy="32" rx="20" ry="2.6" fill="#ffe9ad" />
      </svg>
    ),
  },
];

const PA_BRONZE = "#b07a3e";
const PA_BRONZE_DARK = "#7a4f24";
const PA_BRONZE_LIGHT = "#e8bf86";
const PA_WOOD = "#c9a06e";
const PA_WOOD_DARK = "#a47b4c";
const PA_IVORY = "#f6eddc";
const PA_IVORY_EDGE = "#c9b99e";
const PA_TEAL = "#5f8f89";
const PA_SHADOW = "rgb(52 70 66 / 0.16)";

/** A 1950s broadcast room: wall speaker, horn, console radio, microphone stand, turntable, clock, and a plant. */
const PA_ROOM: Piece[] = [
  {
    id: "wall-speaker",
    width: 92,
    height: 104,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 92 104">
        <rect x="10" y="10" width="78" height="90" rx="12" fill={PA_SHADOW} />
        <rect x="6" y="4" width="78" height="90" rx="12" fill={PA_WOOD} />
        <path d="M84 16v66a12 12 0 0 1-12 12H18a12 12 0 0 0 10-6h46a4 4 0 0 0 4-4V6a12 12 0 0 1 6 10z" fill={PA_WOOD_DARK} opacity="0.5" />
        <path d="M16 8h58" stroke="#e6c79c" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="45" cy="46" r="28" fill="#e7d6b4" stroke={PA_WOOD_DARK} strokeWidth="2" />
        {[-18, -9, 0, 9, 18].map((dx) => (
          <path key={dx} d={`M${45 + dx} ${46 - Math.sqrt(26 * 26 - dx * dx)}v${2 * Math.sqrt(26 * 26 - dx * dx)}`} stroke="#c9b48c" strokeWidth="2" strokeLinecap="round" />
        ))}
        <rect x="35" y="80" width="20" height="6" rx="3" fill={PA_BRONZE} />
      </svg>
    ),
  },
  {
    id: "wall-horn",
    width: 116,
    height: 84,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 116 84">
        <rect x="6" y="20" width="10" height="44" rx="4" fill={PA_BRONZE_DARK} />
        <rect x="14" y="36" width="14" height="12" rx="3" fill={PA_BRONZE_DARK} />
        <rect x="26" y="30" width="20" height="24" rx="6" fill={PA_BRONZE} />
        <path d="M44 32 92 8c8 10 12 22 12 34s-4 24-12 34L44 52z" fill={PA_BRONZE} />
        <path d="M48 34 88 14" stroke={PA_BRONZE_LIGHT} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="94" cy="42" rx="9" ry="34" fill={PA_BRONZE_DARK} />
        <ellipse cx="95" cy="42" rx="6" ry="28" fill="#5a3a1c" />
      </svg>
    ),
  },
  {
    id: "console-radio",
    width: 112,
    height: 156,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 112 156">
        <ellipse cx="56" cy="152" rx="50" ry="4" fill={PA_SHADOW} />
        <rect x="14" y="134" width="8" height="16" rx="3" fill={PA_WOOD_DARK} />
        <rect x="90" y="134" width="8" height="16" rx="3" fill={PA_WOOD_DARK} />
        <path d="M8 44a48 36 0 0 1 96 0v86a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8z" fill={PA_WOOD} />
        <path d="M104 44v86a8 8 0 0 1-8 8h-10a8 8 0 0 0 8-8V44c0-18-10-30-26-34 22 2 36 16 36 34z" fill={PA_WOOD_DARK} opacity="0.5" />
        <path d="M16 46c0-16 12-30 34-34" stroke="#e6c79c" strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="24" y="40" width="64" height="22" rx="6" fill={PA_IVORY} stroke={PA_IVORY_EDGE} strokeWidth="1.4" />
        <path d="M30 51h52" stroke={PA_IVORY_EDGE} strokeWidth="1.2" />
        <path d="M54 44v14" stroke={PA_BRONZE_DARK} strokeWidth="2" strokeLinecap="round" />
        <rect x="22" y="72" width="68" height="52" rx="8" fill="#e7d6b4" stroke={PA_WOOD_DARK} strokeWidth="1.6" />
        {[32, 42, 52, 62, 72, 82].map((x) => (
          <path key={x} d={`M${x} 76v44`} stroke="#c9b48c" strokeWidth="2" strokeLinecap="round" />
        ))}
        {[40, 72].map((x) => (
          <circle key={x} cx={x} cy="66" r="3" fill={PA_BRONZE} />
        ))}
      </svg>
    ),
  },
  {
    id: "mic-stand",
    width: 64,
    height: 206,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 64 206">
        <ellipse cx="32" cy="200" rx="24" ry="5" fill={PA_SHADOW} />
        <ellipse cx="32" cy="196" rx="20" ry="5" fill={PA_BRONZE_DARK} />
        <ellipse cx="32" cy="194" rx="17" ry="3.6" fill={PA_BRONZE} />
        <rect x="29.5" y="56" width="5" height="138" rx="2.5" fill={PA_BRONZE_DARK} />
        <path d="M31 60v130" stroke={PA_BRONZE_LIGHT} strokeWidth="1.2" opacity="0.7" />
        <path d="M18 34v6a14 12 0 0 0 28 0v-6" fill="none" stroke={PA_BRONZE_DARK} strokeWidth="3.4" strokeLinecap="round" />
        <rect x="20" y="8" width="24" height="44" rx="12" fill={PA_BRONZE} />
        {[16, 22, 28, 34, 40, 46].map((y) => (
          <path key={y} d={`M23 ${y}h18`} stroke={PA_BRONZE_DARK} strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
        ))}
        <path d="M24 14c0-2.6 1.6-4.6 4-5.4" fill="none" stroke={PA_BRONZE_LIGHT} strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "on-air",
    group: "sign",
    width: 120,
    height: 58,
    fits: ["T", "T2", "RT", "LT"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 120 58">
        <rect x="8" y="10" width="108" height="44" rx="10" fill={PA_SHADOW} />
        <rect x="4" y="6" width="108" height="44" rx="10" fill={PA_BRONZE} />
        <rect x="9" y="11" width="98" height="34" rx="7" fill={PA_IVORY} />
        <circle cx="21" cy="28" r="5.4" fill="#ffb020" />
        <circle cx="19.8" cy="26.8" r="1.8" fill="#fff1c9" />
        <text x="68" y="35" textAnchor="middle" fontSize="17" fontWeight="800" letterSpacing="1.5" fill={PA_TEAL} fontFamily="inherit">
          ON AIR
        </text>
      </svg>
    ),
  },
  {
    id: "wall-clock",
    group: "clock",
    width: 84,
    height: 84,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 84 84">
        <circle cx="45" cy="45" r="36" fill={PA_SHADOW} />
        <circle cx="42" cy="42" r="36" fill={PA_BRONZE} />
        <circle cx="42" cy="42" r="30" fill={PA_IVORY} />
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x="41" y="15" width="2" height="5" rx="1" fill={PA_BRONZE_DARK} transform={`rotate(${i * 30} 42 42)`} />
        ))}
        <path d="M42 42V24M42 42l12 7" stroke={PA_BRONZE_DARK} strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="42" cy="42" r="2.6" fill={PA_BRONZE_DARK} />
        <path d="M14 34a30 30 0 0 1 18-18" fill="none" stroke={PA_BRONZE_LIGHT} strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "turntable",
    width: 124,
    height: 72,
    fits: ["B", "B2", "RB", "LB"],
    art: (
      <svg viewBox="0 0 124 72">
        <ellipse cx="62" cy="68" rx="56" ry="4" fill={PA_SHADOW} />
        <rect x="6" y="20" width="112" height="42" rx="9" fill={PA_IVORY} stroke={PA_IVORY_EDGE} strokeWidth="1.4" />
        <path d="M14 24h96" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="52" cy="38" rx="34" ry="13" fill="#3a3a36" />
        <ellipse cx="52" cy="38" rx="26" ry="9.6" fill="none" stroke="#55554f" strokeWidth="1.2" />
        <ellipse cx="52" cy="38" rx="9" ry="3.6" fill={PA_TEAL} />
        <circle cx="100" cy="30" r="5" fill={PA_BRONZE} />
        <path d="M100 30 92 46 70 44" fill="none" stroke={PA_BRONZE_DARK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        {[96, 108].map((x) => (
          <circle key={x} cx={x} cy="52" r="3" fill={PA_BRONZE} />
        ))}
      </svg>
    ),
  },
  {
    id: "pa-plant",
    group: "plant",
    width: 88,
    height: 118,
    fits: ["RB", "LB", "B", "B2"],
    art: <Plant pot={PA_TEAL} rim="#7fa9a3" leaf="#8fae86" leafDark="#6f8f68" />,
  },
  {
    id: "records",
    width: 90,
    height: 70,
    fits: ["B", "B2", "RB", "LB"],
    art: (
      <svg viewBox="0 0 90 70">
        <ellipse cx="45" cy="66" rx="40" ry="4" fill={PA_SHADOW} />
        <rect x="8" y="26" width="74" height="38" rx="5" fill={PA_WOOD} />
        <path d="M82 30v30a4 4 0 0 1-4 4H66a4 4 0 0 0 4-4V26h8a4 4 0 0 1 4 4z" fill={PA_WOOD_DARK} opacity="0.5" />
        {[
          [18, "#d9a66b"],
          [30, PA_TEAL],
          [42, "#e7d6b4"],
          [54, "#c26a4a"],
        ].map(([x, ink]) => (
          <rect key={String(x)} x={Number(x)} y="8" width="10" height="30" rx="2" fill={String(ink)} transform={`rotate(${(Number(x) - 36) / 6} ${Number(x) + 5} 38)`} />
        ))}
        <path d="M14 34h62" stroke="#e6c79c" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
];

const RED = "#c94a3c";
const RED_DARK = "#9e3328";
const RED_LIGHT = "#ef8f7f";
const CREAM = "#f6eddc";
const CREAM_SHADE = "#e2d4bb";
const CREAM_EDGE = "#c9b99e";
const FIRE_BRASS = "#c9953f";
const FIRE_BRASS_LIGHT = "#f0cf86";
const FIRE_SHADOW = "rgb(84 58 40 / 0.16)";

/** A 1950s fire-safety corridor: extinguisher, lantern, alarm panel, sand bucket, hose reel, and a plant. */
const FIRE: Piece[] = [
  {
    id: "extinguisher",
    width: 64,
    height: 140,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 64 140">
        <ellipse cx="32" cy="136" rx="24" ry="4" fill={FIRE_SHADOW} />
        <path d="M16 40a16 12 0 0 1 32 0v88a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6z" fill={RED} />
        <path d="M48 40v88a6 6 0 0 1-6 6h-6a6 6 0 0 0 6-6V40c0-6-4-10-9-11.6C42 29 48 33 48 40z" fill={RED_DARK} opacity="0.7" />
        <path d="M21 42v82" stroke={RED_LIGHT} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        <rect x="16" y="66" width="32" height="26" rx="2" fill={CREAM} />
        <path d="M22 74h20M22 80h14M22 86h17" stroke={CREAM_EDGE} strokeWidth="2" strokeLinecap="round" />
        <rect x="26" y="20" width="12" height="10" rx="2" fill={FIRE_BRASS} />
        <path d="M28 22h8" stroke={FIRE_BRASS_LIGHT} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M24 16h22l4 3" fill="none" stroke="#5b4a3c" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M38 24c10 0 14 10 14 24v40" fill="none" stroke="#4a3b30" strokeWidth="4" strokeLinecap="round" />
        <rect x="48" y="86" width="8" height="12" rx="2" fill="#4a3b30" />
      </svg>
    ),
  },
  {
    id: "lantern",
    width: 74,
    height: 120,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 74 120" overflow="visible">
        <defs>
          <radialGradient id="pc-sur-fire-lantern">
            <stop offset="0" stopColor="#ffe2a6" stopOpacity="0.8" />
            <stop offset="1" stopColor="#ffe2a6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="40" cy="66" r="40" fill="url(#pc-sur-fire-lantern)" />
        <rect x="4" y="22" width="8" height="40" rx="3" fill={FIRE_BRASS} />
        <path d="M8 34h22c6 0 10 4 10 10" fill="none" stroke={FIRE_BRASS} strokeWidth="4" strokeLinecap="round" />
        <path d="M26 50h28l-4-8H30z" fill={RED} />
        <path d="M30 42h20" stroke={RED_LIGHT} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M28 50h24v38a4 4 0 0 1-4 4H32a4 4 0 0 1-4-4z" fill="#fff4d8" stroke={CREAM_EDGE} strokeWidth="1.4" />
        <path d="M40 50v42M28 70h24" stroke={CREAM_EDGE} strokeWidth="1.2" opacity="0.8" />
        <ellipse cx="40" cy="72" rx="5" ry="8" fill="#ffd27a" />
        <path d="M32 54v32" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <rect x="26" y="92" width="28" height="6" rx="3" fill={RED} />
        <path d="M36 98h8l-4 6z" fill={RED_DARK} />
      </svg>
    ),
  },
  {
    id: "alarm-panel",
    width: 96,
    height: 112,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 96 112">
        <rect x="10" y="10" width="80" height="98" rx="10" fill={FIRE_SHADOW} />
        <rect x="6" y="4" width="80" height="98" rx="10" fill={CREAM} />
        <path d="M86 14v78a10 10 0 0 1-10 10H16a10 10 0 0 0 8-6h52a4 4 0 0 0 4-4V8a10 10 0 0 1 6 6z" fill={CREAM_SHADE} />
        <path d="M6 14a10 10 0 0 1 10-10h60a10 10 0 0 1 10 10v10H6z" fill={RED} />
        <path d="M14 8h58" stroke={RED_LIGHT} strokeWidth="2" strokeLinecap="round" />
        <circle cx="46" cy="46" r="13" fill={RED_DARK} />
        <circle cx="46" cy="46" r="10.6" fill={RED} />
        <circle cx="42.5" cy="42.5" r="3.6" fill={RED_LIGHT} />
        {[22, 38, 54, 70].map((x) => (
          <circle key={x} cx={x} cy="72" r="3.4" fill={x === 22 ? "#9fb08a" : "#e8dcc6"} stroke={CREAM_EDGE} strokeWidth="1" />
        ))}
        <rect x="36" y="82" width="20" height="10" rx="3" fill={RED} />
        <path d="M40 85h12" stroke={RED_LIGHT} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12 30v62" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: "sand-bucket",
    width: 74,
    height: 86,
    fits: ["B", "B2", "RB", "LB"],
    art: (
      <svg viewBox="0 0 74 86">
        <ellipse cx="37" cy="82" rx="28" ry="4" fill={FIRE_SHADOW} />
        <path d="M10 26h54l-8 50a6 6 0 0 1-6 5H24a6 6 0 0 1-6-5z" fill={RED} />
        <path d="M64 26l-8 50a6 6 0 0 1-6 5h-6a6 6 0 0 0 6-5l8-50z" fill={RED_DARK} opacity="0.6" />
        <path d="M14 46h46l-1.6 12H15.6z" fill={CREAM} />
        <path d="M19 32l5 40" stroke={RED_LIGHT} strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
        <ellipse cx="37" cy="26" rx="27" ry="6" fill="#e9d3a6" />
        <ellipse cx="37" cy="25" rx="23" ry="4" fill="#f2e1bd" />
        <path d="M10 26C10 6 64 6 64 26" fill="none" stroke="#7d6a58" strokeWidth="2.4" />
      </svg>
    ),
  },
  {
    id: "hose-reel",
    width: 116,
    height: 116,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 116 116">
        <circle cx="60" cy="60" r="50" fill={FIRE_SHADOW} />
        <circle cx="56" cy="56" r="50" fill={RED} />
        <circle cx="56" cy="56" r="44" fill={RED_DARK} opacity="0.35" />
        {[40, 33, 26].map((r) => (
          <circle key={r} cx="56" cy="56" r={r} fill="none" stroke={CREAM} strokeWidth="6" />
        ))}
        {[40, 33, 26].map((r) => (
          <circle key={`s${r}`} cx="56" cy="56" r={r} fill="none" stroke={CREAM_SHADE} strokeWidth="1.4" strokeDasharray="3 5" />
        ))}
        <circle cx="56" cy="56" r="14" fill={RED} />
        <circle cx="56" cy="56" r="5" fill={FIRE_BRASS} />
        <path d="M20 26A48 48 0 0 1 60 8" fill="none" stroke={RED_LIGHT} strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        <path d="M94 70l12 6" stroke={FIRE_BRASS} strokeWidth="6" strokeLinecap="round" />
        <path d="M95 68.5l9 4.5" stroke={FIRE_BRASS_LIGHT} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "exit-sign",
    group: "sign",
    width: 120,
    height: 60,
    fits: ["T", "T2", "RT", "LT"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 120 60">
        <rect x="8" y="10" width="108" height="46" rx="8" fill={FIRE_SHADOW} />
        <rect x="4" y="6" width="108" height="46" rx="8" fill={CREAM} stroke={CREAM_EDGE} strokeWidth="1.4" />
        <path d="M12 10h92" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <text x="50" y="40" textAnchor="middle" fontSize="24" fontWeight="800" letterSpacing="2" fill={RED} fontFamily="inherit">
          EXIT
        </text>
        <path d="M86 29h14m-5-6 6 6-6 6" fill="none" stroke={RED} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "fire-blanket",
    width: 70,
    height: 100,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 70 100">
        <rect x="9" y="10" width="56" height="86" rx="8" fill={FIRE_SHADOW} />
        <rect x="5" y="6" width="56" height="86" rx="8" fill={RED} />
        <path d="M61 16v66a10 10 0 0 1-10 10H18a8 8 0 0 0 6-4h27a4 4 0 0 0 4-4V10a8 8 0 0 1 6 6z" fill={RED_DARK} opacity="0.6" />
        <rect x="13" y="24" width="40" height="30" rx="4" fill={CREAM} />
        <path d="M33 30c-5 6-8 10-8 14a8 8 0 0 0 16 0c0-4-3-8-8-14z" fill={RED} />
        <path d="M33 38c-2 3-3 5-3 7a3 3 0 0 0 6 0c0-2-1-4-3-7z" fill="#ffd27a" />
        <rect x="21" y="66" width="24" height="16" rx="3" fill={CREAM_SHADE} />
        <path d="M27 74h12" stroke={RED} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M10 12v74" stroke={RED_LIGHT} strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
      </svg>
    ),
  },
  {
    id: "standpipe",
    width: 72,
    height: 96,
    fits: ["B", "B2", "RB", "LB"],
    art: (
      <svg viewBox="0 0 72 96">
        <ellipse cx="36" cy="92" rx="26" ry="4" fill={FIRE_SHADOW} />
        <rect x="18" y="80" width="36" height="10" rx="3" fill={RED_DARK} />
        <path d="M22 36a14 12 0 0 1 28 0v44H22z" fill={RED} />
        <path d="M26 38v38" stroke={RED_LIGHT} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        <rect x="18" y="30" width="36" height="8" rx="4" fill={RED_DARK} />
        <rect x="30" y="14" width="12" height="12" rx="3" fill={RED} />
        <rect x="28" y="10" width="16" height="6" rx="3" fill={FIRE_BRASS} />
        {[10, 62].map((x) => (
          <g key={x}>
            <rect x={x === 10 ? 8 : 50} y="48" width="14" height="14" rx="4" fill={RED} />
            <circle cx={x === 10 ? 11 : 61} cy="55" r="5" fill={FIRE_BRASS} />
            <circle cx={x === 10 ? 10 : 60} cy="54" r="1.8" fill={FIRE_BRASS_LIGHT} />
          </g>
        ))}
      </svg>
    ),
  },
  {
    id: "corridor-plant",
    group: "plant",
    width: 88,
    height: 118,
    fits: ["RB", "LB", "B", "B2"],
    art: <Plant pot="#e9dcc4" rim="#f6eddc" leaf="#9fb08a" leafDark="#7f9170" />,
  },
];

const SAGE = "#9fb08a";
const SAGE_DARK = "#7f9170";
const SAGE_LIGHT = "#c4d0b2";
const STONE = "#efe7d8";
const STONE_SHADE = "#d9ccb6";
const COPPER = "#c27a46";
const COPPER_LIGHT = "#eab58a";
const WOOD = "#d9bf98";
const WOOD_SHADE = "#bf9f74";
const PLUMB_SHADOW = "rgb(84 74 48 / 0.16)";

const KITCHEN_MINT = { name: "mint", body: "#cfe3d6", side: "#b2cdbb", line: "#9fbcaa" };
const KITCHEN_BUTTER = { name: "butter", body: "#f3e3a6", side: "#ddc983", line: "#cdb76f" };
const KITCHEN_BLUSH = { name: "blush", body: "#f0cdc4", side: "#dcafa4", line: "#cc9d91" };
const KITCHEN_POWDER = { name: "powder", body: "#cfe0ea", side: "#adc6d3", line: "#98b5c3" };
type Kitchen = typeof KITCHEN_MINT;
const CHROME = "#e9e6df";
const CHROME_EDGE = "#b7b2a6";

function Fridge({ k }: { k: Kitchen }) {
  return (
    <svg viewBox="0 0 92 200">
      <ellipse cx="46" cy="196" rx="40" ry="4" fill={PLUMB_SHADOW} />
      <path d="M8 40a38 30 0 0 1 76 0v146a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6z" fill={k.body} />
      <path d="M84 40v146a6 6 0 0 1-6 6h-8a6 6 0 0 0 6-6V40c0-14-8-24-20-28 16 2 28 14 28 28z" fill={k.side} />
      <path d="M14 44c0-14 10-26 26-30" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M10 88h72" stroke={k.line} strokeWidth="2" />
      <rect x="64" y="52" width="7" height="26" rx="3.5" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="1" />
      <rect x="64" y="100" width="7" height="34" rx="3.5" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="1" />
      <rect x="30" y="24" width="32" height="7" rx="3.5" fill="#eae6dc" />
      <path d="M14 96v84" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity="0.45" />
      <rect x="14" y="186" width="10" height="8" rx="2" fill="#9a9488" />
      <rect x="68" y="186" width="10" height="8" rx="2" fill="#9a9488" />
    </svg>
  );
}

/** Speckled stoneware, the pots and dishes in a 1950s bath. */
function Speckles({ dots }: { dots: readonly (readonly [number, number])[] }) {
  return (
    <>
      {dots.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="#a8977a" opacity="0.55" />
      ))}
    </>
  );
}

/** Bathrooms and a kitchen corner from the 1950s: towels, plants, soap, a stool, a round-top fridge. */
const PLUMBING: Piece[] = [
  {
    id: "towel-rail",
    width: 120,
    height: 120,
    fits: ["RT", "LT", "T", "T2"],
    art: (
      <svg viewBox="0 0 120 120">
        <rect x="8" y="10" width="104" height="7" rx="3.5" fill={COPPER} />
        <path d="M12 11.5h96" stroke={COPPER_LIGHT} strokeWidth="2" strokeLinecap="round" />
        {[8, 112].map((x) => (
          <g key={x}>
            <circle cx={x} cy="13.5" r="7" fill={COPPER} />
            <circle cx={x - 1.6} cy="11.8" r="2.4" fill={COPPER_LIGHT} />
          </g>
        ))}
        <path d="M26 17h66l-4 84H30z" fill={SAGE} />
        <path d="M26 17h66l-.6 10H26.4z" fill={SAGE_DARK} opacity="0.55" />
        <path d="M34 30v66M46 30v66M58 30v66M70 30v66M82 30v66" stroke={SAGE_LIGHT} strokeWidth="1.4" opacity="0.55" />
        <path d="M30 101h58" stroke={SAGE_DARK} strokeWidth="2" />
        {Array.from({ length: 14 }, (_, i) => (
          <path key={i} d={`M${32 + i * 4} 101v8`} stroke={SAGE} strokeWidth="1.8" strokeLinecap="round" />
        ))}
        <path d="M30 26v66" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity="0.35" />
      </svg>
    ),
  },
  {
    id: "niche",
    width: 140,
    height: 96,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 140 96">
        <rect x="4" y="4" width="132" height="88" rx="10" fill={STONE_SHADE} />
        <rect x="12" y="12" width="116" height="76" rx="6" fill="#e3d7c3" />
        <path d="M12 18h116" stroke="#cdbea5" strokeWidth="6" opacity="0.55" />
        <rect x="8" y="84" width="124" height="8" rx="4" fill={STONE} />
        {[
          [62, "#e8dcc6", "#d5c6ab"],
          [44, "#efe5d3", "#dacbb2"],
          [26, "#e8dcc6", "#d5c6ab"],
        ].map(([y, face, edge]) => (
          <g key={String(y)}>
            <rect x="26" y={Number(y)} width="88" height="20" rx="9" fill={String(face)} />
            <path d={`M30 ${Number(y) + 14}h80`} stroke={String(edge)} strokeWidth="2" strokeLinecap="round" />
            <path d={`M32 ${Number(y) + 4}h60`} stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
          </g>
        ))}
      </svg>
    ),
  },
  {
    id: "vase-sprig",
    width: 80,
    height: 124,
    fits: ["RB", "LB", "B", "B2"],
    art: (
      <svg viewBox="0 0 80 124">
        <ellipse cx="40" cy="120" rx="24" ry="3.6" fill={PLUMB_SHADOW} />
        <path d="M40 66C38 46 40 26 46 8" stroke="#6f7f5b" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M40 60C34 44 26 34 16 28" stroke="#6f7f5b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        {[
          [46, 10, -30],
          [44, 20, 30],
          [42, 30, -34],
          [41, 40, 32],
          [20, 30, -60],
          [27, 37, 40],
          [33, 46, -40],
          [50, 16, 60],
        ].map(([x, y, a]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="7.5" ry="3.2" fill={SAGE} transform={`rotate(${a} ${x} ${y})`} />
        ))}
        <path d="M28 66h24c6 8 8 20 6 34-1.4 10-7 17-18 17s-16.6-7-18-17c-2-14 0-26 6-34z" fill={STONE} />
        <path d="M58 100c-1.4 10-7 17-18 17-3 0-5.6-.6-7.8-1.6 10.6-.4 16.4-7.4 17.8-17.4 1.2-9-.2-17.6-3.6-25.4 6.2 7.6 13 17.4 11.6 27.4z" fill={STONE_SHADE} />
        {[30, 36, 42, 48].map((x) => (
          <path key={x} d={`M${x} 72c-1 14-1 28 1 40`} stroke={STONE_SHADE} strokeWidth="1.4" fill="none" opacity="0.9" />
        ))}
        <rect x="26" y="62" width="28" height="7" rx="3.5" fill="#f7f1e6" />
      </svg>
    ),
  },
  {
    id: "potted-plant",
    group: "plant",
    width: 96,
    height: 124,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 96 124">
        <ellipse cx="48" cy="120" rx="30" ry="4" fill={PLUMB_SHADOW} />
        {[
          [48, 60, -90, 30],
          [36, 52, -130, 26],
          [60, 52, -50, 26],
          [26, 62, -165, 24],
          [70, 62, -15, 24],
          [42, 40, -105, 22],
          [56, 40, -75, 22],
        ].map(([x, y, a, len]) => (
          <ellipse
            key={`${x}-${y}`}
            cx={x + Math.cos((a * Math.PI) / 180) * len * 0.55}
            cy={y + Math.sin((a * Math.PI) / 180) * len * 0.55}
            rx={len * 0.6}
            ry={len * 0.24}
            fill={a < -60 && a > -120 ? SAGE : SAGE_DARK}
            transform={`rotate(${a} ${x + Math.cos((a * Math.PI) / 180) * len * 0.55} ${y + Math.sin((a * Math.PI) / 180) * len * 0.55})`}
          />
        ))}
        <path d="M22 70h52l-6 40a9 9 0 0 1-9 8H37a9 9 0 0 1-9-8z" fill={STONE} />
        <path d="M74 70l-6 40a9 9 0 0 1-9 8h-6a9 9 0 0 0 8-8l5-40z" fill={STONE_SHADE} />
        <rect x="18" y="64" width="60" height="10" rx="5" fill="#f6efe2" />
        <Speckles dots={[[30, 82], [38, 96], [46, 86], [56, 100], [62, 84], [34, 108], [50, 110], [42, 78]]} />
      </svg>
    ),
  },
  {
    id: "stool",
    width: 96,
    height: 140,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 96 140">
        <ellipse cx="48" cy="136" rx="34" ry="4" fill={PLUMB_SHADOW} />
        <path d="M28 74 20 134M68 74l8 60M48 76v58" stroke={WOOD_SHADE} strokeWidth="7" strokeLinecap="round" />
        <path d="M27 76 20 132" stroke={WOOD} strokeWidth="3" strokeLinecap="round" />
        <path d="M24 110h48" stroke={WOOD_SHADE} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="48" cy="74" rx="38" ry="9" fill={WOOD_SHADE} />
        <ellipse cx="48" cy="70" rx="38" ry="9" fill={WOOD} />
        <path d="M18 68c10-5 40-6 58 0" stroke="#ead6b6" strokeWidth="2" fill="none" strokeLinecap="round" />
        {[
          [48, 44, -90],
          [40, 46, -125],
          [56, 46, -55],
          [34, 52, -160],
          [62, 52, -20],
        ].map(([x, y, a]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="11" ry="4" fill={a === -90 ? SAGE : SAGE_DARK} transform={`rotate(${a} ${x} ${y})`} />
        ))}
        <path d="M36 52h24l-3 13a4 4 0 0 1-4 3H43a4 4 0 0 1-4-3z" fill={STONE} />
        <rect x="34" y="49" width="28" height="6" rx="3" fill="#f6efe2" />
      </svg>
    ),
  },
  {
    id: "towel-fold",
    width: 112,
    height: 64,
    fits: ["B", "B2", "LB", "RB"],
    art: (
      <svg viewBox="0 0 112 64">
        <ellipse cx="56" cy="60" rx="50" ry="4" fill={PLUMB_SHADOW} />
        <rect x="8" y="34" width="96" height="24" rx="10" fill={SAGE_DARK} />
        <rect x="8" y="32" width="96" height="22" rx="10" fill={SAGE} />
        <path d="M14 47h84" stroke={SAGE_DARK} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        <rect x="16" y="12" width="82" height="22" rx="10" fill={SAGE_LIGHT} />
        <path d="M22 27h70" stroke={SAGE} strokeWidth="2" strokeLinecap="round" />
        <path d="M24 17h50" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: "soap-dish",
    width: 86,
    height: 50,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 0 86 50">
        <ellipse cx="43" cy="44" rx="36" ry="5" fill={PLUMB_SHADOW} />
        <path d="M6 26h74c-2 12-14 18-37 18S8 38 6 26z" fill={STONE} />
        <path d="M80 26c-2 12-14 18-37 18-6 0-11-.4-15-1.4 26 0 41-6 44-16.6z" fill={STONE_SHADE} />
        <ellipse cx="43" cy="26" rx="37" ry="7" fill="#f6efe2" />
        <ellipse cx="43" cy="26.6" rx="30" ry="4.6" fill={STONE_SHADE} />
        {[
          [30, 22, "#b5ad9c"],
          [44, 21, "#a39b8a"],
          [56, 23, "#c2bba9"],
        ].map(([x, y, c]) => (
          <g key={String(x)}>
            <ellipse cx={Number(x)} cy={Number(y)} rx="7.5" ry="5" fill={String(c)} />
            <ellipse cx={Number(x) - 2} cy={Number(y) - 1.8} rx="3" ry="1.4" fill="white" opacity="0.5" />
          </g>
        ))}
      </svg>
    ),
  },
  {
    id: "fridge-mint",
    group: "fridge",
    width: 92,
    height: 200,
    fits: ["RB", "LB"],
    art: <Fridge k={KITCHEN_MINT} />,
  },
  {
    id: "bath-mat",
    width: 150,
    height: 56,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 0 150 56">
        <ellipse cx="75" cy="44" rx="66" ry="6" fill={PLUMB_SHADOW} />
        <path d="M20 10h110l12 32H8z" fill="#efe4cf" />
        <path d="M24 14h102l9 24H15z" fill="none" stroke="#dccdb2" strokeWidth="2" />
        {Array.from({ length: 22 }, (_, i) => (
          <path key={`t${i}`} d={`M${12 + i * 6.1} 42v8`} stroke="#e3d6bd" strokeWidth="1.6" strokeLinecap="round" />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <path key={`r${i}`} d={`M${26 + i} ${17 + i * 4}h${96 + i * 3}`} stroke="#e6dac4" strokeWidth="1" opacity="0.8" />
        ))}
      </svg>
    ),
  },
];

function SnakePlant({ pot, potDark, leaf, leafDark, edge }: { pot: string; potDark: string; leaf: string; leafDark: string; edge: string }) {
  return (
    <svg viewBox="0 0 80 130">
      <ellipse cx="40" cy="126" rx="24" ry="4" fill={SHADOW} />
      <path d="M26 110l-4 14M54 110l4 14M40 110v14" stroke={LR_LEG} strokeWidth="3" strokeLinecap="round" />
      <path d="M34 80C30 56 26 34 28 8c8 20 10 46 10 72z" fill={leafDark} />
      <path d="M39 80c-2-26 0-50 8-72 5 24 3 50-1 72z" fill={leaf} />
      <path d="M44 80c4-20 12-38 22-50-2 20-8 38-14 50z" fill={leafDark} />
      <path d="M31 80c-6-14-14-24-22-30 2 14 8 24 16 30z" fill={leaf} />
      <path d="M46 14c-5 20-6 42-4 64M29 14c2 20 5 42 7 64" stroke={edge} strokeWidth="1.4" fill="none" opacity="0.8" />
      <path d="M20 78h40l-4 32H24z" fill={pot} />
      <rect x="18" y="75" width="44" height="7" rx="3.5" fill={potDark} />
      <path d="M25 86l2 20" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

const LIGHTS_MORE: Piece[] = [
  {
    id: "tulip-chair",
    width: 96,
    height: 124,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 96 124">
        <ellipse cx="48" cy="120" rx="30" ry="4" fill={SHADOW} />
        <ellipse cx="48" cy="115" rx="22" ry="5" fill="#e4dccb" />
        <path d="M44 84h8l4 30H40z" fill="#efe8db" />
        <path d="M16 64C10 38 22 10 48 8s40 26 32 56c-8-4-20-6-32-6s-24 2-32 6z" fill="#f8f4ec" />
        <path d="M24 60C20 40 30 20 48 18s30 20 26 42c-8-2-16-3-26-3s-18 1-26 3z" fill="#e8dfcf" />
        <path d="M22 30c4-10 12-16 22-18" stroke="white" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <ellipse cx="48" cy="64" rx="30" ry="9" fill={MUSTARD.main} />
        <path d="M28 61c12-4 28-4 40 0" stroke={MUSTARD.light} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <path d="M14 66c4 12 16 20 34 20s30-8 34-20c-8 4-20 6-34 6s-26-2-34-6z" fill="#f8f4ec" />
        <path d="M22 74c6 5 14 8 22 9" stroke="#e4dccb" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "tripod-lamp",
    width: 90,
    height: 210,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 90 210" overflow="visible">
        <GlowDefs id="pc-sur-tripod" />
        <ellipse cx="45" cy="206" rx="30" ry="4" fill={SHADOW} />
        <circle cx="45" cy="56" r="40" fill="url(#pc-sur-tripod)" />
        <path d="M45 96 22 204M45 96 68 204M45 96v108" stroke={LR_LEG} strokeWidth="4" strokeLinecap="round" />
        <rect x="43" y="56" width="4" height="42" fill={LR_BRASS} />
        <ellipse cx="45" cy="97" rx="5" ry="3" fill={LR_BRASS} />
        <path d="M30 16h30l12 44H18z" fill={POWDER.main} />
        <path d="M60 16l12 44h-10L54 16z" fill={POWDER.dark} opacity="0.6" />
        <path d="M33 20 24 54" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity="0.6" />
        <ellipse cx="45" cy="60" rx="27" ry="3.4" fill={POWDER.dark} />
        <ellipse cx="45" cy="60.6" rx="20" ry="2" fill="#fff1c2" />
      </svg>
    ),
  },
  {
    id: "starburst-clock",
    width: 96,
    height: 96,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 96 96">
        {Array.from({ length: 12 }, (_, i) => (
          <g key={i} transform={`rotate(${i * 30} 48 48)`}>
            <path d="M48 10v22" stroke={LR_BRASS} strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="48" cy="9" r="3.4" fill={i % 2 ? LR_BRASS : "#7fa9a3"} />
          </g>
        ))}
        <circle cx="49.5" cy="49.5" r="20" fill={SHADOW} />
        <circle cx="48" cy="48" r="20" fill={LR_BRASS} />
        <circle cx="48" cy="48" r="16" fill={LR_CREAM} />
        {[0, 90, 180, 270].map((a) => (
          <rect key={a} x="47.2" y="34" width="1.6" height="4" rx="0.8" fill={LR_BRONZE_DARK} transform={`rotate(${a} 48 48)`} />
        ))}
        <path d="M48 48V37M48 48l8 4" stroke={LR_BRONZE_DARK} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="48" cy="48" r="2" fill={LR_BRONZE_DARK} />
      </svg>
    ),
  },
  {
    id: "wall-shelf",
    width: 124,
    height: 74,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 124 74">
        <rect x="8" y="50" width="112" height="8" rx="3" fill={WALNUT.dark} />
        <rect x="6" y="46" width="112" height="8" rx="3" fill={WALNUT.main} />
        <path d="M10 48h104" stroke={WALNUT.light} strokeWidth="1.6" strokeLinecap="round" />
        <rect x="14" y="18" width="8" height="28" rx="1.5" fill="#7fa9a3" />
        <rect x="23" y="22" width="7" height="24" rx="1.5" fill="#e3bd6c" />
        <rect x="31" y="16" width="8" height="30" rx="1.5" fill="#e39a82" />
        <rect x="42" y="20" width="7" height="26" rx="1.5" fill={LR_CREAM_SHADE} transform="rotate(14 45 46)" />
        <path d="M68 46c-6 0-8-6-8-12s4-10 4-16h8c0 6 4 10 4 16s-2 12-8 12z" fill={POWDER.main} />
        <path d="M63 30c0-4 2-7 3-10" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
        <path d="M88 46h18l-2-12H90z" fill={LR_CREAM} />
        <path d="M97 34c2 10 6 20 4 34M93 34c-4 8-6 16-4 24" stroke="#729760" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        {[
          [99, 44],
          [103, 54],
          [100, 64],
          [91, 44],
          [89, 54],
          [97, 28],
          [102, 30],
        ].map(([x, y]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="4" ry="2.4" fill="#93b47e" transform={`rotate(${x > 96 ? 30 : -30} ${x} ${y})`} />
        ))}
      </svg>
    ),
  },
  {
    id: "snake-plant",
    group: "plant",
    width: 80,
    height: 130,
    fits: ["RB", "LB", "B", "B2"],
    art: <SnakePlant pot={MUSTARD.main} potDark={MUSTARD.dark} leaf="#8fae7c" leafDark="#6f8f5e" edge="#e4dca0" />,
  },
  {
    id: "plant-teal",
    group: "plant",
    width: 90,
    height: 120,
    fits: ["RB", "LB", "B", "B2"],
    art: <Plant pot="#7fa9a3" rim="#b9d3cf" leaf="#9cbc84" leafDark="#729760" />,
  },
  {
    id: "abstract-print",
    width: 96,
    height: 84,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 96 84">
        <rect x="9" y="9" width="82" height="72" rx="3" fill={SHADOW} />
        <rect x="5" y="5" width="82" height="72" rx="3" fill={WALNUT.main} />
        <rect x="11" y="11" width="70" height="60" rx="1.5" fill={LR_CREAM} />
        <path d="M18 54c10-22 26-30 44-24-12 2-22 10-28 24z" fill="#7fa9a3" />
        <circle cx="58" cy="28" r="9" fill="#e3bd6c" />
        <path d="M44 62c6-10 16-16 30-16-6 6-14 12-30 16z" fill="#e39a82" />
        <path d="M22 22l16 6M26 34l-4 8" stroke={LR_BRONZE_DARK} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "wall-sconces",
    width: 110,
    height: 80,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 110 80" overflow="visible">
        <GlowDefs id="pc-sur-sconce" />
        {[28, 82].map((x) => (
          <g key={x}>
            <circle cx={x} cy="30" r="24" fill="url(#pc-sur-sconce)" />
            <rect x={x - 4} y="44" width="8" height="18" rx="3" fill={LR_BRASS} />
            <path d={`M${x} 52h-10v-8`} stroke={LR_BRASS} strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <path d={`M${x - 14} 42l4-24h20l4 24z`} fill={x < 50 ? "#e39a82" : "#7fa9a3"} />
            <path d={`M${x - 9} 22l-3 16`} stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            <ellipse cx={x} cy="42" rx="14" ry="2.4" fill="#fff1c2" />
          </g>
        ))}
      </svg>
    ),
  },
  {
    id: "bar-cart",
    width: 120,
    height: 112,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 120 112">
        <ellipse cx="60" cy="108" rx="50" ry="4" fill={SHADOW} />
        <path d="M16 40v56M104 40v56" stroke={LR_BRASS} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M104 40c6 0 10-4 10-10" stroke={LR_BRASS} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M28 56V38c0-4 4-6 4-10v-8h6v8c0 4 4 6 4 10v18z" fill="#7fa9a3" />
        <path d="M31 40v12" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
        <path d="M48 56V42c0-3 3-5 3-8v-5h5v5c0 3 3 5 3 8v14z" fill="#e39a82" />
        {[72, 86].map((x) => (
          <path key={x} d={`M${x} 56l-3-12h12l-3 12z`} fill="white" opacity="0.85" stroke="#d4e4ea" strokeWidth="1" />
        ))}
        <rect x="10" y="55" width="100" height="6" rx="3" fill="#d4e4ea" stroke={LR_BRASS} strokeWidth="1.4" />
        <path d="M34 86c0-8 8-12 16-12s16 4 16 12z" fill={LR_CREAM} />
        {[42, 50, 58].map((x) => (
          <circle key={x} cx={x} cy="75" r="4" fill="#f2cf63" />
        ))}
        <rect x="76" y="70" width="18" height="16" rx="3" fill={LR_CREAM_SHADE} />
        <rect x="10" y="85" width="100" height="6" rx="3" fill="#d4e4ea" stroke={LR_BRASS} strokeWidth="1.4" />
        {[22, 98].map((x) => (
          <g key={x}>
            <circle cx={x} cy="100" r="7" fill={LR_BRONZE_DARK} />
            <circle cx={x} cy="100" r="3" fill={LR_BRASS_LIGHT} />
          </g>
        ))}
      </svg>
    ),
  },
];

const PLUMBING_MORE: Piece[] = [
  ...[KITCHEN_BUTTER, KITCHEN_BLUSH].map((k): Piece => ({
    id: `fridge-${k.name}`,
    group: "fridge",
    width: 92,
    height: 200,
    fits: ["RB", "LB"],
    art: <Fridge k={k} />,
  })),
  {
    id: "range",
    width: 112,
    height: 150,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 112 150">
        <ellipse cx="56" cy="146" rx="50" ry="4" fill={PLUMB_SHADOW} />
        <rect x="10" y="16" width="92" height="26" rx="6" fill={STONE} />
        <rect x="40" y="22" width="32" height="12" rx="6" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="1" />
        <circle cx="56" cy="28" r="3.6" fill="#fff8e6" stroke={CHROME_EDGE} strokeWidth="1" />
        <rect x="6" y="40" width="100" height="98" rx="6" fill={STONE} />
        <path d="M106 46v86a6 6 0 0 1-6 6h-6a6 6 0 0 0 6-6V40a6 6 0 0 1 6 6z" fill={STONE_SHADE} />
        <rect x="6" y="40" width="100" height="6" rx="3" fill={CHROME} />
        {[24, 44, 68, 88].map((x) => (
          <circle key={x} cx={x} cy="54" r="3.4" fill={KITCHEN_BLUSH.side} />
        ))}
        <rect x="16" y="64" width="80" height="58" rx="5" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="1.2" />
        <rect x="26" y="74" width="60" height="30" rx="4" fill="#d9d2c2" />
        <path d="M30 78l14 22" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity="0.6" />
        <rect x="34" y="110" width="44" height="5" rx="2.5" fill={CHROME_EDGE} />
        <rect x="14" y="138" width="10" height="6" rx="2" fill="#9a9488" />
        <rect x="88" y="138" width="10" height="6" rx="2" fill="#9a9488" />
        <path d="M70 40c0-10 6-14 14-14s14 4 14 14z" fill={KITCHEN_BLUSH.body} />
        <path d="M98 34l7-5" stroke={KITCHEN_BLUSH.side} strokeWidth="3" strokeLinecap="round" />
        <path d="M76 26c2-6 14-6 16 0" stroke={COPPER} strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "kitchen-counter",
    width: 140,
    height: 126,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 140 126">
        <ellipse cx="70" cy="122" rx="64" ry="4" fill={PLUMB_SHADOW} />
        <rect x="10" y="58" width="120" height="60" rx="4" fill={KITCHEN_BUTTER.body} />
        <path d="M70 62v52" stroke={KITCHEN_BUTTER.line} strokeWidth="1.6" />
        {[16, 76].map((x) => (
          <rect key={x} x={x} y="66" width="48" height="44" rx="4" fill="none" stroke={KITCHEN_BUTTER.side} strokeWidth="2" />
        ))}
        <rect x="58" y="84" width="4" height="12" rx="2" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="0.8" />
        <rect x="78" y="84" width="4" height="12" rx="2" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="0.8" />
        <rect x="6" y="50" width="128" height="10" rx="3" fill={STONE} />
        <path d="M6 58h128" stroke={CHROME_EDGE} strokeWidth="1.6" />
        <path d="M18 50V36a12 10 0 0 1 24 0v14z" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="1.2" />
        <path d="M24 30h4M32 30h4" stroke={CHROME_EDGE} strokeWidth="2" strokeLinecap="round" />
        <path d="M22 38v8" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <rect x="60" y="34" width="14" height="16" rx="2" fill={KITCHEN_MINT.body} />
        <rect x="76" y="28" width="14" height="22" rx="2" fill={KITCHEN_BLUSH.body} />
        <rect x="58" y="30" width="18" height="5" rx="2" fill={KITCHEN_MINT.side} />
        <rect x="74" y="24" width="18" height="5" rx="2" fill={KITCHEN_BLUSH.side} />
        <path d="M100 50V40h26v10" fill="none" stroke={CHROME_EDGE} strokeWidth="1.6" />
        {[104, 110, 116].map((x) => (
          <ellipse key={x} cx={x} cy="38" rx="3" ry="12" fill={x === 110 ? KITCHEN_POWDER.body : STONE} stroke={STONE_SHADE} strokeWidth="1" />
        ))}
      </svg>
    ),
  },
  {
    id: "vanity",
    width: 104,
    height: 178,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 104 178">
        <ellipse cx="52" cy="174" rx="44" ry="4" fill={PLUMB_SHADOW} />
        <circle cx="52" cy="34" r="30" fill={COPPER} />
        <circle cx="52" cy="34" r="26" fill="#e7eff0" />
        <path d="M36 22c4-6 10-9 16-10" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
        <rect x="12" y="98" width="80" height="70" rx="5" fill={KITCHEN_POWDER.body} />
        <path d="M92 104v58a6 6 0 0 1-6 6h-6a6 6 0 0 0 6-6V98a6 6 0 0 1 6 6z" fill={KITCHEN_POWDER.side} />
        <path d="M52 104v58" stroke={KITCHEN_POWDER.line} strokeWidth="1.6" />
        <circle cx="46" cy="132" r="2.4" fill={COPPER} />
        <circle cx="58" cy="132" r="2.4" fill={COPPER} />
        <rect x="8" y="88" width="88" height="12" rx="4" fill={STONE} />
        <ellipse cx="52" cy="90" rx="26" ry="4" fill={STONE_SHADE} />
        <path d="M52 88V76h10" stroke={CHROME_EDGE} strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="18" y="80" width="10" height="8" rx="2" fill={KITCHEN_BLUSH.body} />
        <rect x="18" y="168" width="8" height="6" rx="2" fill="#9a9488" />
        <rect x="78" y="168" width="8" height="6" rx="2" fill="#9a9488" />
      </svg>
    ),
  },
  {
    id: "clawfoot-tub",
    width: 150,
    height: 104,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 150 104">
        <ellipse cx="75" cy="100" rx="66" ry="4" fill={PLUMB_SHADOW} />
        <path d="M120 40V16a8 8 0 0 1 16 0v4" stroke={CHROME_EDGE} strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path d="M12 42h126c0 30-14 46-40 46H52C26 88 12 72 12 42z" fill={KITCHEN_BLUSH.body} />
        <path d="M138 42c0 30-14 46-40 46h-12c26 0 40-16 42-46z" fill={KITCHEN_BLUSH.side} />
        <rect x="8" y="36" width="134" height="10" rx="5" fill={STONE} />
        <path d="M20 54c2 12 10 22 22 26" stroke="white" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.6" />
        {[34, 116].map((x) => (
          <path key={x} d={`M${x - 6} 86h12l-2 10h-8z`} fill={COPPER} />
        ))}
      </svg>
    ),
  },
  {
    id: "toilet",
    width: 84,
    height: 132,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 84 132">
        <ellipse cx="42" cy="128" rx="30" ry="4" fill={PLUMB_SHADOW} />
        <rect x="14" y="10" width="56" height="44" rx="6" fill={KITCHEN_MINT.body} />
        <path d="M70 16v32a6 6 0 0 1-6 6h-6a6 6 0 0 0 6-6V10a6 6 0 0 1 6 6z" fill={KITCHEN_MINT.side} />
        <rect x="10" y="6" width="64" height="8" rx="4" fill={KITCHEN_MINT.side} />
        <rect x="18" y="22" width="12" height="4" rx="2" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="0.8" />
        <path d="M30 54h24v20H30z" fill={KITCHEN_MINT.side} />
        <path d="M8 74h68c0 16-12 26-24 28l2 22H30l2-22C20 100 8 90 8 74z" fill={KITCHEN_MINT.body} />
        <ellipse cx="42" cy="74" rx="34" ry="6" fill={STONE} />
        <path d="M16 82c4 8 10 13 18 16" stroke="white" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: "medicine-cabinet",
    width: 78,
    height: 100,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 78 100">
        <rect x="10" y="8" width="64" height="88" rx="8" fill={PLUMB_SHADOW} />
        <rect x="6" y="4" width="64" height="88" rx="8" fill={STONE} stroke={STONE_SHADE} strokeWidth="2" />
        <rect x="13" y="11" width="50" height="58" rx="5" fill="#e3eced" />
        <path d="M20 18l16 22M28 16l12 16" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
        <rect x="13" y="74" width="50" height="4" rx="2" fill={STONE_SHADE} />
        <rect x="18" y="62" width="8" height="12" rx="2" fill={KITCHEN_BLUSH.body} />
        <rect x="30" y="66" width="6" height="8" rx="2" fill={COPPER_LIGHT} />
        <path d="M44 74v-10h6v10" fill={KITCHEN_POWDER.body} />
        <rect x="58" y="36" width="4" height="12" rx="2" fill={COPPER} />
      </svg>
    ),
  },
  {
    id: "canister-shelf",
    width: 126,
    height: 72,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 126 72">
        <rect x="8" y="54" width="114" height="8" rx="3" fill={WOOD_SHADE} />
        <rect x="6" y="50" width="114" height="8" rx="3" fill={WOOD} />
        <path d="M14 58v8M112 58v8" stroke={WOOD_SHADE} strokeWidth="3" strokeLinecap="round" />
        {[
          [12, 30, KITCHEN_MINT],
          [36, 24, KITCHEN_BUTTER],
          [58, 20, KITCHEN_BLUSH],
        ].map(([x, h, k]) => {
          const left = Number(x);
          const tall = Number(h);
          const tone = k as Kitchen;
          return (
            <g key={left}>
              <rect x={left} y={50 - tall} width="20" height={tall} rx="3" fill={tone.body} />
              <rect x={left - 1} y={46 - tall} width="22" height="6" rx="3" fill={tone.side} />
              <rect x={left + 7} y={42 - tall} width="6" height="4" rx="2" fill={CHROME} />
              <path d={`M${left + 4} ${54 - tall}v${tall - 8}`} stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
            </g>
          );
        })}
        <path d="M86 50h20l-2-14H88z" fill={STONE} />
        <path d="M106 40h4a4 4 0 0 1 0 8h-5" stroke={STONE_SHADE} strokeWidth="2" fill="none" />
        <path d="M92 32c1-4 4-6 2-10M98 32c1-4 4-6 2-10" stroke={STONE_SHADE} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "teapot-clock",
    width: 92,
    height: 84,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 92 84">
        <path d="M70 36c10-2 16 4 14 12l-8 6" stroke={KITCHEN_BLUSH.side} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M18 44 6 32" stroke={KITCHEN_BLUSH.side} strokeWidth="6" strokeLinecap="round" />
        <path d="M14 46c0-20 14-32 32-32s32 12 32 32-14 30-32 30-32-10-32-30z" fill={KITCHEN_BLUSH.body} />
        <rect x="34" y="6" width="24" height="10" rx="5" fill={KITCHEN_BLUSH.side} />
        <circle cx="46" cy="46" r="18" fill={STONE} stroke={KITCHEN_BLUSH.side} strokeWidth="1.6" />
        {[0, 90, 180, 270].map((a) => (
          <rect key={a} x="45.2" y="31" width="1.6" height="4" rx="0.8" fill={COPPER} transform={`rotate(${a} 46 46)`} />
        ))}
        <path d="M46 46V36M46 46l7 4" stroke="#7a5a3a" strokeWidth="2" strokeLinecap="round" />
        <circle cx="46" cy="46" r="1.8" fill="#7a5a3a" />
      </svg>
    ),
  },
  {
    id: "plate-rack",
    width: 124,
    height: 80,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 124 80">
        <rect x="8" y="60" width="110" height="8" rx="3" fill={WOOD_SHADE} />
        <rect x="6" y="56" width="110" height="8" rx="3" fill={WOOD} />
        <path d="M10 44h102" stroke={WOOD_SHADE} strokeWidth="3" strokeLinecap="round" />
        {[
          [24, KITCHEN_MINT],
          [50, KITCHEN_BUTTER],
          [76, KITCHEN_POWDER],
          [100, KITCHEN_BLUSH],
        ].map(([x, k]) => {
          const cx = Number(x);
          const tone = k as Kitchen;
          return (
            <g key={cx}>
              <circle cx={cx} cy="34" r="13" fill={STONE} stroke={STONE_SHADE} strokeWidth="1.2" />
              <circle cx={cx} cy="34" r="8.5" fill={tone.body} />
              <circle cx={cx} cy="34" r="4" fill={tone.side} opacity="0.6" />
            </g>
          );
        })}
      </svg>
    ),
  },
  {
    id: "hamper",
    width: 76,
    height: 96,
    fits: ["B", "B2", "RB", "LB"],
    art: (
      <svg viewBox="0 -24 76 96">
        <ellipse cx="38" cy="68" rx="30" ry="4" fill={PLUMB_SHADOW} />
        <path d="M12 18h52l-4 46H16z" fill={WOOD} />
        {[26, 36, 46, 56].map((y) => (
          <path key={y} d={`M14 ${y}h48`} stroke={WOOD_SHADE} strokeWidth="1.6" />
        ))}
        {[24, 38, 52].map((x) => (
          <path key={x} d={`M${x} 18v46`} stroke={WOOD_SHADE} strokeWidth="1.2" opacity="0.7" />
        ))}
        <rect x="8" y="10" width="60" height="10" rx="5" fill={KITCHEN_POWDER.side} />
        <path d="M22 18c2 8 10 10 14 6" stroke={KITCHEN_BLUSH.body} strokeWidth="5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "towel-blush",
    width: 112,
    height: 64,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 0 112 64">
        <ellipse cx="56" cy="60" rx="50" ry="4" fill={PLUMB_SHADOW} />
        <rect x="8" y="34" width="96" height="24" rx="10" fill={KITCHEN_BLUSH.side} />
        <rect x="8" y="32" width="96" height="22" rx="10" fill={KITCHEN_BLUSH.body} />
        <rect x="16" y="12" width="82" height="22" rx="10" fill={KITCHEN_POWDER.body} />
        <path d="M22 27h70" stroke={KITCHEN_POWDER.side} strokeWidth="2" strokeLinecap="round" />
        <path d="M24 17h50" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: "snake-plant-copper",
    group: "plant",
    width: 80,
    height: 130,
    fits: ["RB", "LB", "B", "B2"],
    art: <SnakePlant pot={COPPER} potDark="#a3643a" leaf={SAGE} leafDark={SAGE_DARK} edge="#e4dca0" />,
  },
];

const FIRE_MORE: Piece[] = [
  {
    id: "no-smoking",
    group: "sign",
    width: 104,
    height: 64,
    fits: ["T", "T2", "RT", "LT"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 104 64">
        <rect x="8" y="10" width="92" height="50" rx="8" fill={FIRE_SHADOW} />
        <rect x="4" y="6" width="92" height="50" rx="8" fill={CREAM} stroke={CREAM_EDGE} strokeWidth="1.4" />
        <rect x="16" y="28" width="26" height="6" rx="1" fill={CREAM_EDGE} />
        <rect x="36" y="28" width="6" height="6" fill={RED_LIGHT} />
        <path d="M44 26c2-4 0-6 2-10" stroke={CREAM_EDGE} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <circle cx="30" cy="31" r="17" fill="none" stroke={RED} strokeWidth="4" />
        <path d="M18 19l24 24" stroke={RED} strokeWidth="4" strokeLinecap="round" />
        <text x="72" y="28" textAnchor="middle" fontSize="10" fontWeight="800" letterSpacing="1" fill={RED} fontFamily="inherit">
          NO
        </text>
        <text x="72" y="42" textAnchor="middle" fontSize="10" fontWeight="800" letterSpacing="0.6" fill={RED} fontFamily="inherit">
          SMOKING
        </text>
      </svg>
    ),
  },
  {
    id: "axe-cabinet",
    width: 74,
    height: 112,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 74 112">
        <rect x="9" y="10" width="60" height="98" rx="6" fill={FIRE_SHADOW} />
        <rect x="5" y="6" width="60" height="98" rx="6" fill={RED} />
        <rect x="12" y="13" width="46" height="84" rx="3" fill="#eef1ee" />
        <path d="M35 24v64" stroke={FIRE_BRASS} strokeWidth="4" strokeLinecap="round" />
        <path d="M35 26c-10 0-16 6-16 14 6-2 12-2 16 0z" fill="#9aa3a6" />
        <path d="M35 26c6 0 10 4 10 8-4-1-7-1-10 0z" fill="#7d878a" />
        <path d="M16 20l14 22M22 18l10 14" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
        <rect x="58" y="50" width="4" height="14" rx="2" fill={FIRE_BRASS} />
      </svg>
    ),
  },
  {
    id: "first-aid",
    width: 80,
    height: 72,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 80 72">
        <rect x="10" y="14" width="66" height="54" rx="8" fill={FIRE_SHADOW} />
        <rect x="6" y="10" width="66" height="54" rx="8" fill={CREAM} stroke={CREAM_EDGE} strokeWidth="1.4" />
        <rect x="28" y="4" width="22" height="8" rx="3" fill="none" stroke={CREAM_EDGE} strokeWidth="3" />
        <path d="M6 22h66" stroke={CREAM_SHADE} strokeWidth="2" />
        <path d="M33 30h12v8h8v12h-8v8H33v-8h-8V38h8z" fill={RED} />
        <path d="M12 14h54" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      </svg>
    ),
  },
  {
    id: "helmet-hook",
    width: 92,
    height: 84,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 92 84">
        <rect x="20" y="8" width="52" height="10" rx="4" fill={FIRE_BRASS} />
        <path d="M46 18v8" stroke={FIRE_BRASS} strokeWidth="3" strokeLinecap="round" />
        <path d="M14 64c0-22 14-38 32-38s32 16 32 38z" fill={RED} />
        <path d="M46 26v38M30 32c-4 10-4 22-4 32M62 32c4 10 4 22 4 32" stroke={RED_DARK} strokeWidth="2.4" fill="none" />
        <path d="M4 66c0-4 4-6 8-6h68c4 0 8 2 8 6s-4 8-10 8H14c-6 0-10-4-10-8z" fill={RED_DARK} />
        <path d="M38 36h16v14H38z" fill={FIRE_BRASS} />
        <path d="M22 50c2-10 6-16 12-20" stroke={RED_LIGHT} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "bucket-rack",
    width: 104,
    height: 150,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 104 150">
        <ellipse cx="52" cy="146" rx="44" ry="4" fill={FIRE_SHADOW} />
        <path d="M14 20v124M90 20v124" stroke={RED_DARK} strokeWidth="5" strokeLinecap="round" />
        <path d="M10 22h84" stroke={RED_DARK} strokeWidth="6" strokeLinecap="round" />
        <path d="M12 140h80" stroke={RED_DARK} strokeWidth="4" strokeLinecap="round" />
        {[30, 74].map((x) => (
          <g key={x}>
            <path d={`M${x} 22v8`} stroke={FIRE_BRASS} strokeWidth="2.4" />
            <path d={`M${x - 14} 44a14 14 0 0 1 28 0`} stroke={FIRE_BRASS} strokeWidth="2" fill="none" />
            <path d={`M${x - 15} 44h30l-4 34h-22z`} fill={RED} />
            <rect x={x - 16} y="40" width="32" height="6" rx="3" fill={RED_DARK} />
            <path d={`M${x - 10} 50l2 24`} stroke={RED_LIGHT} strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
          </g>
        ))}
        <rect x="18" y="92" width="68" height="34" rx="4" fill={CREAM} stroke={CREAM_EDGE} strokeWidth="1.4" />
        <text x="52" y="114" textAnchor="middle" fontSize="12" fontWeight="800" letterSpacing="1.4" fill={RED} fontFamily="inherit">
          FIRE
        </text>
      </svg>
    ),
    noFlip: true,
  },
  {
    id: "fire-bench",
    width: 140,
    height: 90,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 -28 140 90">
        <ellipse cx="70" cy="58" rx="62" ry="4" fill={FIRE_SHADOW} />
        <path d="M20 30l-4 26M120 30l4 26" stroke="#a47b4c" strokeWidth="5" strokeLinecap="round" />
        <rect x="8" y="22" width="124" height="10" rx="4" fill="#c9a06e" />
        <path d="M12 25h116" stroke="#e6c79c" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M24 32h92" stroke="#a47b4c" strokeWidth="2" />
        <rect x="18" y="8" width="38" height="14" rx="4" fill={RED} />
        <path d="M22 12h30" stroke={RED_LIGHT} strokeWidth="2" strokeLinecap="round" />
        <circle cx="96" cy="16" r="7" fill={CREAM} stroke={CREAM_EDGE} strokeWidth="1.2" />
        <path d="M96 16v-4M96 16h3" stroke={RED_DARK} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "fire-snake-plant",
    group: "plant",
    width: 80,
    height: 130,
    fits: ["RB", "LB", "B", "B2"],
    art: <SnakePlant pot="#b9b4aa" potDark="#9a958b" leaf="#9fb08a" leafDark="#7f9170" edge="#e6dfb4" />,
  },
  {
    id: "fire-red-plant",
    group: "plant",
    width: 88,
    height: 118,
    fits: ["RB", "LB", "B", "B2"],
    art: <Plant pot={RED} rim={RED_DARK} leaf="#a3b88e" leafDark="#7f9170" />,
  },
];

const PA_MINT = "#bcd8cf";
const PA_MINT_DARK = "#93b8ac";

const PA_MORE: Piece[] = [
  {
    id: "table-radio",
    width: 104,
    height: 132,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 104 132">
        <ellipse cx="52" cy="128" rx="42" ry="4" fill={PA_SHADOW} />
        <path d="M22 76l-6 50M82 76l6 50M30 76l-2 46M74 76l2 46" stroke={PA_WOOD_DARK} strokeWidth="3.4" strokeLinecap="round" />
        <ellipse cx="52" cy="76" rx="44" ry="7" fill={PA_WOOD_DARK} />
        <ellipse cx="52" cy="73" rx="44" ry="7" fill={PA_WOOD} />
        <path d="M18 34a34 22 0 0 1 68 0v34a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4z" fill={PA_MINT} />
        <path d="M86 34v34a4 4 0 0 1-4 4h-6a4 4 0 0 0 4-4V34c0-10-6-18-16-21 12 1 22 10 22 21z" fill={PA_MINT_DARK} />
        <rect x="26" y="34" width="34" height="28" rx="6" fill={PA_IVORY} />
        {[31, 37, 43, 49, 55].map((x) => (
          <path key={x} d={`M${x} 38v20`} stroke={PA_IVORY_EDGE} strokeWidth="1.6" strokeLinecap="round" />
        ))}
        <circle cx="72" cy="42" r="6" fill={PA_IVORY} stroke={PA_IVORY_EDGE} strokeWidth="1.2" />
        <path d="M72 42l3-3" stroke={PA_BRONZE_DARK} strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="72" cy="58" r="3.4" fill={PA_BRONZE} />
        <path d="M24 30c4-8 12-14 24-16" stroke="white" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: "portable-radio",
    width: 96,
    height: 84,
    fits: ["B", "B2", "RB", "LB"],
    art: (
      <svg viewBox="0 -20 96 84">
        <ellipse cx="48" cy="60" rx="40" ry="4" fill={PA_SHADOW} />
        <path d="M28 18c0-14 40-14 40 0" stroke={PA_BRONZE_DARK} strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <rect x="10" y="16" width="76" height="42" rx="8" fill="#e39a82" />
        <rect x="10" y="16" width="76" height="14" rx="7" fill={PA_IVORY} />
        <rect x="16" y="34" width="38" height="18" rx="4" fill="#d6c6a6" />
        {[20, 26, 32, 38, 44, 50].map((x) => (
          <path key={x} d={`M${x} 37v12`} stroke="#bba982" strokeWidth="1.6" strokeLinecap="round" />
        ))}
        <circle cx="70" cy="43" r="8" fill={PA_IVORY} stroke={PA_IVORY_EDGE} strokeWidth="1.2" />
        <path d="M70 43l4-4" stroke={PA_BRONZE_DARK} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M16 20h40" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      </svg>
    ),
  },
  {
    id: "station-clock",
    group: "clock",
    width: 84,
    height: 92,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 84 92">
        <rect x="9" y="11" width="70" height="78" rx="12" fill={PA_SHADOW} />
        <rect x="6" y="8" width="70" height="78" rx="12" fill={PA_WOOD} />
        <path d="M14 12h54" stroke="#e6c79c" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="41" cy="42" r="24" fill={PA_IVORY} stroke={PA_WOOD_DARK} strokeWidth="1.6" />
        {Array.from({ length: 12 }, (_, i) => (
          <circle key={i} cx="41" cy="22" r={i % 3 ? 1.2 : 2} fill={PA_TEAL} transform={`rotate(${i * 30} 41 42)`} />
        ))}
        <path d="M41 42V28M41 42l-9 5" stroke={PA_BRONZE_DARK} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="41" cy="42" r="2.4" fill={PA_BRONZE_DARK} />
        <circle cx="41" cy="76" r="4" fill={PA_BRONZE} />
      </svg>
    ),
  },
  {
    id: "quiet-sign",
    group: "sign",
    width: 112,
    height: 58,
    fits: ["T", "T2", "RT", "LT"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 112 58">
        <rect x="8" y="10" width="100" height="44" rx="10" fill={PA_SHADOW} />
        <rect x="4" y="6" width="100" height="44" rx="10" fill={PA_TEAL} />
        <rect x="9" y="11" width="90" height="34" rx="7" fill={PA_IVORY} />
        <text x="54" y="34" textAnchor="middle" fontSize="15" fontWeight="800" letterSpacing="2" fill={PA_TEAL} fontFamily="inherit">
          QUIET
        </text>
      </svg>
    ),
  },
  {
    id: "reel-deck",
    width: 112,
    height: 92,
    fits: ["B", "B2", "RB", "LB"],
    art: (
      <svg viewBox="0 -12 112 92">
        <ellipse cx="56" cy="76" rx="50" ry="4" fill={PA_SHADOW} />
        <rect x="8" y="10" width="96" height="62" rx="8" fill={PA_IVORY} stroke={PA_IVORY_EDGE} strokeWidth="1.4" />
        <rect x="8" y="56" width="96" height="16" rx="6" fill={PA_WOOD} />
        {[34, 78].map((x) => (
          <g key={x}>
            <circle cx={x} cy="30" r="16" fill="#3a3a36" />
            <circle cx={x} cy="30" r="10" fill="#55554f" />
            {[0, 120, 240].map((a) => (
              <circle key={a} cx={x} cy="23" r="2.6" fill={PA_IVORY_EDGE} transform={`rotate(${a} ${x} 30)`} />
            ))}
            <circle cx={x} cy="30" r="3" fill={PA_BRONZE} />
          </g>
        ))}
        <path d="M34 46h44" stroke="#55554f" strokeWidth="1.6" />
        {[30, 44, 58, 72, 86].map((x) => (
          <rect key={x} x={x - 4} y="60" width="8" height="7" rx="2" fill={PA_IVORY} />
        ))}
      </svg>
    ),
  },
  {
    id: "file-cabinet",
    width: 84,
    height: 156,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 84 156">
        <ellipse cx="42" cy="152" rx="36" ry="4" fill={PA_SHADOW} />
        <rect x="10" y="42" width="64" height="106" rx="5" fill={PA_MINT} />
        <path d="M74 48v94a6 6 0 0 1-6 6h-6a6 6 0 0 0 6-6V42a6 6 0 0 1 6 6z" fill={PA_MINT_DARK} />
        {[50, 84, 118].map((y) => (
          <g key={y}>
            <rect x="16" y={y} width="48" height="28" rx="3" fill="none" stroke={PA_MINT_DARK} strokeWidth="1.6" />
            <rect x="32" y={y + 8} width="16" height="5" rx="2.5" fill={PA_BRONZE} />
          </g>
        ))}
        <path d="M26 40c0-18 32-18 32 0" stroke="#3a3a36" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <rect x="20" y="30" width="10" height="14" rx="5" fill={PA_BRONZE} />
        <rect x="54" y="30" width="10" height="14" rx="5" fill={PA_BRONZE} />
      </svg>
    ),
  },
  {
    id: "bulletin-board",
    width: 112,
    height: 84,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 112 84">
        <rect x="8" y="10" width="100" height="70" rx="6" fill={PA_SHADOW} />
        <rect x="4" y="6" width="100" height="70" rx="6" fill={PA_WOOD} />
        <rect x="10" y="12" width="88" height="58" rx="3" fill="#d9b98a" />
        <rect x="16" y="18" width="26" height="32" rx="1.5" fill={PA_IVORY} transform="rotate(-4 29 34)" />
        {[26, 32, 38, 44].map((y) => (
          <path key={y} d={`M20 ${y}h17`} stroke={PA_IVORY_EDGE} strokeWidth="1.4" strokeLinecap="round" transform="rotate(-4 29 34)" />
        ))}
        <rect x="48" y="20" width="22" height="20" rx="1.5" fill="#bcd8cf" transform="rotate(5 59 30)" />
        <rect x="74" y="16" width="18" height="26" rx="1.5" fill="#f3e3a6" transform="rotate(-3 83 29)" />
        <rect x="52" y="46" width="34" height="18" rx="1.5" fill="#f0cdc4" transform="rotate(2 69 55)" />
        {[
          [29, 19],
          [59, 21],
          [83, 17],
          [69, 47],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill={PA_TEAL} />
        ))}
      </svg>
    ),
  },
  {
    id: "gold-record",
    width: 84,
    height: 96,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 84 96">
        <rect x="9" y="9" width="70" height="84" rx="4" fill={PA_SHADOW} />
        <rect x="5" y="5" width="70" height="84" rx="4" fill={PA_WOOD_DARK} />
        <rect x="11" y="11" width="58" height="72" rx="2" fill={PA_TEAL} />
        <circle cx="40" cy="40" r="22" fill="#e2b85e" />
        <circle cx="40" cy="40" r="16" fill="none" stroke="#c99a3f" strokeWidth="1.2" />
        <circle cx="40" cy="40" r="7" fill={PA_IVORY} />
        <circle cx="40" cy="40" r="1.6" fill={PA_BRONZE_DARK} />
        <path d="M26 30a16 16 0 0 1 8-8" stroke="#fbe3a6" strokeWidth="2" strokeLinecap="round" fill="none" />
        <rect x="22" y="68" width="36" height="8" rx="2" fill={PA_IVORY} />
      </svg>
    ),
  },
  {
    id: "desk-mic",
    width: 92,
    height: 92,
    fits: ["B", "B2", "RB", "LB"],
    art: (
      <svg viewBox="0 -20 92 92">
        <ellipse cx="46" cy="68" rx="38" ry="4" fill={PA_SHADOW} />
        <rect x="6" y="50" width="80" height="14" rx="4" fill={PA_WOOD} />
        <path d="M10 53h72" stroke="#e6c79c" strokeWidth="1.6" strokeLinecap="round" />
        <ellipse cx="34" cy="50" rx="14" ry="3.4" fill={PA_BRONZE_DARK} />
        <path d="M34 50V28" stroke={PA_BRONZE_DARK} strokeWidth="3" strokeLinecap="round" />
        <path d="M24 22v4a10 8 0 0 0 20 0v-4" fill="none" stroke={PA_BRONZE_DARK} strokeWidth="2.4" strokeLinecap="round" />
        <rect x="26" y="0" width="16" height="26" rx="8" fill={PA_BRONZE} />
        {[6, 11, 16, 21].map((y) => (
          <path key={y} d={`M28 ${y}h12`} stroke={PA_BRONZE_DARK} strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
        ))}
        <rect x="56" y="38" width="22" height="12" rx="2" fill={PA_IVORY} stroke={PA_IVORY_EDGE} strokeWidth="1" />
        <path d="M60 42h14M60 46h10" stroke={PA_IVORY_EDGE} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "pa-cactus",
    group: "plant",
    width: 76,
    height: 120,
    fits: ["RB", "LB", "B", "B2"],
    art: (
      <svg viewBox="0 0 76 120">
        <ellipse cx="38" cy="116" rx="24" ry="4" fill={PA_SHADOW} />
        <path d="M30 76V30a8 8 0 0 1 16 0v46z" fill="#8fae86" />
        <path d="M30 60H20a6 6 0 0 1-6-6V40a5 5 0 0 1 10 0v10h6zM46 50h8V36a5 5 0 0 1 10 0v14a6 6 0 0 1-6 6H46z" fill="#7f9f77" />
        <path d="M38 26v48" stroke="#6f8f68" strokeWidth="1.4" />
        <path d="M34 28v40" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
        <circle cx="38" cy="22" r="3.4" fill="#e8a08e" />
        <path d="M20 76h36l-4 34a6 6 0 0 1-6 5H30a6 6 0 0 1-6-5z" fill={PA_IVORY} />
        <rect x="16" y="72" width="44" height="8" rx="4" fill={PA_IVORY_EDGE} />
        <path d="M24 86h28" stroke={PA_TEAL} strokeWidth="2.4" />
      </svg>
    ),
  },
  {
    id: "pa-snake-plant",
    group: "plant",
    width: 80,
    height: 130,
    fits: ["RB", "LB", "B", "B2"],
    art: <SnakePlant pot={PA_IVORY} potDark={PA_IVORY_EDGE} leaf="#8fae86" leafDark="#6f8f68" edge="#e4dca0" />,
  },
];

const PIECES: Record<ThemeId, Piece[]> = {
  lights: [...LIGHTS, ...LIGHTS_MORE],
  alarm: [...PA_ROOM, ...PA_MORE],
  fire: [...FIRE, ...FIRE_MORE],
  plumbing: [...PLUMBING, ...PLUMBING_MORE],
};
const SLOTS: Slot[] = ["RB", "RT", "LB", "LT", "T", "T2", "B", "B2"];

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], next: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/** Early levels stay sparse; the room fills in and grows a little as the campaign goes on. */
export function surroundingDensity(level: number): { count: number; scale: number } {
  if (level >= 15) return { count: 7, scale: 1.18 };
  if (level >= 8) return { count: 6, scale: 1.12 };
  if (level >= 4) return { count: 5, scale: 1.06 };
  return { count: 4, scale: 1 };
}

export interface Placement {
  piece: Piece;
  slot: Slot;
  offset: number;
}

const kind = (piece: Piece) => piece.group ?? piece.id;

/**
 * Kinds the previous seed showed go to the back of the line, so neighbouring
 * levels of one theme rarely repeat an item. The chain restarts every
 * `THEME_BLOCK` seeds (aligned with campaign theme runs), so each level avoids
 * exactly what the level before it displayed.
 */
export function arrange(theme: ThemeId, seed: number, count: number): Placement[] {
  const start = seed - ((((seed - 1) % THEME_BLOCK) + THEME_BLOCK) % THEME_BLOCK);
  let shown: string[] = [];
  let placed: Placement[] = [];
  for (let s = start; s <= seed; s++) {
    placed = arrangeOnce(theme, s, count, shown);
    shown = placed.map(({ piece }) => kind(piece));
  }
  return placed;
}

function arrangeOnce(theme: ThemeId, seed: number, count: number, shown: readonly string[]): Placement[] {
  const next = random(seed * 2654435761);
  const used = new Set<Slot>();
  const placed: Placement[] = [];
  const order = shuffled(SLOTS, next);
  const kinds = new Map<string, Piece[]>();
  for (const piece of PIECES[theme]) kinds.set(kind(piece), [...(kinds.get(kind(piece)) ?? []), piece]);
  // One variant per kind, so items with several palettes are not drawn more often than the rest.
  const pieces = shuffled([...kinds.values()], next).map((variants) => variants[Math.floor(next() * variants.length)]!);
  const fresh = [...pieces.filter((piece) => !shown.includes(kind(piece))), ...pieces.filter((piece) => shown.includes(kind(piece)))];
  // Furniture that only stands in the lower corners goes first, so small props don't crowd out sofas, fridges and radios.
  const anchors = fresh.filter((piece) => !shown.includes(kind(piece)) && piece.fits.every((slot) => slot === "RB" || slot === "LB")).slice(0, 2);
  for (const piece of [...anchors, ...fresh.filter((piece) => !anchors.includes(piece))]) {
    if (placed.length >= count) break;
    const slot = order.find((candidate) => piece.fits.includes(candidate) && !used.has(candidate));
    if (!slot) continue;
    used.add(slot);
    placed.push({ piece, slot, offset: next() });
  }
  return placed;
}

export function Surroundings({ theme, seed, level }: { theme: ThemeId; seed: number; level: number }) {
  const { count, scale } = surroundingDensity(level);
  const placed = arrange(theme, seed, count);
  return (
    <div key={`${theme}-${seed}`} className="pc-surround" aria-hidden="true" style={{ "--k": scale } as CSSProperties}>
      {placed.map(({ piece, slot, offset }) => (
        <div
          key={piece.id}
          className="pc-sur-piece"
          data-slot={slot}
          data-flip={slot.startsWith("L") && !piece.noFlip}
          style={
            {
              "--w": piece.width,
              "--h": piece.height,
              "--o": offset.toFixed(3),
            } as CSSProperties
          }
        >
          {piece.art}
        </div>
      ))}
    </div>
  );
}
