import type { CSSProperties, ReactNode } from "react";
import { LEVEL_COUNT, themeOf } from "@/lib/path-connect/levels";
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
const TEAL: Upholstery = {
  name: "teal",
  main: "#7fa9a3",
  dark: "#5f8f89",
  light: "#b9d3cf",
  cushion: "#e3bd6c",
  cushionDark: "#c69f4e",
  cushionLight: "#f4dba3",
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
const MUSTARD_WOOD: Cabinet = { name: "mustard", main: "#e3bd6c", dark: "#c69f4e", light: "#f4dba3" };

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
const WALNUT_TEAL: TableLamp = {
  name: "teal",
  main: "#d9b38a",
  dark: "#b98a5e",
  shade: TEAL.main,
  shadeDark: TEAL.dark,
  shadeLight: TEAL.light,
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
  ...[BLUSH, POWDER, MUSTARD, TEAL, CORAL, SAGE_CHAIR].map((u): Piece => ({
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
  ...[CREAM_SAGE, WALNUT_CORAL, CREAM_MUSTARD, WALNUT_TEAL].map((c): Piece => ({
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
  ...[CORAL, SAGE_CHAIR, POWDER, MUSTARD, TEAL, BLUSH].map((u): Piece => ({
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
  ...[SAGE_WOOD, WALNUT, POWDER_WOOD, MUSTARD_WOOD].map((c): Piece => ({
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
    group: "extinguisher",
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
    group: "pail",
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
function ClawfootTub({ k }: { k: Kitchen }) {
  return (
    <svg viewBox="0 0 150 104">
      <ellipse cx="75" cy="100" rx="66" ry="4" fill={PLUMB_SHADOW} />
      <path d="M120 40V16a8 8 0 0 1 16 0v4" stroke={CHROME_EDGE} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M12 42h126c0 30-14 46-40 46H52C26 88 12 72 12 42z" fill={k.body} />
      <path d="M138 42c0 30-14 46-40 46h-12c26 0 40-16 42-46z" fill={k.side} />
      <rect x="8" y="36" width="134" height="10" rx="5" fill={STONE} />
      <path d="M20 54c2 12 10 22 22 26" stroke="white" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.6" />
      {[34, 116].map((x) => (
        <path key={x} d={`M${x - 6} 86h12l-2 10h-8z`} fill={COPPER} />
      ))}
    </svg>
  );
}

function Toilet({ k }: { k: Kitchen }) {
  return (
    <svg viewBox="0 0 84 132">
      <ellipse cx="42" cy="128" rx="30" ry="4" fill={PLUMB_SHADOW} />
      <rect x="14" y="10" width="56" height="44" rx="6" fill={k.body} />
      <path d="M70 16v32a6 6 0 0 1-6 6h-6a6 6 0 0 0 6-6V10a6 6 0 0 1 6 6z" fill={k.side} />
      <rect x="10" y="6" width="64" height="8" rx="4" fill={k.side} />
      <rect x="18" y="22" width="12" height="4" rx="2" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="0.8" />
      <path d="M30 54h24v20H30z" fill={k.side} />
      <path d="M8 74h68c0 16-12 26-24 28l2 22H30l2-22C20 100 8 90 8 74z" fill={k.body} />
      <ellipse cx="42" cy="74" rx="34" ry="6" fill={STONE} />
      <path d="M16 82c4 8 10 13 18 16" stroke="white" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  );
}

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
  ...[KITCHEN_BUTTER, KITCHEN_BLUSH, KITCHEN_POWDER].map((k): Piece => ({
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
  ...[KITCHEN_BLUSH, KITCHEN_MINT, KITCHEN_POWDER].map((k): Piece => ({
    id: `tub-${k.name}`,
    group: "tub",
    width: 150,
    height: 104,
    fits: ["RB", "LB"],
    art: <ClawfootTub k={k} />,
  })),
  ...[KITCHEN_MINT, KITCHEN_BUTTER, KITCHEN_BLUSH].map((k): Piece => ({
    id: `toilet-${k.name}`,
    group: "toilet",
    width: 84,
    height: 132,
    fits: ["RB", "LB"],
    art: <Toilet k={k} />,
  })),
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

const round1 = (n: number) => Math.round(n * 10) / 10;

/** A tapered leaf from base to tip that bows through the control point. */
function frond(bx: number, by: number, cx: number, cy: number, tx: number, ty: number, w: number): string {
  const len = Math.hypot(tx - bx, ty - by) || 1;
  const nx = (-(ty - by) / len) * w;
  const ny = ((tx - bx) / len) * w;
  return `M${bx} ${by}Q${round1(cx + nx)} ${round1(cy + ny)} ${tx} ${ty}Q${round1(cx - nx)} ${round1(cy - ny)} ${bx} ${by}z`;
}

const FERN_FRONDS: readonly (readonly [number, number, number, number, boolean])[] = [
  [20, 40, 4, 78, false],
  [90, 40, 106, 78, false],
  [24, 12, 8, 36, true],
  [86, 12, 102, 36, true],
  [40, 0, 26, 10, false],
  [70, 0, 84, 10, false],
  [52, 26, 56, 2, true],
];

function Fern({ pot, potDark, frond: color, frondDark, shadow }: { pot: string; potDark: string; frond: string; frondDark: string; shadow: string }) {
  return (
    <svg viewBox="0 0 110 112">
      <ellipse cx="55" cy="108" rx="32" ry="4" fill={shadow} />
      {FERN_FRONDS.map(([cx, cy, tx, ty, front]) => (
        <g key={`${tx}-${ty}`}>
          <path d={frond(55, 62, cx, cy, tx, ty, front ? 7 : 9)} fill={front ? color : frondDark} />
          <path d={`M55 62Q${cx} ${cy} ${tx} ${ty}`} stroke={front ? frondDark : color} strokeWidth="1.2" fill="none" opacity="0.7" />
        </g>
      ))}
      <path d="M40 100l-4 8M70 100l4 8" stroke={LR_LEG} strokeWidth="3" strokeLinecap="round" />
      <path d="M32 62h46l-5 34a7 7 0 0 1-7 6H44a7 7 0 0 1-7-6z" fill={pot} />
      <rect x="28" y="58" width="54" height="8" rx="4" fill={potDark} />
      <path d="M38 70l3 26" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

const RUBBER_LEAVES: readonly (readonly [number, number, number, boolean])[] = [
  [30, 32, -40, true],
  [55, 36, 40, false],
  [27, 58, -58, false],
  [58, 60, 52, true],
  [33, 80, -64, true],
  [53, 82, 62, false],
  [42, 16, 0, false],
];

function RubberPlant({ pot, potDark, leaf, leafDark, shadow }: { pot: string; potDark: string; leaf: string; leafDark: string; shadow: string }) {
  return (
    <svg viewBox="0 0 84 150">
      <ellipse cx="42" cy="146" rx="26" ry="4" fill={shadow} />
      <path d="M30 132l-4 12M54 132l4 12" stroke={LR_LEG} strokeWidth="3" strokeLinecap="round" />
      <path d="M42 98V22" stroke={leafDark} strokeWidth="2.4" strokeLinecap="round" />
      {RUBBER_LEAVES.map(([cx, cy, rot, dark]) => (
        <g key={`${cx}-${cy}`} transform={`rotate(${rot} ${cx} ${cy})`}>
          <ellipse cx={cx} cy={cy} rx="8.5" ry="16" fill={dark ? leafDark : leaf} />
          <path d={`M${cx} ${cy - 12}v24`} stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />
        </g>
      ))}
      <path d="M22 98h40l-5 34H27z" fill={pot} />
      <rect x="20" y="94" width="44" height="8" rx="4" fill={potDark} />
      <path d="M28 106l3 22" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

const VINE_LEAVES: readonly (readonly [number, number, number])[] = [
  [22, 86, -30],
  [20, 100, 20],
  [24, 113, -20],
  [30, 124, 10],
  [69, 85, 30],
  [70, 99, -20],
  [64, 111, 20],
];

/** A trailing plant in a macramé hanger, for the wall slots. */
function HangingPlant({ pot, potDark, leaf, leafDark }: { pot: string; potDark: string; leaf: string; leafDark: string }) {
  return (
    <svg viewBox="0 0 90 132">
      <circle cx="45" cy="5" r="3.4" fill="none" stroke={LR_BRASS} strokeWidth="2" />
      <path d="M45 9 26 72M45 9l19 63M45 9v60M35 42l10 8 10-8" stroke="#c9b48e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="45" cy="11" r="3" fill="#c9b48e" />
      {[
        [34, 62, -40],
        [56, 62, 40],
        [45, 58, 0],
      ].map(([cx, cy, rot]) => (
        <ellipse key={cx} cx={cx} cy={cy} rx="6" ry="10" fill={rot === 0 ? leaf : leafDark} transform={`rotate(${rot} ${cx} ${cy})`} />
      ))}
      <path d="M26 72h38l-4 20a6 6 0 0 1-6 5H36a6 6 0 0 1-6-5z" fill={pot} />
      <rect x="24" y="68" width="42" height="7" rx="3.5" fill={potDark} />
      <path d="M32 78l2 14" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <path d="M28 72C18 86 20 104 30 124M62 72c10 12 8 28 2 40" stroke={leafDark} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {VINE_LEAVES.map(([cx, cy, rot], i) => (
        <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx="4.5" ry="7" fill={i % 2 ? leafDark : leaf} transform={`rotate(${rot} ${cx} ${cy})`} />
      ))}
    </svg>
  );
}

function ShellChair({ u }: { u: Upholstery }) {
  return (
    <svg viewBox="0 0 100 124">
      <ellipse cx="50" cy="120" rx="34" ry="4" fill={SHADOW} />
      <g stroke="#6b5646" strokeWidth="2.2" strokeLinecap="round" fill="none">
        <path d="M34 80 20 116M66 80l14 36M42 82l-6 34M58 82l6 34" />
        <path d="M27 99 50 88l23 11M27 99h46" />
      </g>
      {[20, 36, 64, 80].map((x) => (
        <circle key={x} cx={x} cy="116.5" r="2" fill="#6b5646" />
      ))}
      <path d="M10 30C10 16 28 8 50 8s40 8 40 22c0 18-6 34-14 44-6 8-16 10-26 10s-20-2-26-10C16 64 10 48 10 30z" fill={u.main} />
      <path d="M22 34c0-10 12-15 28-15s28 5 28 15c0 12-4 24-10 30H32c-6-6-10-18-10-30z" fill={u.dark} opacity="0.3" />
      <ellipse cx="50" cy="66" rx="26" ry="8" fill={u.dark} opacity="0.4" />
      <ellipse cx="50" cy="64" rx="20" ry="5.5" fill={LR_CREAM} />
      <path d="M34 62.5c10-2 22-2 32 0" stroke="white" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.8" />
      <path d="M16 26c3-8 10-13 20-15" stroke={u.light} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M86 34c-2 16-8 30-16 40" stroke={u.dark} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  );
}

/** One cone shade of an atomic floor lamp; the cone opens away from its stem by `a` degrees. */
function Cone({ x, y, a, u }: { x: number; y: number; a: number; u: Upholstery }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <path d="M-5 4h10l9-26h-28z" fill={u.main} />
      <path d="M5 4l9-26H8L2 4z" fill={u.dark} opacity="0.5" />
      <path d="M-9-18-4 1" stroke={u.light} strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="0" cy="-22" rx="14" ry="3" fill="#fff1c2" />
      <rect x="-5" y="2" width="10" height="4" rx="2" fill={LR_BRASS} />
    </g>
  );
}

const ATOMIC_CONES = [
  { x: 26, y: 66, a: -35, u: TEAL },
  { x: 76, y: 46, a: 30, u: MUSTARD },
  { x: 82, y: 108, a: 62, u: CORAL },
] as const;

const TRANSISTOR_TONES = [
  { name: "mint", main: PA_MINT, dark: PA_MINT_DARK },
  { name: "coral", main: "#e39a82", dark: "#c97f68" },
  { name: "mustard", main: "#e3bd6c", dark: "#c69f4e" },
] as const;

/** More 1950s living room: shell chairs, an atomic lamp, a TV console and a few wall pieces. */
const LIGHTS_DEN: Piece[] = [
  ...[CORAL, TEAL, MUSTARD].map((u): Piece => ({
    id: `shell-chair-${u.name}`,
    group: "shell-chair",
    width: 100,
    height: 124,
    fits: ["RB", "LB"],
    art: <ShellChair u={u} />,
  })),
  {
    id: "atomic-lamp",
    width: 100,
    height: 220,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 100 220" overflow="visible">
        <GlowDefs id="pc-sur-atomic" />
        <ellipse cx="50" cy="216" rx="24" ry="4" fill={SHADOW} />
        {ATOMIC_CONES.map(({ x, y, a }) => {
          const rad = (a * Math.PI) / 180;
          return <circle key={a} cx={round1(x + Math.sin(rad) * 24)} cy={round1(y - Math.cos(rad) * 24)} r="26" fill="url(#pc-sur-atomic)" />;
        })}
        <path d="M50 210V60M50 102 26 70M50 84 76 50M50 126l32-16" stroke={LR_BRASS} strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="50" cy="57" r="4" fill={LR_BRASS} />
        {ATOMIC_CONES.map((cone) => (
          <Cone key={cone.a} {...cone} />
        ))}
        <ellipse cx="50" cy="210" rx="18" ry="5" fill={LR_BRONZE_DARK} />
        <ellipse cx="50" cy="208" rx="14" ry="3.4" fill={LR_BRONZE} />
      </svg>
    ),
  },
  {
    id: "side-table",
    width: 84,
    height: 132,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 84 132">
        <ellipse cx="42" cy="128" rx="30" ry="4" fill={SHADOW} />
        <path d="M20 74l-6 52M64 74l6 52M42 78v48" stroke={LR_LEG} strokeWidth="3.6" strokeLinecap="round" />
        <ellipse cx="42" cy="104" rx="26" ry="5" fill={WALNUT.dark} />
        <rect x="26" y="94" width="28" height="7" rx="1.5" fill={POWDER.main} />
        <rect x="29" y="88" width="23" height="6" rx="1.5" fill={LR_PINK_LIGHT} />
        <path d="M31 97.5h20" stroke="white" strokeWidth="1" opacity="0.7" />
        <ellipse cx="42" cy="74" rx="36" ry="8" fill={WALNUT.dark} />
        <ellipse cx="42" cy="71" rx="36" ry="8" fill={WALNUT.main} />
        <path d="M14 69c8-4 20-5 30-5" stroke={WALNUT.light} strokeWidth="2" strokeLinecap="round" fill="none" />
        {[
          [36, 40, -30],
          [48, 38, 30],
          [42, 32, 0],
        ].map(([cx, cy, rot]) => (
          <ellipse key={cx} cx={cx} cy={cy} rx="5.5" ry="10" fill={rot === 0 ? "#93b47e" : "#729760"} transform={`rotate(${rot} ${cx} ${cy})`} />
        ))}
        <path d="M32 48h20l-3 20H35z" fill={LR_CREAM} />
        <rect x="30" y="45" width="24" height="6" rx="3" fill={LR_CREAM_SHADE} />
        <path d="M53 48c14 4 18 16 16 34" stroke="#729760" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        {[
          [60, 52, 40],
          [67, 62, -20],
          [69, 74, 20],
          [68, 84, -10],
        ].map(([cx, cy, rot], i) => (
          <ellipse key={cy} cx={cx} cy={cy} rx="3.6" ry="5.6" fill={i % 2 ? "#729760" : "#93b47e"} transform={`rotate(${rot} ${cx} ${cy})`} />
        ))}
      </svg>
    ),
  },
  {
    id: "tv-console",
    width: 120,
    height: 160,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 120 160">
        <ellipse cx="60" cy="156" rx="50" ry="4" fill={SHADOW} />
        <TaperedLegs left={16} right={104} top={132} length={22} />
        <rect x="8" y="96" width="104" height="38" rx="5" fill={WALNUT.main} />
        <path d="M14 99h92" stroke={WALNUT.light} strokeWidth="2" strokeLinecap="round" />
        <path d="M60 102v28" stroke={WALNUT.dark} strokeWidth="1.6" />
        <circle cx="54" cy="116" r="2.2" fill={LR_BRASS} />
        <circle cx="66" cy="116" r="2.2" fill={LR_BRASS} />
        <path d="M54 30 38 6M66 30 82 8" stroke={LR_BRONZE_DARK} strokeWidth="2" strokeLinecap="round" />
        <circle cx="38" cy="6" r="2.4" fill={LR_BRASS} />
        <circle cx="82" cy="8" r="2.4" fill={LR_BRASS} />
        <path d="M50 30a10 7 0 0 1 20 0z" fill={LR_BRONZE} />
        <rect x="18" y="30" width="84" height="64" rx="12" fill={LR_CREAM} />
        <path d="M102 42v40a12 12 0 0 1-12 12h-6a12 12 0 0 0 12-12V30a12 12 0 0 1 6 12z" fill={LR_CREAM_SHADE} />
        <rect x="25" y="37" width="54" height="50" rx="11" fill="#9fb5ad" />
        <rect x="29" y="41" width="46" height="42" rx="9" fill="#b7cbc3" />
        <path d="M34 48c4-3 10-4 16-4M34 56l8-8" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
        {[44, 49, 54, 59].map((y) => (
          <path key={y} d={`M86 ${y}h10`} stroke={LR_CREAM_SHADE} strokeWidth="2" strokeLinecap="round" />
        ))}
        <circle cx="91" cy="70" r="3.6" fill={LR_BRASS} />
        <circle cx="91" cy="80" r="3.6" fill={TEAL.main} />
      </svg>
    ),
  },
  {
    id: "boomerang-table",
    width: 150,
    height: 84,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 -24 150 84">
        <ellipse cx="75" cy="56" rx="62" ry="4" fill={SHADOW} />
        <path d="M26 30l-6 24M124 28l6 26M78 34v20" stroke={LR_LEG} strokeWidth="4" strokeLinecap="round" />
        <path d="M8 24c0-10 16-14 34-10 14 3 24 3 38-2 20-7 62-6 62 8s-28 18-48 15c-14-2-24 0-38 4C30 45 8 38 8 24z" fill={WALNUT.dark} />
        <path d="M8 20c0-10 16-14 34-10 14 3 24 3 38-2 20-7 62-6 62 8s-28 18-48 15c-14-2-24 0-38 4C30 41 8 34 8 20z" fill={WALNUT.main} />
        <path d="M16 16c6-4 16-5 26-3M90 8c10-3 22-4 34-2" stroke={WALNUT.light} strokeWidth="2" strokeLinecap="round" fill="none" />
        <ellipse cx="42" cy="22" rx="10" ry="3.4" fill={CORAL.main} />
        <ellipse cx="42" cy="21.4" rx="6" ry="1.8" fill={CORAL.dark} />
        <circle cx="99" cy="11" r="4.4" fill={CORAL.main} />
        <circle cx="106" cy="9" r="4.4" fill={MUSTARD.main} />
        <circle cx="113" cy="11" r="4.4" fill={LR_SAGE} />
        <path d="M92 12h28a14 7 0 0 1-28 0z" fill={TEAL.main} />
        <path d="M96 14c4 3 10 4 16 3" stroke={TEAL.light} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "magazine-rack",
    width: 96,
    height: 80,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 -24 96 80">
        <ellipse cx="48" cy="52" rx="36" ry="4" fill={SHADOW} />
        <rect x="22" y="2" width="26" height="34" rx="2" fill={CORAL.main} transform="rotate(-10 35 19)" />
        <rect x="40" y="0" width="26" height="36" rx="2" fill={TEAL.main} transform="rotate(4 53 18)" />
        <rect x="54" y="4" width="24" height="32" rx="2" fill={MUSTARD.main} transform="rotate(12 66 20)" />
        <path d="M27 8h16M45 6h16M58 10h14" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
        <path d="M14 22h68l-6 22H20z" fill={LR_CREAM} opacity="0.35" />
        <path d="M14 22h68l-6 22H20zM30 22l2 22M48 22v22M66 22l-2 22" stroke={LR_BRASS} strokeWidth="2.2" strokeLinejoin="round" fill="none" />
        <path d="M22 44l-4 8M74 44l4 8" stroke={LR_BRASS} strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "oval-mirror",
    width: 84,
    height: 112,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 84 112">
        <path d="M42 4 27 18M42 4l15 14" stroke={LR_BRONZE_DARK} strokeWidth="1.4" />
        <circle cx="42" cy="4" r="2.4" fill={LR_BRASS} />
        <ellipse cx="45" cy="57" rx="30" ry="40" fill={SHADOW} />
        <ellipse cx="42" cy="54" rx="30" ry="40" fill={LR_BRASS} />
        <ellipse cx="42" cy="54" rx="25" ry="35" fill="#dfe9e8" />
        <path d="M28 36l18 26M30 52l10 14" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        <path d="M16 42a30 40 0 0 1 14-24" stroke={LR_BRASS_LIGHT} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "hanging-plant",
    width: 90,
    height: 132,
    fits: ["T", "T2", "RT", "LT"],
    art: <HangingPlant pot={LR_CREAM} potDark={LR_CREAM_SHADE} leaf="#93b47e" leafDark="#729760" />,
  },
  {
    id: "rubber-plant",
    group: "plant",
    width: 84,
    height: 150,
    fits: ["RB", "LB"],
    art: <RubberPlant pot={CORAL.main} potDark={CORAL.dark} leaf="#93b47e" leafDark="#729760" shadow={SHADOW} />,
  },
  {
    id: "fern",
    group: "plant",
    width: 110,
    height: 112,
    fits: ["RB", "LB", "B", "B2"],
    art: <Fern pot={MUSTARD.main} potDark={MUSTARD.dark} frond="#93b47e" frondDark="#729760" shadow={SHADOW} />,
  },
];

function PedestalSink({ k }: { k: Kitchen }) {
  return (
    <svg viewBox="0 0 90 160">
      <ellipse cx="45" cy="156" rx="26" ry="4" fill={PLUMB_SHADOW} />
      <circle cx="45" cy="24" r="20" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="2" />
      <circle cx="45" cy="24" r="15" fill="#e3eced" />
      <path d="M36 18l10 12M40 14l6 7" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
      <rect x="14" y="50" width="62" height="20" rx="4" fill={STONE} stroke={STONE_SHADE} strokeWidth="1.4" />
      <path d="M45 66v-8h9v4" stroke={CHROME_EDGE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="33" cy="63" r="3" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="1" />
      <circle cx="61" cy="63" r="3" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="1" />
      <path d="M36 92h18l5 58H31z" fill={k.body} />
      <path d="M54 92l5 58h-6l-4-58z" fill={k.side} />
      <ellipse cx="45" cy="150" rx="17" ry="4" fill={k.side} />
      <path d="M8 72h74c0 14-14 22-37 22S8 86 8 72z" fill={k.body} />
      <path d="M82 72c0 14-14 22-37 22 18-2 30-10 30-22z" fill={k.side} />
      <rect x="4" y="66" width="82" height="9" rx="4.5" fill={STONE} />
      <path d="M16 78c4 6 10 9 18 11" stroke="white" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  );
}

function UpperCabinets({ k }: { k: Kitchen }) {
  return (
    <svg viewBox="0 0 128 100">
      <rect x="8" y="10" width="118" height="70" rx="6" fill={PLUMB_SHADOW} />
      <rect x="4" y="6" width="118" height="70" rx="6" fill={k.body} />
      <rect x="4" y="6" width="118" height="8" rx="4" fill={k.side} />
      <rect x="11" y="19" width="50" height="50" rx="4" fill="none" stroke={k.line} strokeWidth="1.6" />
      <rect x="65" y="19" width="50" height="50" rx="4" fill="none" stroke={k.line} strokeWidth="1.6" />
      <rect x="54" y="38" width="3" height="12" rx="1.5" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="0.8" />
      <rect x="69" y="38" width="3" height="12" rx="1.5" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="0.8" />
      <path d="M16 24v38" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity="0.5" />
      <rect x="0" y="76" width="126" height="6" rx="3" fill={WOOD} />
      {[
        [30, KITCHEN_BLUSH.body],
        [63, KITCHEN_BUTTER.body],
        [96, KITCHEN_POWDER.body],
      ].map(([x, fill]) => (
        <g key={x} transform={`translate(${x} 84)`}>
          <path d="M0-2v3" stroke={CHROME_EDGE} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M-6 1h12l-1.6 10h-8.8z" fill={fill as string} />
          <path d="M6 3c4 0 4 6 0 6" stroke={fill as string} strokeWidth="2" fill="none" />
        </g>
      ))}
    </svg>
  );
}

function Mixer({ k }: { k: Kitchen }) {
  return (
    <svg viewBox="0 -24 90 90">
      <ellipse cx="45" cy="62" rx="34" ry="4" fill={PLUMB_SHADOW} />
      <rect x="56" y="12" width="12" height="44" rx="5" fill={k.body} />
      <path d="M68 18v34a5 5 0 0 1-5 5" stroke={k.side} strokeWidth="3" fill="none" />
      <path d="M39 20v14" stroke={CHROME_EDGE} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M22 32h34l-4 18a4 4 0 0 1-4 3H30a4 4 0 0 1-4-3z" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="1.2" />
      <path d="M28 36l2 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <rect x="14" y="2" width="58" height="18" rx="9" fill={k.body} />
      <path d="M18 16c14 3 34 3 50 0" stroke={k.side} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <rect x="24" y="7" width="12" height="4" rx="2" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="0.8" />
      <rect x="16" y="52" width="58" height="8" rx="4" fill={k.side} />
    </svg>
  );
}

/** Kitchen and bath odds and ends: sinks, upper cabinets, a dinette and small counter appliances. */
const PLUMBING_KITCHEN_BATH: Piece[] = [
  ...[KITCHEN_BLUSH, KITCHEN_MINT, KITCHEN_BUTTER].map((k): Piece => ({
    id: `sink-${k.name}`,
    group: "sink",
    width: 90,
    height: 160,
    fits: ["RB", "LB"],
    art: <PedestalSink k={k} />,
  })),
  ...[KITCHEN_MINT, KITCHEN_BUTTER].map((k): Piece => ({
    id: `upper-cabinets-${k.name}`,
    group: "upper-cabinets",
    width: 128,
    height: 100,
    fits: ["T", "T2", "RT", "LT"],
    art: <UpperCabinets k={k} />,
  })),
  ...[KITCHEN_MINT, KITCHEN_BLUSH].map((k): Piece => ({
    id: `mixer-${k.name}`,
    group: "mixer",
    width: 90,
    height: 90,
    fits: ["B", "B2"],
    art: <Mixer k={k} />,
  })),
  {
    id: "dinette",
    width: 150,
    height: 140,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 150 140">
        <ellipse cx="75" cy="136" rx="64" ry="4" fill={PLUMB_SHADOW} />
        <path d="M98 80l-4 52M132 80l4 52" stroke={CHROME_EDGE} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M102 50v22M130 50v22" stroke={CHROME_EDGE} strokeWidth="3" strokeLinecap="round" />
        <rect x="98" y="24" width="36" height="28" rx="9" fill="#e39a82" />
        <path d="M104 30h24" stroke="#f4c2b2" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="92" y="70" width="46" height="11" rx="5.5" fill="#e39a82" />
        <path d="M96 73h36" stroke="#f4c2b2" strokeWidth="2" strokeLinecap="round" />
        <path d="M54 78h8l3 50H51z" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="1.2" />
        <ellipse cx="58" cy="129" rx="22" ry="4.4" fill={CHROME_EDGE} />
        <ellipse cx="58" cy="71" rx="52" ry="10" fill={CHROME_EDGE} />
        <ellipse cx="58" cy="68" rx="52" ry="10" fill={KITCHEN_MINT.body} />
        <Speckles dots={[[26, 66], [40, 72], [52, 64], [66, 70], [80, 66], [90, 70], [34, 62]]} />
        <path d="M14 66c10-5 24-7 40-7" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
        <rect x="32" y="46" width="12" height="12" rx="1" fill="white" />
        <path d="M28 66V52h3v10h14V52h3v14z" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="1" />
        {[68, 77].map((x, i) => (
          <g key={x}>
            <rect x={x} y="54" width="6" height="10" rx="3" fill="white" stroke={CHROME_EDGE} strokeWidth="0.8" />
            <rect x={x} y="51" width="6" height="4" rx="2" fill={i ? COPPER : CHROME_EDGE} />
          </g>
        ))}
      </svg>
    ),
  },
  {
    id: "towel-hooks",
    width: 110,
    height: 104,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 110 104">
        <rect x="9" y="11" width="98" height="10" rx="4" fill={PLUMB_SHADOW} />
        <rect x="6" y="8" width="98" height="10" rx="4" fill={WOOD} />
        <path d="M10 10.5h90" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
        <path d="M16 16h26v62a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3z" fill={KITCHEN_BLUSH.body} />
        <path d="M38 16v62a3 3 0 0 1-3 3h4a3 3 0 0 0 3-3V16z" fill={KITCHEN_BLUSH.side} />
        <path d="M16 64h26M16 70h26" stroke="white" strokeWidth="2.4" opacity="0.8" />
        <path d="M45 16h22v42a3 3 0 0 1-3 3H48a3 3 0 0 1-3-3z" fill={KITCHEN_MINT.body} />
        <path d="M45 48h22" stroke={KITCHEN_MINT.line} strokeWidth="2.4" />
        <path d="M84 16v32" stroke={WOOD_SHADE} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="84" cy="60" rx="9" ry="13" fill={WOOD} />
        <ellipse cx="84" cy="60" rx="6" ry="9.5" fill={STONE} />
        {[54, 58, 62, 66].map((y) => (
          <path key={y} d={`M80 ${y}h8`} stroke={STONE_SHADE} strokeWidth="1.4" strokeLinecap="round" />
        ))}
        {[28, 56, 84].map((x) => (
          <circle key={x} cx={x} cy="13" r="3.4" fill={WOOD_SHADE} />
        ))}
      </svg>
    ),
  },
  {
    id: "spice-rack",
    width: 112,
    height: 96,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 112 96">
        <rect x="10" y="10" width="100" height="72" rx="4" fill={PLUMB_SHADOW} />
        <rect x="6" y="10" width="8" height="70" rx="3" fill={WOOD} />
        <rect x="98" y="10" width="8" height="70" rx="3" fill={WOOD} />
        <rect x="4" y="6" width="104" height="8" rx="4" fill={WOOD} />
        {[44, 76].map((shelf, row) => (
          <g key={shelf}>
            {[0, 1, 2, 3, 4].map((i) => {
              const x = 18 + i * 16;
              const spice = [COPPER, "#e3bd6c", SAGE, "#8a7a68", KITCHEN_BLUSH.line][(i + row * 2) % 5]!;
              return (
                <g key={i}>
                  <rect x={x} y={shelf - 20} width="12" height="20" rx="3" fill="#f6f1e6" stroke={CHROME_EDGE} strokeWidth="0.8" />
                  <rect x={x + 1.5} y={shelf - 11} width="9" height="9" rx="2" fill={spice} />
                  <rect x={x} y={shelf - 24} width="12" height="5" rx="2" fill={row ? KITCHEN_MINT.side : CHROME} stroke={CHROME_EDGE} strokeWidth="0.6" />
                </g>
              );
            })}
            <rect x="6" y={shelf} width="100" height="6" rx="2" fill={WOOD_SHADE} />
          </g>
        ))}
      </svg>
    ),
  },
  {
    id: "toaster",
    width: 96,
    height: 78,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 -24 96 78">
        <ellipse cx="48" cy="50" rx="38" ry="4" fill={PLUMB_SHADOW} />
        <rect x="28" y="-4" width="16" height="20" rx="5" fill="#e6c08a" stroke="#c99a5c" strokeWidth="1.2" />
        <rect x="52" y="0" width="16" height="16" rx="5" fill="#e6c08a" stroke="#c99a5c" strokeWidth="1.2" />
        <path d="M14 14c0-6 4-10 10-10h48c6 0 10 4 10 10v28H14z" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="1.4" />
        <rect x="26" y="7" width="20" height="4" rx="2" fill={CHROME_EDGE} />
        <rect x="50" y="7" width="20" height="4" rx="2" fill={CHROME_EDGE} />
        <path d="M24 22h48M24 28h48" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <path d="M19 14v24" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="80" y="20" width="9" height="5" rx="2.5" fill="#6b5646" />
        <rect x="10" y="40" width="76" height="8" rx="4" fill="#6b5646" />
      </svg>
    ),
  },
  {
    id: "dish-drainer",
    width: 124,
    height: 76,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 -24 124 76">
        <ellipse cx="62" cy="48" rx="52" ry="4" fill={PLUMB_SHADOW} />
        {[
          [40, 14, 16, KITCHEN_BLUSH],
          [58, 10, 18, KITCHEN_POWDER],
          [76, 14, 16, KITCHEN_BUTTER],
        ].map(([cx, cy, r, k]) => {
          const tone = k as Kitchen;
          return (
            <g key={cx as number}>
              <circle cx={cx as number} cy={cy as number} r={r as number} fill={tone.body} stroke={tone.line} strokeWidth="1.2" />
              <circle cx={cx as number} cy={cy as number} r={(r as number) - 6} fill="none" stroke="white" strokeWidth="1.6" opacity="0.7" />
            </g>
          );
        })}
        <path d="M92 20h16l-2 16H94z" fill={KITCHEN_MINT.body} stroke={KITCHEN_MINT.line} strokeWidth="1" />
        <path d="M108 23c5 0 5 8 0 8" stroke={KITCHEN_MINT.line} strokeWidth="2" fill="none" />
        <path d="M14 26h96l-6 18H20z" fill="none" stroke={CHROME_EDGE} strokeWidth="2.2" strokeLinejoin="round" />
        {[26, 36, 46, 56, 66, 76, 86, 96].map((x) => (
          <path key={x} d={`M${x} 26v18`} stroke={CHROME_EDGE} strokeWidth="1.6" />
        ))}
        <rect x="8" y="42" width="108" height="6" rx="3" fill={KITCHEN_MINT.side} />
      </svg>
    ),
  },
  {
    id: "bread-box",
    width: 110,
    height: 80,
    fits: ["B", "B2"],
    noFlip: true,
    art: (
      <svg viewBox="0 -24 110 80">
        <ellipse cx="55" cy="52" rx="46" ry="4" fill={PLUMB_SHADOW} />
        <path d="M10 48V22C10 8 22 0 40 0h30c18 0 30 8 30 22v26z" fill={KITCHEN_BUTTER.body} />
        <path d="M100 22v26h-8V22c0-12-8-20-20-22 16 0 28 8 28 22z" fill={KITCHEN_BUTTER.side} />
        <path d="M16 22c0-11 10-17 26-17h26c16 0 26 6 26 17" stroke={KITCHEN_BUTTER.line} strokeWidth="1.6" fill="none" />
        <rect x="46" y="22" width="18" height="4" rx="2" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="0.8" />
        <text x="55" y="41" textAnchor="middle" fontSize="9" fontWeight="800" letterSpacing="2" fill={COPPER} fontFamily="inherit">
          BREAD
        </text>
        <path d="M18 10c4-4 10-6 16-6" stroke="white" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.7" />
        <rect x="6" y="46" width="98" height="6" rx="3" fill={KITCHEN_BUTTER.side} />
      </svg>
    ),
  },
  {
    id: "plumbing-rubber-plant",
    group: "plant",
    width: 84,
    height: 150,
    fits: ["RB", "LB"],
    art: <RubberPlant pot={STONE} potDark={STONE_SHADE} leaf={SAGE} leafDark={SAGE_DARK} shadow={PLUMB_SHADOW} />,
  },
  {
    id: "plumbing-fern",
    group: "plant",
    width: 110,
    height: 112,
    fits: ["RB", "LB", "B", "B2"],
    art: <Fern pot={COPPER} potDark="#a5633a" frond="#a3b88e" frondDark={SAGE_DARK} shadow={PLUMB_SHADOW} />,
  },
];

function SodaExtinguisher({ body, dark, light, band }: { body: string; dark: string; light: string; band: string }) {
  return (
    <svg viewBox="0 0 64 150">
      <ellipse cx="32" cy="146" rx="22" ry="4" fill={FIRE_SHADOW} />
      <path d="M40 22c14 2 16 20 14 48" stroke="#4a3b30" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M51 68h6l-1 13h-4z" fill="#4a3b30" />
      <path d="M14 44c0-10 8-16 18-16s18 6 18 16v90a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill={body} />
      <path d="M50 44v90a6 6 0 0 1-6 6h-6a6 6 0 0 0 6-6V44c0-8-4-13-10-15 9 1 16 7 16 15z" fill={dark} opacity="0.6" />
      <rect x="14" y="58" width="36" height="4" fill={band} />
      <rect x="14" y="122" width="36" height="4" fill={band} />
      <path d="M19 46v70" stroke={light} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <rect x="20" y="72" width="24" height="40" rx="2" fill={CREAM} />
      <path d="M25 80h14M25 86h10M25 92h12M25 98h14" stroke={CREAM_EDGE} strokeWidth="2" strokeLinecap="round" />
      <rect x="24" y="18" width="16" height="12" rx="3" fill={FIRE_BRASS} />
      <circle cx="32" cy="15" r="4" fill={FIRE_BRASS_LIGHT} />
      <path d="M24 24h-6v-6" stroke="#5b4a3c" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Pail({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-20 10C-20-8 20-8 20 10" stroke="#7d6a58" strokeWidth="2.2" fill="none" />
      <path d="M-22 10h44l-6 38a5 5 0 0 1-5 4h-22a5 5 0 0 1-5-4z" fill={RED} />
      <path d="M22 10l-6 38a5 5 0 0 1-5 4h-5a5 5 0 0 0 5-4l6-38z" fill={RED_DARK} opacity="0.6" />
      <path d="M-15 16l4 30" stroke={RED_LIGHT} strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
      <ellipse cx="0" cy="10" rx="22" ry="4" fill={RED_DARK} />
      <ellipse cx="0" cy="10" rx="18" ry="2.6" fill="#a9c4cf" />
      <text x="0" y="34" textAnchor="middle" fontSize="9" fontWeight="800" letterSpacing="1.2" fill={CREAM} fontFamily="inherit">
        FIRE
      </text>
    </g>
  );
}

function Boot({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0h22v40c0 4 2 6 8 8l8 3c4 1 4 9 0 9H-2c-2 0-2-2-2-4z" fill="#3f3a36" />
      <rect x="-3" y="-4" width="28" height="8" rx="3" fill="#57504a" />
      <rect x="-1" y="24" width="23" height="4" fill="#e3bd6c" />
      <path d="M4 6v14" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.25" />
    </g>
  );
}

/** More of the firehouse: other extinguishers, pails, bells, a street call box and drill posters. */
const FIRE_STATION: Piece[] = [
  {
    id: "extinguisher-brass",
    group: "extinguisher",
    width: 64,
    height: 150,
    fits: ["RB", "LB"],
    art: <SodaExtinguisher body={FIRE_BRASS} dark="#9c6f28" light={FIRE_BRASS_LIGHT} band="#9c6f28" />,
  },
  {
    id: "extinguisher-banded",
    group: "extinguisher",
    width: 64,
    height: 150,
    fits: ["RB", "LB"],
    art: <SodaExtinguisher body={RED} dark={RED_DARK} light={RED_LIGHT} band="#e9e6df" />,
  },
  {
    id: "water-pails",
    group: "pail",
    width: 120,
    height: 84,
    fits: ["B", "B2"],
    noFlip: true,
    art: (
      <svg viewBox="0 -24 120 84">
        <ellipse cx="60" cy="56" rx="50" ry="4" fill={FIRE_SHADOW} />
        <Pail x={40} y={0} />
        <Pail x={80} y={4} />
      </svg>
    ),
  },
  {
    id: "fire-bell",
    width: 90,
    height: 96,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 90 96">
        <rect x="30" y="4" width="28" height="20" rx="4" fill={CREAM} stroke={CREAM_EDGE} strokeWidth="1.4" />
        <rect x="41" y="18" width="6" height="14" fill={FIRE_BRASS} />
        <circle cx="47" cy="55" r="34" fill={FIRE_SHADOW} />
        <circle cx="44" cy="52" r="34" fill={RED_DARK} />
        <circle cx="44" cy="52" r="30" fill={RED} />
        <circle cx="44" cy="52" r="20" fill="none" stroke={RED_LIGHT} strokeWidth="2" opacity="0.5" />
        <path d="M18 42a28 28 0 0 1 16-20" stroke={RED_LIGHT} strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="44" cy="52" r="6" fill={FIRE_BRASS} />
        <path d="M44 52l17 17" stroke="#5b4a3c" strokeWidth="3" strokeLinecap="round" />
        <circle cx="62" cy="70" r="4.4" fill="#5b4a3c" />
      </svg>
    ),
  },
  {
    id: "call-box",
    width: 72,
    height: 210,
    fits: ["RB", "LB"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 72 210">
        <ellipse cx="36" cy="206" rx="24" ry="4" fill={FIRE_SHADOW} />
        <path d="M18 204l5-14h26l5 14z" fill={RED_DARK} />
        <rect x="30" y="88" width="12" height="104" fill={RED} />
        <path d="M33 92v96" stroke={RED_LIGHT} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <rect x="26" y="84" width="20" height="8" rx="3" fill={RED_DARK} />
        <circle cx="36" cy="20" r="11" fill={RED_LIGHT} />
        <path d="M30 14a8 8 0 0 1 8-4" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />
        <circle cx="36" cy="7" r="3" fill={FIRE_BRASS} />
        <path d="M22 34a14 8 0 0 1 28 0z" fill={FIRE_BRASS} />
        <rect x="14" y="34" width="44" height="52" rx="8" fill={RED} />
        <rect x="20" y="40" width="32" height="40" rx="4" fill="none" stroke={RED_DARK} strokeWidth="2" />
        <circle cx="36" cy="52" r="7" fill={CREAM} stroke={RED_DARK} strokeWidth="1.4" />
        <path d="M36 48v4h3" stroke={RED_DARK} strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <text x="36" y="73" textAnchor="middle" fontSize="9" fontWeight="800" letterSpacing="1.2" fill={CREAM} fontFamily="inherit">
          FIRE
        </text>
      </svg>
    ),
  },
  {
    id: "hydrant",
    width: 76,
    height: 120,
    fits: ["RB", "LB", "B", "B2"],
    art: (
      <svg viewBox="0 -20 76 120">
        <ellipse cx="38" cy="96" rx="26" ry="4" fill={FIRE_SHADOW} />
        <rect x="8" y="46" width="14" height="14" rx="3" fill={RED_DARK} />
        <rect x="54" y="46" width="14" height="14" rx="3" fill={RED_DARK} />
        <rect x="4" y="48" width="6" height="10" rx="2" fill={FIRE_BRASS} />
        <rect x="66" y="48" width="6" height="10" rx="2" fill={FIRE_BRASS} />
        <path d="M22 88V36a16 16 0 0 1 32 0v52z" fill={RED} />
        <path d="M54 36v52h-8V36c0-8-4-14-10-16 10 1 18 7 18 16z" fill={RED_DARK} opacity="0.5" />
        <path d="M27 40v42" stroke={RED_LIGHT} strokeWidth="2.6" strokeLinecap="round" opacity="0.8" />
        <rect x="20" y="34" width="36" height="6" rx="3" fill={CREAM} />
        <path d="M24 28a14 12 0 0 1 28 0z" fill={CREAM} />
        <rect x="33" y="12" width="10" height="8" rx="2" fill={FIRE_BRASS} />
        <circle cx="38" cy="62" r="8" fill={RED_DARK} />
        <circle cx="38" cy="62" r="5" fill={FIRE_BRASS} />
        <rect x="14" y="86" width="48" height="8" rx="3" fill={RED_DARK} />
      </svg>
    ),
  },
  {
    id: "drill-board",
    width: 118,
    height: 92,
    fits: ["T", "T2", "RT", "LT"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 118 92">
        <rect x="8" y="10" width="108" height="76" rx="6" fill={FIRE_SHADOW} />
        <rect x="4" y="6" width="108" height="76" rx="6" fill="#c9a06e" />
        <rect x="10" y="12" width="96" height="58" rx="3" fill="#6f8a78" />
        <text x="58" y="27" textAnchor="middle" fontSize="10" fontWeight="800" letterSpacing="1.4" fill={CREAM} fontFamily="inherit">
          FIRE DRILL
        </text>
        <rect x="18" y="34" width="44" height="28" rx="1" fill="none" stroke={CREAM} strokeWidth="1.4" opacity="0.7" />
        <path d="M40 34v14M18 48h22" stroke={CREAM} strokeWidth="1.2" opacity="0.6" />
        <path d="M30 56h22V42h34" stroke={RED_LIGHT} strokeWidth="2" strokeDasharray="4 3" fill="none" />
        <path d="M86 38l6 4-6 4z" fill={RED_LIGHT} />
        <rect x="93" y="36" width="8" height="12" rx="1" fill="none" stroke={CREAM} strokeWidth="1.4" />
        <rect x="8" y="70" width="100" height="6" rx="2" fill="#a47b4c" />
        <rect x="22" y="67" width="10" height="3" rx="1.5" fill="white" />
        <rect x="80" y="67" width="8" height="3" rx="1.5" fill={RED_LIGHT} />
      </svg>
    ),
  },
  {
    id: "fire-boots",
    width: 100,
    height: 90,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 -24 100 90">
        <ellipse cx="50" cy="62" rx="40" ry="4" fill={FIRE_SHADOW} />
        <Boot x={22} y={0} />
        <Boot x={50} y={2} />
      </svg>
    ),
  },
  {
    id: "in-case-of-fire",
    group: "sign",
    width: 104,
    height: 72,
    fits: ["T", "T2", "RT", "LT"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 104 72">
        <rect x="8" y="10" width="92" height="58" rx="8" fill={FIRE_SHADOW} />
        <rect x="4" y="6" width="92" height="58" rx="8" fill={RED} />
        <rect x="9" y="11" width="82" height="48" rx="5" fill="none" stroke={CREAM} strokeWidth="1.4" opacity="0.8" />
        <text x="50" y="27" textAnchor="middle" fontSize="9" fontWeight="800" letterSpacing="1" fill={CREAM} fontFamily="inherit">
          IN CASE OF
        </text>
        <text x="50" y="43" textAnchor="middle" fontSize="15" fontWeight="800" letterSpacing="2" fill={CREAM} fontFamily="inherit">
          FIRE
        </text>
        <text x="50" y="54" textAnchor="middle" fontSize="7" fontWeight="700" letterSpacing="1" fill={CREAM} opacity="0.9" fontFamily="inherit">
          BREAK GLASS
        </text>
      </svg>
    ),
  },
  {
    id: "fire-door",
    group: "sign",
    width: 112,
    height: 60,
    fits: ["T", "T2", "RT", "LT"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 112 60">
        <rect x="8" y="10" width="100" height="46" rx="6" fill={FIRE_SHADOW} />
        <rect x="4" y="6" width="100" height="46" rx="6" fill={CREAM} stroke={CREAM_EDGE} strokeWidth="1.4" />
        <path d="M4 12a6 6 0 0 1 6-6h8v46h-8a6 6 0 0 1-6-6z" fill={RED} />
        <text x="61" y="27" textAnchor="middle" fontSize="12" fontWeight="800" letterSpacing="1.4" fill={RED} fontFamily="inherit">
          FIRE DOOR
        </text>
        <text x="61" y="41" textAnchor="middle" fontSize="8" fontWeight="700" letterSpacing="1.2" fill={RED_DARK} fontFamily="inherit">
          KEEP CLOSED
        </text>
      </svg>
    ),
  },
  {
    id: "hose-cart",
    width: 132,
    height: 130,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 132 130">
        <ellipse cx="66" cy="126" rx="56" ry="4" fill={FIRE_SHADOW} />
        <path d="M58 82 122 18M58 82l44 40" stroke={RED_DARK} strokeWidth="5" strokeLinecap="round" />
        <rect x="114" y="8" width="16" height="8" rx="4" fill="#5b4a3c" transform="rotate(-45 122 12)" />
        <path d="M96 122h12" stroke={RED_DARK} strokeWidth="5" strokeLinecap="round" />
        <circle cx="58" cy="82" r="38" fill="none" stroke={RED} strokeWidth="6" />
        <circle cx="58" cy="82" r="31" fill="#e2d4bb" />
        {[27, 22, 17].map((r) => (
          <circle key={r} cx="58" cy="82" r={r} fill="none" stroke={CREAM_EDGE} strokeWidth="1.4" />
        ))}
        <path d="M30 60a36 36 0 0 1 22-15" stroke={RED_LIGHT} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <circle cx="58" cy="82" r="10" fill={RED} />
        <circle cx="58" cy="82" r="4" fill={FIRE_BRASS} />
        <path d="M28 96c-10 6-14 14-12 22" stroke="#e2d4bb" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M11 116l10-2 2 8-10 2z" fill={FIRE_BRASS} />
      </svg>
    ),
  },
  {
    id: "coiled-hose",
    width: 118,
    height: 70,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 -24 118 70">
        <ellipse cx="59" cy="40" rx="50" ry="5" fill={FIRE_SHADOW} />
        {[44, 36, 28, 20].map((rx, i) => (
          <ellipse key={rx} cx="54" cy={30 - i * 3} rx={rx} ry={rx * 0.26} fill={i === 0 ? "#e2d4bb" : "none"} stroke={i % 2 ? "#d2c2a4" : "#e8dcc6"} strokeWidth="6" />
        ))}
        <path d="M54 18c20-2 40 2 48 8" stroke="#e8dcc6" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M100 22l14 6-2 6-14-4z" fill={FIRE_BRASS} />
        <path d="M102 24l8 3" stroke={FIRE_BRASS_LIGHT} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "wall-ladder",
    width: 140,
    height: 70,
    fits: ["T", "T2"],
    art: (
      <svg viewBox="0 0 140 70">
        <rect x="8" y="22" width="128" height="30" rx="4" fill={FIRE_SHADOW} />
        <path d="M6 20h128M6 48h128" stroke={RED} strokeWidth="6" strokeLinecap="round" />
        {[18, 36, 54, 72, 90, 108, 126].map((x) => (
          <path key={x} d={`M${x} 20v28`} stroke={RED_DARK} strokeWidth="3.4" strokeLinecap="round" />
        ))}
        <path d="M8 18h124" stroke={RED_LIGHT} strokeWidth="1.6" strokeLinecap="round" />
        {[30, 110].map((x) => (
          <path key={x} d={`M${x - 6} 10h12v16`} stroke="#5b4a3c" strokeWidth="3" fill="none" strokeLinejoin="round" />
        ))}
      </svg>
    ),
  },
  {
    id: "prevent-poster",
    width: 84,
    height: 112,
    fits: ["T", "T2", "RT", "LT"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 84 112">
        <rect x="8" y="8" width="72" height="100" rx="4" fill={FIRE_SHADOW} />
        <rect x="4" y="4" width="72" height="100" rx="4" fill={CREAM} stroke={CREAM_EDGE} strokeWidth="1.4" />
        <rect x="10" y="10" width="60" height="58" rx="3" fill="#f3d9a4" />
        <path d="M40 22c10 10 16 18 16 28a16 16 0 0 1-32 0c0-6 3-10 6-13 0 6 3 9 6 9-2-8 0-16 4-24z" fill={RED} />
        <path d="M40 40c5 5 7 9 7 13a7 7 0 0 1-14 0c0-4 3-8 7-13z" fill="#f2a65a" />
        <path d="M24 64h32" stroke={RED_DARK} strokeWidth="3" strokeLinecap="round" />
        <text x="40" y="82" textAnchor="middle" fontSize="10" fontWeight="800" letterSpacing="1.2" fill={RED} fontFamily="inherit">
          PREVENT
        </text>
        <text x="40" y="95" textAnchor="middle" fontSize="10" fontWeight="800" letterSpacing="1.2" fill={RED} fontFamily="inherit">
          FIRES
        </text>
      </svg>
    ),
  },
  {
    id: "fire-rubber-plant",
    group: "plant",
    width: 84,
    height: 150,
    fits: ["RB", "LB"],
    art: <RubberPlant pot={RED} potDark={RED_DARK} leaf="#9fb08a" leafDark="#7f9170" shadow={FIRE_SHADOW} />,
  },
  {
    id: "fire-fern",
    group: "plant",
    width: 110,
    height: 112,
    fits: ["RB", "LB", "B", "B2"],
    art: <Fern pot={CREAM} potDark={CREAM_SHADE} frond="#a3b88e" frondDark="#7f9170" shadow={FIRE_SHADOW} />,
  },
];

const CLOCK_WIRES = [-24, -16, -8, 0, 8, 16, 24];

/** More of the broadcast room: radios old and new, clocks, an intercom and studio odds and ends. */
const PA_STUDIO: Piece[] = [
  {
    id: "cathedral-radio",
    width: 104,
    height: 150,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 104 150">
        <ellipse cx="52" cy="146" rx="42" ry="4" fill={PA_SHADOW} />
        <path d="M24 94l-6 50M80 94l6 50M32 94l-2 46M72 94l2 46" stroke={PA_WOOD_DARK} strokeWidth="3.4" strokeLinecap="round" />
        <ellipse cx="52" cy="94" rx="44" ry="7" fill={PA_WOOD_DARK} />
        <ellipse cx="52" cy="91" rx="44" ry="7" fill={PA_WOOD} />
        <path d="M20 88V46C20 22 34 8 52 8s32 14 32 38v42z" fill={PA_WOOD} />
        <path d="M84 46v42h-8V46c0-18-10-32-24-36 18 2 32 16 32 36z" fill={PA_WOOD_DARK} opacity="0.6" />
        <path d="M30 66V46c0-14 10-26 22-26s22 12 22 26v20z" fill="#e8d6b0" />
        <path d="M52 20v46M41 25v41M63 25v41M30 50c8-6 36-6 44 0" stroke={PA_WOOD} strokeWidth="3" fill="none" />
        <path d="M26 44c0-16 10-28 22-32" stroke={PA_BRONZE_LIGHT} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.7" />
        <rect x="40" y="70" width="24" height="8" rx="4" fill={PA_IVORY} stroke={PA_IVORY_EDGE} strokeWidth="1" />
        <path d="M50 71v6" stroke={PA_BRONZE_DARK} strokeWidth="1.2" />
        <circle cx="31" cy="78" r="4" fill={PA_BRONZE_DARK} />
        <circle cx="73" cy="78" r="4" fill={PA_BRONZE_DARK} />
        <rect x="16" y="84" width="72" height="6" rx="3" fill={PA_WOOD_DARK} />
      </svg>
    ),
  },
  ...TRANSISTOR_TONES.map(
    (c): Piece => ({
      id: `transistor-${c.name}`,
      group: "transistor",
      width: 72,
      height: 82,
      fits: ["B", "B2"],
      art: (
        <svg viewBox="0 -24 72 82">
          <ellipse cx="36" cy="54" rx="26" ry="4" fill={PA_SHADOW} />
          <path d="M18 8c0-14 36-14 36 0" stroke="#8a6a4a" strokeWidth="3" fill="none" />
          <rect x="10" y="4" width="52" height="48" rx="8" fill={c.main} />
          <path d="M62 12v32a8 8 0 0 1-8 8h-4a8 8 0 0 0 8-8V4a8 8 0 0 1 4 8z" fill={c.dark} />
          <circle cx="28" cy="30" r="13" fill={PA_IVORY} />
          {[-2, -1, 0, 1, 2].flatMap((row) =>
            [-2, -1, 0, 1, 2]
              .filter((col) => row * row + col * col <= 5)
              .map((col) => <circle key={`${row}${col}`} cx={28 + col * 4.4} cy={30 + row * 4.4} r="1.3" fill={PA_IVORY_EDGE} />),
          )}
          <circle cx="50" cy="18" r="6" fill={PA_IVORY} stroke={PA_IVORY_EDGE} strokeWidth="1" />
          <path d="M50 18l3-3" stroke={PA_BRONZE_DARK} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M46 36l4 8 4-8" stroke={PA_BRONZE_LIGHT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M15 12v30" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
        </svg>
      ),
    }),
  ),
  {
    id: "school-clock",
    group: "clock",
    width: 88,
    height: 88,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 88 88">
        <circle cx="47" cy="47" r="36" fill={PA_SHADOW} />
        <circle cx="44" cy="44" r="36" fill="#e9e6df" stroke={PA_IVORY_EDGE} strokeWidth="1.6" />
        <circle cx="44" cy="44" r="29" fill="#fbf6ec" />
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x="43" y="17" width="2" height={i % 3 ? 3 : 6} rx="1" fill="#4a443e" transform={`rotate(${i * 30} 44 44)`} />
        ))}
        <path d="M44 44V26M44 44l11 9" stroke="#4a443e" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M44 44 30 60" stroke="#e39a82" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="44" cy="44" r="2.6" fill="#4a443e" />
        {CLOCK_WIRES.map((dx) => {
          const half = round1(Math.sqrt(36 * 36 - dx * dx));
          return <path key={dx} d={`M${44 + dx} ${round1(44 - half)}V${round1(44 + half)}`} stroke="#8a8175" strokeWidth="1.3" opacity="0.8" />;
        })}
        <circle cx="44" cy="44" r="36" fill="none" stroke="#8a8175" strokeWidth="2.4" />
      </svg>
    ),
  },
  {
    id: "flip-clock",
    group: "clock",
    width: 96,
    height: 72,
    fits: ["B", "B2"],
    noFlip: true,
    art: (
      <svg viewBox="0 -24 96 72">
        <ellipse cx="48" cy="44" rx="38" ry="4" fill={PA_SHADOW} />
        <rect x="14" y="36" width="10" height="6" rx="2" fill={PA_BRONZE_DARK} />
        <rect x="72" y="36" width="10" height="6" rx="2" fill={PA_BRONZE_DARK} />
        <path d="M10 38V16C10 6 18 0 28 0h40c10 0 18 6 18 16v22z" fill={PA_TEAL} />
        <path d="M14 14c2-6 8-10 16-10" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.5" />
        <rect x="20" y="11" width="56" height="21" rx="4" fill="#3f3a36" />
        {["7", "4", "5"].map((digit, i) => (
          <g key={digit}>
            <rect x={24 + i * 17} y="13" width="14" height="17" rx="2" fill={PA_IVORY} />
            <text x={31 + i * 17} y="26" textAnchor="middle" fontSize="12" fontWeight="800" fill="#3f3a36" fontFamily="inherit">
              {digit}
            </text>
          </g>
        ))}
        <path d="M22 21.5h52" stroke="#3f3a36" strokeWidth="0.8" opacity="0.5" />
      </svg>
    ),
  },
  {
    id: "intercom",
    width: 84,
    height: 104,
    fits: ["T", "T2", "RT", "LT"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 84 104">
        <rect x="8" y="8" width="72" height="92" rx="10" fill={PA_SHADOW} />
        <rect x="4" y="4" width="72" height="92" rx="10" fill={PA_IVORY} stroke={PA_IVORY_EDGE} strokeWidth="1.4" />
        <rect x="14" y="14" width="52" height="36" rx="6" fill={PA_WOOD} />
        {[20, 26, 32, 38, 44].map((y) => (
          <path key={y} d={`M20 ${y}h40`} stroke={PA_WOOD_DARK} strokeWidth="2" strokeLinecap="round" />
        ))}
        {[PA_TEAL, "#e39a82", "#e3bd6c", PA_MINT].map((fill, i) => (
          <rect key={fill} x={16 + i * 13} y="56" width="10" height="12" rx="2.5" fill={fill} />
        ))}
        <rect x="18" y="76" width="44" height="11" rx="5.5" fill={PA_TEAL} />
        <text x="40" y="84.5" textAnchor="middle" fontSize="7" fontWeight="800" letterSpacing="1.4" fill={PA_IVORY} fontFamily="inherit">
          TALK
        </text>
      </svg>
    ),
  },
  {
    id: "headphones",
    width: 84,
    height: 100,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 84 100">
        <rect x="30" y="4" width="24" height="12" rx="4" fill={PA_WOOD} />
        <path d="M42 16v14c0 4-6 4-6 0" stroke={PA_BRONZE} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M16 70C16 22 68 22 68 70" stroke="#4a443e" strokeWidth="5" fill="none" strokeLinecap="round" />
        <rect x="8" y="58" width="16" height="26" rx="7" fill={PA_TEAL} />
        <rect x="60" y="58" width="16" height="26" rx="7" fill={PA_TEAL} />
        <rect x="20" y="62" width="6" height="18" rx="3" fill="#4a443e" />
        <rect x="58" y="62" width="6" height="18" rx="3" fill="#4a443e" />
        <path d="M11 62v16" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <path d="M16 84c0 8 6 10 8 4s8-6 8 0 8 6 8 0" stroke="#4a443e" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "megaphone",
    width: 120,
    height: 74,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 -24 120 74">
        <ellipse cx="62" cy="46" rx="48" ry="4" fill={PA_SHADOW} />
        <rect x="44" y="26" width="9" height="16" rx="3" fill={PA_TEAL} />
        <path d="M28 16 92 0v44L28 28z" fill={PA_IVORY} />
        <path d="M60 8v28" stroke={PA_TEAL} strokeWidth="6" />
        <path d="M34 18l52-12" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <rect x="14" y="16" width="16" height="12" rx="4" fill={PA_TEAL} />
        <ellipse cx="92" cy="22" rx="6" ry="22" fill={PA_IVORY_EDGE} />
        <ellipse cx="93" cy="22" rx="3.6" ry="18" fill="#5f5a52" />
      </svg>
    ),
  },
  {
    id: "tube-amp",
    width: 120,
    height: 70,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 -24 120 70" overflow="visible">
        <defs>
          <radialGradient id="pc-sur-tube">
            <stop offset="0" stopColor="#ffcf7a" stopOpacity="0.7" />
            <stop offset="1" stopColor="#ffcf7a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="60" cy="42" rx="50" ry="4" fill={PA_SHADOW} />
        {[36, 50, 64].map((x) => (
          <g key={x}>
            <circle cx={x} cy="12" r="12" fill="url(#pc-sur-tube)" />
            <path d={`M${x - 5} 22V8a5 5 0 0 1 10 0v14z`} fill="#f3ead6" opacity="0.9" stroke={PA_IVORY_EDGE} strokeWidth="1" />
            <ellipse cx={x} cy="14" rx="2.6" ry="4" fill="#ffcf7a" />
          </g>
        ))}
        <rect x="76" y="8" width="20" height="14" rx="2" fill="#4a443e" />
        <rect x="10" y="22" width="100" height="18" rx="3" fill={PA_WOOD} />
        <rect x="14" y="26" width="92" height="10" rx="2" fill={PA_IVORY} />
        {[24, 36, 84, 96].map((x) => (
          <circle key={x} cx={x} cy="31" r="3" fill={PA_BRONZE_DARK} />
        ))}
        <rect x="50" y="28" width="20" height="6" rx="3" fill={PA_MINT} />
      </svg>
    ),
  },
  {
    id: "floor-speaker",
    width: 92,
    height: 180,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 92 180">
        <ellipse cx="46" cy="176" rx="36" ry="4" fill={PA_SHADOW} />
        <TaperedLegs left={14} right={78} top={150} length={24} />
        <rect x="6" y="12" width="80" height="140" rx="8" fill={PA_WOOD} />
        <path d="M86 20v124a8 8 0 0 1-8 8h-6a8 8 0 0 0 8-8V12a8 8 0 0 1 6 8z" fill={PA_WOOD_DARK} opacity="0.6" />
        <path d="M12 15h68" stroke={PA_BRONZE_LIGHT} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <rect x="14" y="22" width="64" height="96" rx="6" fill="#e8d6b0" />
        {[20, 26, 32, 38, 44, 50, 56, 62, 68, 74].map((x) => (
          <path key={x} d={`M${x} 24v92`} stroke={PA_BRONZE_LIGHT} strokeWidth="1.2" opacity="0.6" />
        ))}
        <circle cx="46" cy="60" r="20" fill="none" stroke={PA_WOOD_DARK} strokeWidth="1.6" opacity="0.35" />
        <circle cx="46" cy="100" r="8" fill="none" stroke={PA_WOOD_DARK} strokeWidth="1.6" opacity="0.35" />
        <rect x="38" y="128" width="16" height="6" rx="3" fill={PA_BRONZE} />
      </svg>
    ),
  },
  {
    id: "pa-hanging-plant",
    group: "hanging-plant",
    width: 90,
    height: 132,
    fits: ["T", "T2", "RT", "LT"],
    art: <HangingPlant pot={PA_TEAL} potDark="#4b7671" leaf="#9fb79a" leafDark="#6f8f73" />,
  },
  {
    id: "pa-rubber-plant",
    group: "plant",
    width: 84,
    height: 150,
    fits: ["RB", "LB"],
    art: <RubberPlant pot={PA_IVORY} potDark={PA_IVORY_EDGE} leaf="#8fb08a" leafDark="#5f8f6a" shadow={PA_SHADOW} />,
  },
  {
    id: "pa-fern",
    group: "plant",
    width: 110,
    height: 112,
    fits: ["RB", "LB", "B", "B2"],
    art: <Fern pot={PA_MINT} potDark={PA_MINT_DARK} frond="#9fb79a" frondDark="#6f8f73" shadow={PA_SHADOW} />,
  },
];

/** A small pot of leaves standing on `y`, for shelves, sills and trays. */
function LittlePot({
  x,
  y,
  pot,
  rim,
  leaf,
  leafDark,
  trail = false,
}: {
  x: number;
  y: number;
  pot: string;
  rim: string;
  leaf: string;
  leafDark: string;
  trail?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="-6" cy="-20" rx="4" ry="8" fill={leafDark} transform="rotate(-30 -6 -20)" />
      <ellipse cx="6" cy="-20" rx="4" ry="8" fill={leafDark} transform="rotate(30 6 -20)" />
      <ellipse cx="0" cy="-23" rx="4.4" ry="9" fill={leaf} />
      <path d="M-9-12h18l-2 12h-14z" fill={pot} />
      <rect x="-10" y="-15" width="20" height="5" rx="2.5" fill={rim} />
      {trail && (
        <>
          <path d="M-8-12C-15-4-15 8-12 18M8-12c7 6 8 16 5 22" stroke={leafDark} strokeWidth="1.4" fill="none" strokeLinecap="round" />
          {[
            [-14, 2],
            [-13, 14],
            [14, 0],
            [13, 10],
          ].map(([cx, cy]) => (
            <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx="2.6" ry="4" fill={leaf} />
          ))}
        </>
      )}
    </g>
  );
}

const MONSTERA_LEAVES: readonly (readonly [number, number, number, boolean])[] = [
  [24, 74, -62, true],
  [76, 72, 60, false],
  [28, 46, -30, false],
  [72, 44, 32, true],
  [50, 26, 0, false],
];

/** A split-leaf philodendron on a legged planter. */
function Monstera({ pot, potDark, leaf, leafDark, shadow }: { pot: string; potDark: string; leaf: string; leafDark: string; shadow: string }) {
  return (
    <svg viewBox="0 0 100 150">
      <ellipse cx="50" cy="146" rx="32" ry="4" fill={shadow} />
      <path d="M34 128l-5 16M66 128l5 16" stroke={LR_LEG} strokeWidth="3" strokeLinecap="round" />
      {MONSTERA_LEAVES.map(([cx, cy]) => (
        <path key={`s${cx}`} d={`M50 96Q${(50 + cx) / 2} ${cy + 20} ${cx} ${cy}`} stroke={leafDark} strokeWidth="2" fill="none" strokeLinecap="round" />
      ))}
      {MONSTERA_LEAVES.map(([cx, cy, rot, dark]) => (
        <g key={`${cx}-${cy}`} transform={`translate(${cx} ${cy}) rotate(${rot})`}>
          <ellipse rx="13" ry="17" fill={dark ? leafDark : leaf} />
          <path
            d="M0 15V-15M-13-4-6-2M-12 6-5 4M13-4 6-2M12 6 5 4"
            stroke={dark ? leaf : leafDark}
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.8"
          />
        </g>
      ))}
      <path d="M26 96h48l-6 34H32z" fill={pot} />
      <rect x="22" y="92" width="56" height="8" rx="4" fill={potDark} />
      <path d="M32 104l3 22" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

function Rocker({ u }: { u: Upholstery }) {
  return (
    <svg viewBox="0 0 110 124">
      <ellipse cx="55" cy="120" rx="44" ry="4" fill={SHADOW} />
      <path d="M6 106q49 18 98 0" stroke={LR_LEG} strokeWidth="4.4" fill="none" strokeLinecap="round" />
      <path d="M26 72 20 108M84 72l6 36" stroke={LR_LEG} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M36 74 34 112M74 74l2 38" stroke={WALNUT.dark} strokeWidth="3" strokeLinecap="round" />
      <path d="M28 70 22 14M82 70l6-56" stroke={LR_LEG} strokeWidth="4" strokeLinecap="round" />
      <path d="M22 16c22-9 44-9 66 0" stroke={LR_LEG} strokeWidth="5" fill="none" strokeLinecap="round" />
      <rect x="30" y="20" width="50" height="40" rx="12" fill={u.main} />
      <path d="M37 27h36" stroke={u.light} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M55 25v31" stroke={u.dark} strokeWidth="1.6" opacity="0.5" />
      <rect x="18" y="60" width="74" height="16" rx="8" fill={u.dark} />
      <rect x="20" y="57" width="70" height="12" rx="6" fill={u.main} />
      <path d="M28 60h54" stroke={u.light} strokeWidth="2" strokeLinecap="round" />
      <path d="M18 50v20M92 50v20" stroke={LR_LEG} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M14 48h22M74 48h22" stroke={LR_LEG} strokeWidth="4.4" strokeLinecap="round" />
    </svg>
  );
}

/** A lounge corner: rockers, an arc lamp, a bookcase, a plant stand and a few wall pieces. */
const LIGHTS_LOUNGE: Piece[] = [
  ...[BLUSH, POWDER, SAGE_CHAIR].map(
    (u): Piece => ({
      id: `rocker-${u.name}`,
      group: "rocker",
      width: 110,
      height: 124,
      fits: ["RB", "LB"],
      art: <Rocker u={u} />,
    }),
  ),
  {
    id: "arc-lamp",
    width: 130,
    height: 210,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 130 210" overflow="visible">
        <GlowDefs id="pc-sur-arc" />
        <ellipse cx="30" cy="206" rx="26" ry="4" fill={SHADOW} />
        <circle cx="104" cy="76" r="38" fill="url(#pc-sur-arc)" />
        <path d="M30 192V82C30 30 72 14 104 42" stroke={LR_BRASS} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M32.5 186V86" stroke={LR_BRASS_LIGHT} strokeWidth="1.4" opacity="0.7" />
        <rect x="12" y="188" width="36" height="14" rx="3" fill={LR_CREAM} />
        <path d="M44 190v10a3 3 0 0 1-3 2h-4a3 3 0 0 0 3-2v-12z" fill={LR_CREAM_SHADE} />
        <path d="M84 64a20 20 0 0 1 40 0z" fill={TEAL.main} />
        <path d="M90 54c4-6 10-8 16-8" stroke={TEAL.light} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <ellipse cx="104" cy="64" rx="20" ry="3" fill={TEAL.dark} />
        <ellipse cx="104" cy="65" rx="13" ry="1.8" fill="#fff1c2" />
      </svg>
    ),
  },
  {
    id: "bookcase",
    width: 100,
    height: 170,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 100 170">
        <ellipse cx="50" cy="166" rx="40" ry="4" fill={SHADOW} />
        <TaperedLegs left={14} right={86} top={146} length={18} />
        <rect x="8" y="10" width="84" height="138" rx="5" fill={WALNUT.main} />
        <rect x="14" y="16" width="72" height="126" rx="3" fill={WALNUT.dark} />
        <path d="M12 13h76" stroke={WALNUT.light} strokeWidth="1.6" strokeLinecap="round" />
        <rect x="14" y="56" width="72" height="5" fill={WALNUT.main} />
        <rect x="14" y="98" width="72" height="5" fill={WALNUT.main} />
        <rect x="18" y="24" width="7" height="32" rx="1.5" fill="#7fa9a3" />
        <rect x="26" y="28" width="6" height="28" rx="1.5" fill="#e3bd6c" />
        <rect x="33" y="22" width="8" height="34" rx="1.5" fill="#e39a82" />
        <rect x="42" y="26" width="6" height="30" rx="1.5" fill={LR_CREAM_SHADE} />
        <rect x="50" y="29" width="6" height="27" rx="1.5" fill={LR_SAGE} transform="rotate(14 56 56)" />
        <path d="M74 56c-7 0-9-6-9-12s5-9 5-14h8c0 5 5 8 5 14s-2 12-9 12z" fill={POWDER.main} />
        <path d="M69 40c0-3 1-6 2-8" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
        <rect x="20" y="90" width="34" height="8" rx="1.5" fill="#e39a82" />
        <rect x="22" y="82" width="30" height="8" rx="1.5" fill={LR_CREAM_SHADE} />
        <rect x="24" y="75" width="26" height="7" rx="1.5" fill="#7fa9a3" />
        <rect x="60" y="66" width="7" height="32" rx="1.5" fill="#e3bd6c" />
        <rect x="68" y="70" width="6" height="28" rx="1.5" fill={POWDER.main} />
        <rect x="75" y="64" width="7" height="34" rx="1.5" fill={LR_SAGE} />
        <rect x="18" y="110" width="7" height="32" rx="1.5" fill={LR_SAGE} />
        <rect x="26" y="114" width="6" height="28" rx="1.5" fill="#e39a82" />
        <rect x="33" y="112" width="8" height="30" rx="1.5" fill="#e3bd6c" />
        <LittlePot x={68} y={142} pot={LR_CREAM} rim={LR_CREAM_SHADE} leaf="#9cbc84" leafDark="#729760" />
      </svg>
    ),
  },
  {
    id: "plant-stand",
    width: 96,
    height: 150,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 96 150">
        <ellipse cx="48" cy="146" rx="36" ry="4" fill={SHADOW} />
        <path d="M16 144 32 34M80 144 64 34" stroke={LR_BRONZE_DARK} strokeWidth="2.6" strokeLinecap="round" />
        {[
          [60, 28],
          [100, 22],
          [134, 16],
        ].map(([y, inset]) => (
          <g key={y}>
            <rect x={inset} y={y} width={96 - inset * 2} height="5" rx="2.5" fill={WALNUT.main} />
            <path d={`M${inset + 3} ${y + 1.5}h${90 - inset * 2}`} stroke={WALNUT.light} strokeWidth="1.2" strokeLinecap="round" />
          </g>
        ))}
        <LittlePot x={48} y={60} pot="#7fa9a3" rim="#b9d3cf" leaf="#9cbc84" leafDark="#729760" />
        <LittlePot x={34} y={100} pot={MUSTARD.main} rim={MUSTARD.light} leaf="#9cbc84" leafDark="#729760" trail />
        <LittlePot x={63} y={100} pot={CORAL.main} rim={CORAL.light} leaf="#a9c48f" leafDark="#7f9b6a" />
        <path d="M34 134h28c0-8-6-12-14-12s-14 4-14 12z" fill={LR_PINK} />
        <path d="M38 130c2-4 5-6 9-7" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" fill="none" />
        {[-8, -3, 2, 7].map((dx, i) => (
          <ellipse key={dx} cx={48 + dx} cy={i % 2 ? 119 : 121} rx="3.4" ry="5" fill={i % 2 ? "#8fae7c" : "#a9c48f"} />
        ))}
      </svg>
    ),
  },
  {
    id: "sunburst-mirror",
    width: 100,
    height: 100,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 100 100">
        {Array.from({ length: 16 }, (_, i) => (
          <path key={i} d="M50 4 53 26h-6z" fill={i % 2 ? LR_BRASS_LIGHT : LR_BRASS} transform={`rotate(${i * 22.5} 50 50)`} />
        ))}
        <circle cx="51.5" cy="51.5" r="24" fill={SHADOW} />
        <circle cx="50" cy="50" r="24" fill={LR_BRASS} />
        <circle cx="50" cy="50" r="20" fill="#dfe9ea" />
        <path d="M38 46c2-6 7-10 13-11M41 56l14-14" stroke="white" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.8" />
      </svg>
    ),
  },
  {
    id: "print-pair",
    width: 124,
    height: 84,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 124 84">
        <rect x="8" y="10" width="50" height="66" rx="3" fill={SHADOW} />
        <rect x="5" y="7" width="50" height="66" rx="3" fill={WALNUT.main} />
        <rect x="10" y="12" width="40" height="56" rx="1.5" fill={LR_CREAM} />
        <path d="M30 62V22" stroke="#729760" strokeWidth="1.6" strokeLinecap="round" />
        {[26, 36, 46, 56].map((y, i) => (
          <g key={y}>
            <ellipse cx="24" cy={y} rx="6" ry="3" fill={i % 2 ? "#9cbc84" : "#b7cd9f"} transform={`rotate(-30 24 ${y})`} />
            <ellipse cx="36" cy={y - 4} rx="6" ry="3" fill={i % 2 ? "#b7cd9f" : "#9cbc84"} transform={`rotate(30 36 ${y - 4})`} />
          </g>
        ))}
        <rect x="71" y="20" width="50" height="56" rx="3" fill={SHADOW} />
        <rect x="68" y="17" width="50" height="56" rx="3" fill={LR_BRASS} />
        <rect x="72" y="21" width="42" height="48" rx="1.5" fill="#fbf6ec" />
        <circle cx="85" cy="36" r="8" fill="#e39a82" />
        <rect x="92" y="42" width="16" height="20" rx="2" fill="#7fa9a3" />
        <path d="M78 60c6-8 14-10 22-6" stroke="#e3bd6c" strokeWidth="4" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "nesting-tables",
    width: 120,
    height: 82,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 -32 120 82">
        <ellipse cx="60" cy="46" rx="52" ry="4" fill={SHADOW} />
        <path d="M18 10 14 44M62 10l4 34M30 11l-2 33M50 11l2 33" stroke={LR_LEG} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="40" cy="8" rx="30" ry="6" fill={WALNUT.dark} />
        <ellipse cx="40" cy="6" rx="30" ry="6" fill={WALNUT.main} />
        <path d="M20 4c8-3 20-4 30-3" stroke={WALNUT.light} strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <path d="M32-14c-2 4-3 10-2 16M36-12c3 3 4 8 3 14" stroke="#729760" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <circle cx="31.5" cy="-15" r="2.6" fill="#e3bd6c" />
        <circle cx="36.5" cy="-13" r="2.4" fill="white" />
        <path d="M34 6c-6 0-8-5-8-9s4-6 4-9h8c0 3 4 5 4 9s-2 9-8 9z" fill={CORAL.main} />
        <path d="M74 24 72 44M98 24l2 20" stroke={LR_LEG} strokeWidth="2.6" strokeLinecap="round" />
        <ellipse cx="86" cy="22" rx="22" ry="4.6" fill={MUSTARD.dark} />
        <ellipse cx="86" cy="20" rx="22" ry="4.6" fill={MUSTARD.main} />
        <circle cx="82" cy="10" r="4" fill={CORAL.main} />
        <circle cx="89" cy="9" r="4" fill="#a9c48f" />
        <path d="M76 12h20c0 5-4 8-10 8s-10-3-10-8z" fill={TEAL.main} />
      </svg>
    ),
  },
  {
    id: "throw-basket",
    width: 90,
    height: 82,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 -24 90 82">
        <ellipse cx="45" cy="54" rx="34" ry="4" fill={SHADOW} />
        <path d="M14 10h62l-6 40a6 6 0 0 1-6 5H26a6 6 0 0 1-6-5z" fill="#d9b38a" />
        <path d="M16 22h58M18 34h54M19 46h52" stroke="#b98a5e" strokeWidth="1.6" opacity="0.7" />
        <path d="M30 12l2 40M45 12v42M60 12l-2 40" stroke="#b98a5e" strokeWidth="1.2" opacity="0.5" />
        <path d="M22 8c2-12 14-18 26-16s22 8 24 16z" fill={MUSTARD.main} />
        <path d="M30 0c6-6 14-8 22-6" stroke={MUSTARD.light} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <rect x="10" y="6" width="70" height="8" rx="4" fill="#c69a6a" />
        <path d="M50 8h16v24c0 4-3 6-8 6s-8-2-8-6z" fill={MUSTARD.main} />
        <path d="M54 12v20" stroke={MUSTARD.light} strokeWidth="2" strokeLinecap="round" />
        <path d="M52 38v4M56 39v4M60 39v4M64 38v4" stroke={MUSTARD.dark} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "monstera",
    group: "plant",
    width: 84,
    height: 126,
    fits: ["RB", "LB", "B", "B2"],
    art: <Monstera pot={MUSTARD.main} potDark={MUSTARD.dark} leaf="#9cbc84" leafDark="#729760" shadow={SHADOW} />,
  },
];

/** The office side of the station: a steel desk, swivel chairs, a typewriter, a water cooler and lobby pieces. */
const PA_OFFICE: Piece[] = [
  {
    id: "office-desk",
    width: 150,
    height: 130,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 150 130" overflow="visible">
        <ellipse cx="75" cy="126" rx="66" ry="4" fill={PA_SHADOW} />
        <rect x="60" y="62" width="62" height="30" fill={PA_MINT_DARK} opacity="0.6" />
        <rect x="10" y="62" width="50" height="60" rx="4" fill={PA_MINT} />
        <path d="M60 66v52a4 4 0 0 1-4 4h-4a4 4 0 0 0 4-4V62a4 4 0 0 1 4 4z" fill={PA_MINT_DARK} />
        {[70, 94].map((y) => (
          <g key={y}>
            <rect x="16" y={y} width="36" height="18" rx="3" fill="none" stroke={PA_MINT_DARK} strokeWidth="1.6" />
            <rect x="27" y={y + 7} width="14" height="4" rx="2" fill={PA_BRONZE} />
          </g>
        ))}
        <rect x="122" y="62" width="18" height="60" rx="4" fill={PA_MINT} />
        <path d="M140 66v52a4 4 0 0 1-4 4h-3a4 4 0 0 0 4-4V62a4 4 0 0 1 3 4z" fill={PA_MINT_DARK} />
        <rect x="4" y="54" width="142" height="10" rx="4" fill={PA_WOOD} />
        <path d="M10 56.5h130" stroke={PA_BRONZE_LIGHT} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        <rect x="24" y="47" width="34" height="7" rx="1" fill={PA_IVORY} transform="rotate(-4 40 50)" />
        <path d="M28 49h22" stroke={PA_IVORY_EDGE} strokeWidth="1.2" transform="rotate(-4 40 50)" />
        <path d="M75 38l-2-10M79 38v-12M83 38l2-9" stroke="#e3bd6c" strokeWidth="2" strokeLinecap="round" />
        <rect x="72" y="37" width="14" height="17" rx="2" fill="#e39a82" />
        <ellipse cx="116" cy="40" rx="20" ry="12" fill="#ffe6a6" opacity="0.45" />
        <path d="M116 54V30" stroke={PA_BRONZE} strokeWidth="3" />
        <ellipse cx="116" cy="54" rx="10" ry="3" fill={PA_BRONZE_DARK} />
        <path d="M100 30h32l-4-12h-24z" fill={PA_TEAL} />
        <path d="M106 21h14" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
        <ellipse cx="116" cy="30" rx="14" ry="2" fill="#fff1c2" />
      </svg>
    ),
  },
  ...TRANSISTOR_TONES.map(
    (c): Piece => ({
      id: `office-chair-${c.name}`,
      group: "office-chair",
      width: 84,
      height: 130,
      fits: ["RB", "LB"],
      art: (
        <svg viewBox="0 0 84 130">
          <ellipse cx="42" cy="126" rx="32" ry="4" fill={PA_SHADOW} />
          <path d="M42 84v22" stroke="#6b6660" strokeWidth="5" strokeLinecap="round" />
          <path d="M14 116 42 106l28 10M24 120l18-14 18 14" stroke="#6b6660" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {[
            [14, 118],
            [70, 118],
            [24, 122],
            [60, 122],
          ].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="3" fill="#4a443e" />
          ))}
          <path d="M42 58v14" stroke="#6b6660" strokeWidth="4" />
          <rect x="18" y="10" width="48" height="50" rx="16" fill={c.main} />
          <path d="M66 26v18a16 16 0 0 1-16 16h-6a16 16 0 0 0 16-16V10a16 16 0 0 1 6 16z" fill={c.dark} opacity="0.5" />
          <path d="M26 20c4-4 10-6 16-6" stroke="white" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.5" />
          {[
            [34, 30],
            [50, 30],
            [42, 42],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill={c.dark} />
          ))}
          <rect x="10" y="68" width="64" height="18" rx="9" fill={c.dark} />
          <rect x="12" y="66" width="60" height="13" rx="6.5" fill={c.main} />
          <path d="M20 69h44" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
        </svg>
      ),
    }),
  ),
  {
    id: "typewriter",
    width: 110,
    height: 74,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 -24 110 74">
        <ellipse cx="55" cy="46" rx="46" ry="4" fill={PA_SHADOW} />
        <rect x="36" y="-18" width="38" height="30" rx="1" fill="white" stroke={PA_IVORY_EDGE} strokeWidth="1" />
        <path d="M41-11h28M41-5h22M41 1h26" stroke={PA_IVORY_EDGE} strokeWidth="1.4" strokeLinecap="round" />
        <rect x="18" y="8" width="74" height="8" rx="4" fill="#4a443e" />
        <circle cx="16" cy="12" r="5" fill="#4a443e" />
        <circle cx="94" cy="12" r="5" fill="#4a443e" />
        <path d="M14 18h82l8 22a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" fill={PA_TEAL} />
        <path d="M18 21h70" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.4" />
        {[0, 1].map((row) =>
          Array.from({ length: 9 - row }, (_, i) => (
            <circle key={`${row}-${i}`} cx={24 + row * 4 + i * 8} cy={27 + row * 6} r="2.6" fill={PA_IVORY} />
          )),
        )}
        <rect x="36" y="37" width="38" height="4" rx="2" fill={PA_IVORY} />
      </svg>
    ),
  },
  {
    id: "water-cooler",
    width: 70,
    height: 170,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 70 170">
        <ellipse cx="35" cy="166" rx="26" ry="4" fill={PA_SHADOW} />
        <path d="M16 16c0-8 8-12 19-12s19 4 19 12v26c0 6-6 10-14 12h-10c-8-2-14-6-14-12z" fill="#cfe6ea" />
        <path d="M18 26h34v16c0 5-5 8-12 10h-10c-7-2-12-5-12-10z" fill="#b6d7dd" />
        <path d="M22 12v30" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
        <rect x="29" y="52" width="12" height="8" fill="#b5d3d8" />
        <rect x="10" y="58" width="50" height="102" rx="6" fill={PA_IVORY} />
        <path d="M60 64v90a6 6 0 0 1-6 6h-4a6 6 0 0 0 6-6V58a6 6 0 0 1 4 6z" fill={PA_IVORY_EDGE} opacity="0.7" />
        <rect x="8" y="56" width="54" height="6" rx="3" fill={PA_IVORY_EDGE} />
        <rect x="20" y="70" width="28" height="18" rx="3" fill="#e2d6c0" />
        <rect x="25" y="76" width="6" height="8" rx="2" fill="#e39a82" />
        <rect x="37" y="76" width="6" height="8" rx="2" fill={PA_TEAL} />
        <rect x="22" y="92" width="24" height="4" rx="2" fill="#b7b2a6" />
        <rect x="56" y="70" width="8" height="26" rx="3" fill="#e9e6df" stroke="#b7b2a6" strokeWidth="1" />
        <path d="M16 100v52" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
        <rect x="14" y="158" width="10" height="6" rx="2" fill="#9a9488" />
        <rect x="46" y="158" width="10" height="6" rx="2" fill="#9a9488" />
      </svg>
    ),
  },
  {
    id: "coat-rack",
    width: 70,
    height: 190,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 70 190">
        <ellipse cx="35" cy="186" rx="26" ry="4" fill={PA_SHADOW} />
        <path d="M35 150 14 184M35 150l21 34M35 150v34" stroke={PA_WOOD_DARK} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M35 24v130" stroke={PA_WOOD} strokeWidth="5" strokeLinecap="round" />
        <path d="M35 36c-10-2-16 4-18 10M35 36c10-2 16 4 18 10M35 52c-8 0-12 4-14 8M35 52c8 0 12 4 14 8" stroke={PA_WOOD_DARK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        {[
          [17, 46, PA_TEAL],
          [21, 60, "#e3bd6c"],
          [49, 60, PA_TEAL],
        ].map(([x, y, fill]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3.4" fill={fill as string} />
        ))}
        <path d="M50 44c3 10 3 30-1 44h-9c2-14 2-30 1-40z" fill="#e39a82" />
        <path d="M41 62h9M41 72h9" stroke="#f4c2b2" strokeWidth="2" />
        <path d="M40 88v5M44 88v5M48 88v5" stroke="#c97f68" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="53" cy="46" r="3.4" fill="#e39a82" />
        <path d="M24 24c0-12 4-16 11-16s11 4 11 16z" fill="#8a6a4a" />
        <rect x="24" y="18" width="22" height="4" fill={PA_TEAL} />
        <ellipse cx="35" cy="24" rx="18" ry="4" fill="#8a6a4a" />
        <path d="M28 12c2-2 4-3 7-3" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" fill="none" />
      </svg>
    ),
  },
  {
    id: "round-speaker",
    width: 96,
    height: 96,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 96 96">
        <rect x="42" y="2" width="12" height="14" rx="3" fill={PA_WOOD_DARK} />
        <path d="M48 14v12" stroke={PA_BRONZE} strokeWidth="4" />
        <circle cx="50" cy="60" r="34" fill={PA_SHADOW} />
        <circle cx="48" cy="58" r="34" fill={PA_WOOD} />
        <circle cx="48" cy="58" r="27" fill="#e8d6b0" />
        {[8, 14, 20, 26].map((r) => (
          <circle key={r} cx="48" cy="58" r={r} fill="none" stroke={PA_WOOD_DARK} strokeWidth="1.4" opacity="0.35" />
        ))}
        <circle cx="48" cy="58" r="5" fill={PA_BRONZE} />
        <path d="M22 48c3-10 10-17 20-20" stroke={PA_BRONZE_LIGHT} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.7" />
      </svg>
    ),
  },
  {
    id: "mail-cubbies",
    width: 120,
    height: 86,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 120 86">
        <rect x="8" y="8" width="108" height="74" rx="4" fill={PA_SHADOW} />
        <rect x="4" y="4" width="108" height="74" rx="4" fill={PA_WOOD} />
        <path d="M8 6.5h100" stroke={PA_BRONZE_LIGHT} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        {[0, 1].flatMap((r) =>
          [0, 1, 2, 3].map((c) => <rect key={`${r}-${c}`} x={10 + c * 25} y={10 + r * 33} width="21" height="29" rx="2" fill={PA_WOOD_DARK} />),
        )}
        {[
          [0, 0, PA_IVORY],
          [2, 0, PA_MINT],
          [3, 0, PA_IVORY],
          [1, 1, "#f4c2b2"],
          [3, 1, PA_IVORY],
        ].map(([c, r, fill]) => {
          const x = 10 + (c as number) * 25;
          const y = 10 + (r as number) * 33;
          return (
            <g key={`${c}-${r}`}>
              <rect x={x + 3} y={y + 14} width="15" height="11" rx="1" fill={fill as string} />
              <path d={`M${x + 3} ${y + 14}l7.5 6 7.5-6`} stroke={PA_IVORY_EDGE} strokeWidth="1" fill="none" />
            </g>
          );
        })}
      </svg>
    ),
  },
  {
    id: "applause-sign",
    group: "sign",
    width: 112,
    height: 50,
    fits: ["T", "T2", "RT", "LT"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 112 50">
        <path d="M24 6V0M88 6V0" stroke={PA_BRONZE} strokeWidth="1.6" />
        <rect x="7" y="9" width="104" height="36" rx="6" fill={PA_SHADOW} />
        <rect x="4" y="6" width="104" height="36" rx="6" fill="#4a443e" />
        <rect x="9" y="11" width="94" height="26" rx="3" fill="#fbe7d8" />
        <text x="56" y="29" textAnchor="middle" fontSize="12" fontWeight="800" letterSpacing="2" fill="#c94a3c" fontFamily="inherit">
          APPLAUSE
        </text>
      </svg>
    ),
  },
  {
    id: "lobby-bench",
    width: 140,
    height: 70,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 -24 140 70">
        <ellipse cx="70" cy="42" rx="62" ry="4" fill={PA_SHADOW} />
        <path d="M20 22l6 18 6-18M108 22l6 18 6-18" stroke="#4a443e" strokeWidth="2" fill="none" strokeLinejoin="round" />
        <rect x="12" y="16" width="116" height="8" rx="3" fill={PA_WOOD} />
        <rect x="14" y="2" width="112" height="16" rx="8" fill={PA_TEAL} />
        <path d="M22 5h96" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        {[40, 70, 100].map((x) => (
          <circle key={x} cx={x} cy="10" r="1.8" fill="#4b7671" />
        ))}
        <g transform="rotate(-6 102 -1)">
          <rect x="90" y="-5" width="26" height="7" rx="1" fill={PA_IVORY} />
          <path d="M93-2h18" stroke={PA_IVORY_EDGE} strokeWidth="1.2" />
        </g>
      </svg>
    ),
  },
  {
    id: "pa-monstera",
    group: "plant",
    width: 100,
    height: 150,
    fits: ["RB", "LB"],
    art: <Monstera pot={PA_IVORY} potDark={PA_IVORY_EDGE} leaf="#9fb79a" leafDark="#6f8f73" shadow={PA_SHADOW} />,
  },
];

/** More of the firehouse hall: a CO₂ extinguisher, wall cabinets, a hose rack, a sprinkler riser, lockers and the station dog. */
const FIRE_HALL: Piece[] = [
  {
    id: "extinguisher-co2",
    group: "extinguisher",
    width: 74,
    height: 150,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 74 150">
        <ellipse cx="34" cy="146" rx="24" ry="4" fill={FIRE_SHADOW} />
        <path d="M40 20c16 4 20 20 20 40v24" stroke="#3f3a36" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M18 34c0-6 6-10 16-10s16 4 16 10v102a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6z" fill={RED} />
        <path d="M50 34v102a6 6 0 0 1-6 6h-6a6 6 0 0 0 6-6V34c0-5-4-8-9-9.4C45 25 50 29 50 34z" fill={RED_DARK} opacity="0.7" />
        <path d="M23 38v92" stroke={RED_LIGHT} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        <rect x="22" y="54" width="24" height="30" rx="2" fill={CREAM} />
        <path d="M27 62h14M27 68h10M27 74h12" stroke={CREAM_EDGE} strokeWidth="2" strokeLinecap="round" />
        <rect x="28" y="14" width="12" height="12" rx="2" fill="#9a9488" />
        <path d="M26 12h20l6-4" stroke="#5b4a3c" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M54 84h12l6 26H48z" fill="#3f3a36" />
        <ellipse cx="60" cy="110" rx="12" ry="3" fill="#57504a" />
      </svg>
    ),
  },
  {
    id: "extinguisher-cabinet",
    width: 84,
    height: 124,
    fits: ["T", "T2", "RT", "LT"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 84 124">
        <rect x="10" y="10" width="70" height="110" rx="6" fill={FIRE_SHADOW} />
        <rect x="6" y="6" width="70" height="110" rx="6" fill={CREAM} />
        <path d="M12 6h58a6 6 0 0 1 6 6v12H6V12a6 6 0 0 1 6-6z" fill={RED} />
        <text x="41" y="19" textAnchor="middle" fontSize="9" fontWeight="800" letterSpacing="1.6" fill={CREAM} fontFamily="inherit">
          FIRE
        </text>
        <rect x="13" y="30" width="56" height="78" rx="3" fill={CREAM_SHADE} />
        <path d="M45 41c8 2 10 10 10 22" stroke="#4a3b30" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M30 52c0-5 5-8 11-8s11 3 11 8v48a4 4 0 0 1-4 4H34a4 4 0 0 1-4-4z" fill={RED} />
        <path d="M33 54v44" stroke={RED_LIGHT} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <rect x="34" y="64" width="14" height="14" rx="1.5" fill={CREAM} />
        <rect x="37" y="38" width="8" height="7" rx="1.5" fill={FIRE_BRASS} />
        <rect x="13" y="30" width="56" height="78" rx="3" fill="#dbeef0" opacity="0.3" stroke={CREAM_EDGE} strokeWidth="1.6" />
        <path d="M19 42l14-8M19 54l26-16" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
        <rect x="63" y="62" width="4" height="16" rx="2" fill={FIRE_BRASS} />
      </svg>
    ),
  },
  {
    id: "hose-rack",
    width: 100,
    height: 124,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 100 124">
        <path d="M50 0v26" stroke={RED_DARK} strokeWidth="6" />
        <circle cx="50" cy="12" r="10" fill="none" stroke={RED} strokeWidth="3" />
        <path d="M40 12h20M50 2v20" stroke={RED} strokeWidth="2" />
        <circle cx="50" cy="12" r="3" fill={FIRE_BRASS} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={16 + i * 10} y="28" width="10" height={i % 2 ? 66 : 72} rx="5" fill={CREAM} stroke={CREAM_EDGE} strokeWidth="1" />
        ))}
        <rect x="12" y="24" width="76" height="8" rx="4" fill={RED} />
        <path d="M16 26h68" stroke={RED_LIGHT} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        {[22, 42, 62].map((x) => (
          <circle key={x} cx={x} cy="28" r="2" fill={FIRE_BRASS_LIGHT} />
        ))}
        <path d="M80 32c6 20 6 46 0 66" stroke={CREAM_SHADE} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M74 96h12l-3 22h-6z" fill={FIRE_BRASS} />
        <path d="M77 100l1 14" stroke={FIRE_BRASS_LIGHT} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "riser-valve",
    width: 80,
    height: 176,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 80 176">
        <ellipse cx="40" cy="172" rx="28" ry="4" fill={FIRE_SHADOW} />
        <rect x="32" y="0" width="16" height="166" fill={RED} />
        <path d="M36 4v158" stroke={RED_LIGHT} strokeWidth="2.4" opacity="0.7" />
        <path d="M46 0v166" stroke={RED_DARK} strokeWidth="3" opacity="0.6" />
        <rect x="28" y="38" width="24" height="8" rx="2" fill={RED_DARK} />
        <rect x="28" y="118" width="24" height="8" rx="2" fill={RED_DARK} />
        <rect x="22" y="160" width="36" height="8" rx="3" fill="#9a9488" />
        <rect x="24" y="68" width="32" height="34" rx="6" fill={RED} />
        <path d="M28 72v26" stroke={RED_LIGHT} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <circle cx="40" cy="85" r="11" fill="none" stroke={FIRE_BRASS} strokeWidth="3" />
        <path d="M29 85h22M40 74v22" stroke={FIRE_BRASS} strokeWidth="2" />
        <circle cx="40" cy="85" r="3" fill={FIRE_BRASS_LIGHT} />
        <path d="M48 140h8" stroke="#9a9488" strokeWidth="3" />
        <circle cx="64" cy="140" r="10" fill={CREAM} stroke="#9a9488" strokeWidth="2" />
        {[-60, -30, 0, 30, 60].map((a) => (
          <path key={a} d="M64 132v2" stroke="#8a8175" strokeWidth="1.2" transform={`rotate(${a} 64 140)`} />
        ))}
        <path d="M64 140l5-5" stroke={RED_DARK} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "gear-locker",
    width: 92,
    height: 180,
    fits: ["RB", "LB"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 92 180">
        <ellipse cx="46" cy="176" rx="40" ry="4" fill={FIRE_SHADOW} />
        <rect x="6" y="10" width="80" height="160" rx="5" fill={CREAM} />
        <path d="M86 16v148a6 6 0 0 1-6 6h-4a6 6 0 0 0 6-6V10a6 6 0 0 1 4 6z" fill={CREAM_SHADE} />
        {[10, 48].map((x, i) => (
          <g key={x}>
            <rect x={x} y="14" width="34" height="142" rx="3" fill={CREAM_SHADE} />
            {[24, 30, 36].map((y) => (
              <path key={y} d={`M${x + 8} ${y}h18`} stroke={CREAM_EDGE} strokeWidth="2" strokeLinecap="round" />
            ))}
            <rect x={x + 10} y="46" width="14" height="11" rx="2" fill={RED} />
            <text x={x + 17} y="54.5" textAnchor="middle" fontSize="8" fontWeight="800" fill={CREAM} fontFamily="inherit">
              {i + 1}
            </text>
          </g>
        ))}
        <rect x="38" y="84" width="3" height="16" rx="1.5" fill="#9a9488" />
        <rect x="51" y="84" width="3" height="16" rx="1.5" fill="#9a9488" />
        <rect x="6" y="156" width="80" height="8" fill={RED} />
        <rect x="12" y="166" width="10" height="6" rx="2" fill="#9a9488" />
        <rect x="70" y="166" width="10" height="6" rx="2" fill="#9a9488" />
      </svg>
    ),
  },
  {
    id: "evac-map",
    width: 112,
    height: 86,
    fits: ["T", "T2", "RT", "LT"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 112 86">
        <rect x="8" y="8" width="100" height="74" rx="4" fill={FIRE_SHADOW} />
        <rect x="4" y="4" width="100" height="74" rx="4" fill={RED} />
        <rect x="9" y="9" width="90" height="54" rx="2" fill="#fbf6ec" />
        <path d="M16 16h76v40H16zM16 36h30M60 16v20M60 36h32M46 36v20" stroke="#8a8175" strokeWidth="2" fill="none" />
        <path d="M30 48h22v-8h16" stroke={RED} strokeWidth="2.4" fill="none" strokeDasharray="4 3" />
        <path d="M68 36l7 4-7 4z" fill={RED} />
        <circle cx="30" cy="48" r="3.4" fill="#5f8f89" />
        <text x="54" y="73.5" textAnchor="middle" fontSize="7.5" fontWeight="800" letterSpacing="1.4" fill={CREAM} fontFamily="inherit">
          EXIT ROUTE
        </text>
      </svg>
    ),
  },
  {
    id: "extinguisher-sign",
    group: "sign",
    width: 112,
    height: 50,
    fits: ["T", "T2", "RT", "LT"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 112 50">
        <rect x="6" y="8" width="102" height="38" rx="5" fill={FIRE_SHADOW} />
        <rect x="4" y="4" width="102" height="38" rx="5" fill={RED} />
        <rect x="8" y="8" width="94" height="30" rx="3" fill="none" stroke={CREAM} strokeWidth="1.4" />
        <path d="M16 18c0-3 2-4 5-4s5 1 5 4v14H16z" fill={CREAM} />
        <path d="M21 14v-3h5" stroke={CREAM} strokeWidth="1.6" fill="none" />
        <text x="62" y="21" textAnchor="middle" fontSize="8" fontWeight="800" letterSpacing="0.8" fill={CREAM} fontFamily="inherit">
          EXTINGUISHER
        </text>
        <path d="M44 30h30" stroke={CREAM} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M74 26l7 4-7 4z" fill={CREAM} />
      </svg>
    ),
  },
  {
    id: "dalmatian",
    width: 120,
    height: 88,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 -24 120 88">
        <ellipse cx="60" cy="60" rx="50" ry="4" fill={FIRE_SHADOW} />
        <g transform="translate(0 14)">
        <rect x="10" y="26" width="100" height="18" rx="9" fill={RED} />
        <path d="M18 30h84" stroke={RED_LIGHT} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <path d="M98 20c10 2 14 8 12 14" stroke="#d9d2c6" strokeWidth="5.6" fill="none" strokeLinecap="round" />
        <path d="M98 20c10 2 14 8 12 14" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" />
        <ellipse cx="66" cy="16" rx="34" ry="13" fill="white" stroke="#d9d2c6" strokeWidth="1.2" />
        <rect x="20" y="22" width="32" height="8" rx="4" fill="white" stroke="#d9d2c6" strokeWidth="1.2" />
        <ellipse cx="32" cy="8" rx="14" ry="12" fill="white" stroke="#d9d2c6" strokeWidth="1.2" />
        <ellipse cx="22" cy="13" rx="8" ry="6" fill="white" />
        <circle cx="16" cy="12" r="2.4" fill="#3f3a36" />
        <path d="M27 5q3 2 6 0" stroke="#3f3a36" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M38-2c8 2 10 10 6 16-4-2-8-8-6-16z" fill="#3f3a36" />
        {[
          [56, 8, 3],
          [70, 5, 2.4],
          [82, 13, 3.2],
          [64, 21, 2.2],
          [90, 21, 2],
          [48, 18, 2],
          [28, 0, 1.6],
          [36, 26, 1.6],
        ].map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#3f3a36" />
        ))}
        <path d="M43 10q4 6 2 12" stroke={RED} strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="46" cy="22" r="2.4" fill={FIRE_BRASS} />
        </g>
      </svg>
    ),
  },
  {
    id: "fire-cactus",
    group: "plant",
    width: 80,
    height: 120,
    fits: ["RB", "LB", "B", "B2"],
    art: (
      <svg viewBox="0 0 80 120">
        <ellipse cx="40" cy="116" rx="24" ry="4" fill={FIRE_SHADOW} />
        <path d="M32 58h-8a6 6 0 0 1-6-6V40a4 4 0 0 1 8 0v10h6zM48 48h8V36a4 4 0 0 1 8 0v14a6 6 0 0 1-6 6H48z" fill="#7f9f78" />
        <path d="M32 76V30a8 8 0 0 1 16 0v46z" fill="#8fae86" />
        <path d="M37 30v44M43 30v44" stroke="#6f8f68" strokeWidth="1.2" opacity="0.7" />
        <path d="M35 28c0-3 1-5 3-6" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" fill="none" />
        <circle cx="40" cy="21" r="3" fill={RED_LIGHT} />
        <path d="M22 76h36l-4 34a6 6 0 0 1-6 5H32a6 6 0 0 1-6-5z" fill={CREAM} />
        <rect x="24" y="86" width="32" height="5" fill={RED} />
        <rect x="20" y="72" width="40" height="8" rx="4" fill={CREAM_SHADE} />
      </svg>
    ),
  },
];

function WringerWasher({ k }: { k: Kitchen }) {
  return (
    <svg viewBox="0 0 90 170">
      <ellipse cx="45" cy="166" rx="36" ry="4" fill={PLUMB_SHADOW} />
      <path d="M24 128 18 162M66 128l6 34M45 130v32" stroke={CHROME_EDGE} strokeWidth="3.4" strokeLinecap="round" />
      {[18, 72, 45].map((x) => (
        <circle key={x} cx={x} cy="163" r="3" fill="#9a9488" />
      ))}
      <path d="M12 70h66l-4 54a8 8 0 0 1-8 7H24a8 8 0 0 1-8-7z" fill={k.body} />
      <path d="M78 70l-4 54a8 8 0 0 1-8 7h-6a8 8 0 0 0 8-7l4-54z" fill={k.side} />
      <path d="M20 80l3 40" stroke="white" strokeWidth="2.6" strokeLinecap="round" opacity="0.6" />
      <rect x="8" y="64" width="74" height="10" rx="5" fill={k.side} />
      <rect x="20" y="28" width="6" height="38" rx="2" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="1" />
      <rect x="64" y="28" width="6" height="38" rx="2" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="1" />
      <rect x="16" y="24" width="58" height="6" rx="3" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="1" />
      <rect x="18" y="34" width="54" height="8" rx="4" fill="#f6f1e7" stroke={CHROME_EDGE} strokeWidth="1" />
      <rect x="18" y="44" width="54" height="8" rx="4" fill="#f6f1e7" stroke={CHROME_EDGE} strokeWidth="1" />
      <path d="M72 38l12-8" stroke={CHROME_EDGE} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="84" cy="30" r="3.4" fill={COPPER} />
    </svg>
  );
}

const PEDAL_BINS = [KITCHEN_MINT, KITCHEN_BLUSH] as const;

/** A laundry corner, a linen cupboard, a café window and small kitchen and bath odds and ends. */
const PLUMBING_HOME: Piece[] = [
  ...[KITCHEN_MINT, KITCHEN_BUTTER, KITCHEN_POWDER].map(
    (k): Piece => ({
      id: `washer-${k.name}`,
      group: "washer",
      width: 90,
      height: 170,
      fits: ["RB", "LB"],
      art: <WringerWasher k={k} />,
    }),
  ),
  {
    id: "linen-cabinet",
    width: 80,
    height: 184,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 80 184">
        <ellipse cx="40" cy="180" rx="32" ry="4" fill={PLUMB_SHADOW} />
        <rect x="8" y="8" width="64" height="166" rx="5" fill={STONE} />
        <path d="M72 14v154a6 6 0 0 1-6 6h-4a6 6 0 0 0 6-6V8a6 6 0 0 1 4 6z" fill={STONE_SHADE} />
        <rect x="4" y="4" width="72" height="8" rx="4" fill={STONE_SHADE} />
        <rect x="14" y="18" width="52" height="82" rx="3" fill="#e6f0ee" stroke={STONE_SHADE} strokeWidth="2" />
        <path d="M16 58h48" stroke={STONE_SHADE} strokeWidth="2" />
        <rect x="18" y="44" width="22" height="7" rx="3" fill={KITCHEN_BLUSH.body} />
        <rect x="18" y="51" width="22" height="7" rx="3" fill={KITCHEN_MINT.body} />
        <rect x="18" y="37" width="22" height="7" rx="3" fill={KITCHEN_BUTTER.body} />
        <rect x="44" y="46" width="18" height="12" rx="3" fill={KITCHEN_POWDER.body} />
        <rect x="18" y="90" width="44" height="8" rx="3" fill={KITCHEN_POWDER.body} />
        <rect x="20" y="82" width="40" height="8" rx="3" fill={KITCHEN_BLUSH.body} />
        <rect x="22" y="74" width="16" height="8" rx="3" fill={KITCHEN_BUTTER.body} />
        <path d="M20 30l14-10" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <rect x="14" y="108" width="52" height="58" rx="3" fill="none" stroke={STONE_SHADE} strokeWidth="2" />
        <circle cx="58" cy="136" r="3" fill={COPPER} />
        <rect x="12" y="172" width="10" height="6" rx="2" fill={WOOD_SHADE} />
        <rect x="58" y="172" width="10" height="6" rx="2" fill={WOOD_SHADE} />
      </svg>
    ),
  },
  {
    id: "vanity-mirror",
    width: 120,
    height: 100,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 120 100">
        {[14, 106].map((x) => (
          <g key={x}>
            <circle cx={x} cy="24" r="14" fill="#fff3cc" opacity="0.5" />
            <rect x={x - 4} y="32" width="8" height="20" rx="3" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="1" />
            <ellipse cx={x} cy="24" rx="7" ry="10" fill="#fbf3df" stroke={CHROME_EDGE} strokeWidth="1" />
          </g>
        ))}
        <circle cx="61.5" cy="51.5" r="38" fill={PLUMB_SHADOW} />
        <circle cx="60" cy="50" r="38" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="1.4" />
        <circle cx="60" cy="50" r="33" fill="#dfe9ea" />
        <path d="M40 42c3-9 10-15 19-17M42 58l22-22" stroke="white" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.8" />
      </svg>
    ),
  },
  {
    id: "pan-rail",
    width: 124,
    height: 90,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 124 90">
        <rect x="8" y="8" width="108" height="6" rx="3" fill={COPPER} />
        <path d="M12 9.5h100" stroke={COPPER_LIGHT} strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="8" cy="11" r="4" fill={COPPER} />
        <circle cx="116" cy="11" r="4" fill={COPPER} />
        {[24, 52, 82, 104].map((x) => (
          <path key={x} d={`M${x} 14c-4 2-4 6 0 8`} stroke={CHROME_EDGE} strokeWidth="1.6" fill="none" />
        ))}
        <rect x="22" y="22" width="4" height="26" rx="2" fill="#4a443e" />
        <circle cx="24" cy="64" r="16" fill={COPPER} />
        <circle cx="24" cy="64" r="11" fill="#a5633a" opacity="0.5" />
        <path d="M14 56c2-4 6-6 10-6" stroke={COPPER_LIGHT} strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M52 22v40" stroke={CHROME_EDGE} strokeWidth="3" strokeLinecap="round" />
        <path d="M44 62a8 8 0 0 0 16 0z" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="1" />
        <rect x="80" y="22" width="4" height="22" rx="2" fill="#4a443e" />
        <rect x="68" y="44" width="28" height="26" rx="4" fill={COPPER} />
        <rect x="66" y="42" width="32" height="5" rx="2.5" fill="#a5633a" />
        <path d="M72 50v14" stroke={COPPER_LIGHT} strokeWidth="2" strokeLinecap="round" />
        <path d="M104 22v26" stroke={WOOD_SHADE} strokeWidth="3" strokeLinecap="round" />
        <rect x="99" y="48" width="10" height="16" rx="3" fill={WOOD} />
      </svg>
    ),
  },
  {
    id: "cafe-window",
    width: 112,
    height: 104,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 112 104">
        <rect x="10" y="8" width="96" height="86" rx="4" fill={PLUMB_SHADOW} />
        <rect x="6" y="4" width="96" height="86" rx="4" fill="#fbf8f1" stroke={STONE_SHADE} strokeWidth="1.6" />
        <rect x="12" y="10" width="84" height="74" rx="2" fill="#d7e9ee" />
        <ellipse cx="34" cy="24" rx="10" ry="5" fill="white" opacity="0.9" />
        <ellipse cx="42" cy="21" rx="8" ry="5" fill="white" opacity="0.9" />
        <ellipse cx="76" cy="30" rx="8" ry="4" fill="white" opacity="0.8" />
        <path d="M54 10v74M12 42h84" stroke="#fbf8f1" strokeWidth="4" />
        {[12, 56].map((x) => (
          <g key={x}>
            <rect x={x} y="44" width="40" height="40" fill={KITCHEN_BLUSH.body} />
            {[6, 14, 22, 30].map((dx) => (
              <path key={`v${dx}`} d={`M${x + dx} 44v40`} stroke="white" strokeWidth="2.4" opacity="0.55" />
            ))}
            {[52, 60, 68, 76].map((y) => (
              <path key={`h${y}`} d={`M${x} ${y}h40`} stroke="white" strokeWidth="2.4" opacity="0.55" />
            ))}
          </g>
        ))}
        <rect x="2" y="41" width="104" height="3.4" rx="1.7" fill={COPPER} />
        <rect x="0" y="86" width="108" height="8" rx="3" fill={STONE} stroke={STONE_SHADE} strokeWidth="1" />
        <LittlePot x={84} y={88} pot={KITCHEN_MINT.body} rim={KITCHEN_MINT.side} leaf="#a3b88e" leafDark={SAGE_DARK} />
      </svg>
    ),
  },
  {
    id: "kettle",
    width: 80,
    height: 74,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 -24 80 74">
        <ellipse cx="40" cy="46" rx="30" ry="4" fill={PLUMB_SHADOW} />
        <path d="M58 22c8-4 12-12 14-18l4 2c-2 10-6 18-14 24z" fill={KITCHEN_BUTTER.side} />
        <path d="M24 12c0-18 32-18 32 0" stroke="#4a443e" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path d="M16 42c-2-20 8-32 24-32s26 12 24 32z" fill={KITCHEN_BUTTER.body} />
        <path d="M64 42c1-14-4-24-12-29 10 3 15 14 14 29z" fill={KITCHEN_BUTTER.side} />
        <rect x="16" y="38" width="48" height="4" rx="2" fill={KITCHEN_BUTTER.line} />
        <ellipse cx="40" cy="11" rx="14" ry="3.4" fill={KITCHEN_BUTTER.side} />
        <circle cx="40" cy="7" r="3.4" fill="#4a443e" />
        <path d="M22 32c0-8 4-14 10-17" stroke="white" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.7" />
        {[-5, 0, 5].map((dx, i) => (
          <circle key={dx} cx={42 + dx} cy={i === 1 ? 24 : 27} r="2.4" fill={i === 1 ? "#e39a82" : "#a3b88e"} />
        ))}
      </svg>
    ),
  },
  ...PEDAL_BINS.map(
    (k): Piece => ({
      id: `pedal-bin-${k.name}`,
      group: "pedal-bin",
      width: 64,
      height: 80,
      fits: ["B", "B2"],
      art: (
        <svg viewBox="0 -24 64 80">
          <ellipse cx="32" cy="52" rx="22" ry="4" fill={PLUMB_SHADOW} />
          <rect x="22" y="46" width="20" height="5" rx="2" fill={CHROME_EDGE} />
          <path d="M12 12h40l-3 36a4 4 0 0 1-4 4H19a4 4 0 0 1-4-4z" fill={k.body} />
          <path d="M52 12l-3 36a4 4 0 0 1-4 4h-4a4 4 0 0 0 4-4l3-36z" fill={k.side} />
          <path d="M14 22h36" stroke={k.line} strokeWidth="1.6" />
          <path d="M18 18l2 28" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.6" />
          <path d="M10 12c0-8 10-12 22-12s22 4 22 12z" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="1" />
          <rect x="10" y="10" width="44" height="4" rx="2" fill={CHROME_EDGE} />
          <path d="M18 6c4-3 8-4 12-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </svg>
      ),
    }),
  ),
  {
    id: "bath-scale",
    width: 90,
    height: 64,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 -24 90 64">
        <ellipse cx="45" cy="36" rx="38" ry="4" fill={PLUMB_SHADOW} />
        <rect x="10" y="12" width="70" height="22" rx="6" fill={KITCHEN_POWDER.body} />
        <path d="M80 18v10a6 6 0 0 1-6 6h-4a6 6 0 0 0 6-6V12a6 6 0 0 1 4 6z" fill={KITCHEN_POWDER.side} />
        <rect x="10" y="10" width="70" height="7" rx="3.5" fill="#e3eef3" />
        <rect x="34" y="18" width="22" height="13" rx="4" fill={CHROME} stroke={CHROME_EDGE} strokeWidth="1" />
        <rect x="37" y="20" width="16" height="8" rx="2" fill="#fbf6ec" />
        {[40, 43, 46, 49].map((x) => (
          <path key={x} d={`M${x} 20v2`} stroke="#8a8175" strokeWidth="0.9" />
        ))}
        <path d="M45 27l2-5" stroke="#c94a3c" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "herb-pots",
    width: 110,
    height: 80,
    fits: ["B", "B2"],
    art: (
      <svg viewBox="0 -24 110 80">
        <ellipse cx="55" cy="52" rx="46" ry="4" fill={PLUMB_SHADOW} />
        <rect x="10" y="44" width="90" height="6" rx="3" fill={WOOD} />
        <path d="M14 45.5h82" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
        <LittlePot x={30} y={44} pot={COPPER} rim={COPPER_LIGHT} leaf="#a3b88e" leafDark={SAGE_DARK} />
        <LittlePot x={55} y={44} pot={KITCHEN_MINT.body} rim={KITCHEN_MINT.side} leaf={SAGE} leafDark="#6f8a5e" />
        <LittlePot x={80} y={44} pot={KITCHEN_BUTTER.body} rim={KITCHEN_BUTTER.side} leaf="#a3b88e" leafDark={SAGE_DARK} trail />
      </svg>
    ),
  },
  {
    id: "pothos-stand",
    group: "plant",
    width: 84,
    height: 150,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 84 150">
        <ellipse cx="42" cy="146" rx="26" ry="4" fill={PLUMB_SHADOW} />
        <path d="M30 74 22 144M54 74l8 70M42 74v70" stroke={COPPER} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M26 110h32" stroke={COPPER} strokeWidth="2" />
        <ellipse cx="42" cy="74" rx="18" ry="3.4" fill={COPPER} />
        {[
          [28, 46, -60, true],
          [56, 46, 60, true],
          [34, 38, -30, false],
          [50, 36, 30, false],
          [42, 32, 0, true],
        ].map(([cx, cy, rot, dark]) => (
          <ellipse
            key={`${cx}-${cy}`}
            cx={cx as number}
            cy={cy as number}
            rx="6"
            ry="10"
            fill={dark ? SAGE_DARK : "#a3b88e"}
            transform={`rotate(${rot} ${cx} ${cy})`}
          />
        ))}
        <path d="M26 54h32l-4 18a4 4 0 0 1-4 3H34a4 4 0 0 1-4-3z" fill={KITCHEN_BLUSH.body} />
        <rect x="24" y="50" width="36" height="7" rx="3.5" fill={KITCHEN_BLUSH.side} />
        <path d="M27 58C14 74 14 100 20 124M57 58c12 14 12 34 6 52" stroke={SAGE_DARK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        {[
          [19, 76],
          [16, 92],
          [18, 108],
          [21, 122],
          [66, 74],
          [68, 90],
          [64, 106],
        ].map(([cx, cy], i) => (
          <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx="4.4" ry="6.4" fill={i % 2 ? SAGE_DARK : "#a3b88e"} />
        ))}
      </svg>
    ),
  },
];

const PIECES: Record<ThemeId, Piece[]> = {
  lights: [...LIGHTS, ...LIGHTS_MORE, ...LIGHTS_DEN, ...LIGHTS_LOUNGE],
  alarm: [...PA_ROOM, ...PA_MORE, ...PA_STUDIO, ...PA_OFFICE],
  fire: [...FIRE, ...FIRE_MORE, ...FIRE_STATION, ...FIRE_HALL],
  plumbing: [...PLUMBING, ...PLUMBING_MORE, ...PLUMBING_KITCHEN_BATH, ...PLUMBING_HOME],
};
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
 * Lower corners fill first so every room is anchored by furniture, then two
 * wall spots, the floor below the board, the last wall spot, and finally the
 * extra top and bottom spots that mobile hides.
 */
function slotOrder(next: () => number): Slot[] {
  const walls = shuffled(["T", "RT", "LT"] as const, next);
  return [...shuffled(["RB", "LB"] as const, next), walls[0]!, walls[1]!, "B", walls[2]!, ...shuffled(["T2", "B2"] as const, next)];
}

/** What one theme has shown so far, walking its levels in campaign order. */
interface History {
  step: number;
  lastKind: Map<string, number>;
  uses: Map<string, number>;
  lastPiece: Map<string, number>;
  previous: Set<string>;
  before: Set<string>;
}

const newHistory = (): History => ({ step: 0, lastKind: new Map(), uses: new Map(), lastPiece: new Map(), previous: new Set(), before: new Set() });

const LONG_AGO = 12;

/**
 * Each slot takes the kind this theme showed longest ago (never one from its
 * previous level), and within a kind the palette or variant used longest ago,
 * so sofas, fridges and plants rotate instead of the same few props returning.
 * Kinds with several variants come back sooner, since each visit looks new.
 */
function furnish(theme: ThemeId, seed: number, count: number, history: History): Placement[] {
  const next = random(seed * 2654435761);
  const kinds = new Map<string, Piece[]>();
  for (const piece of PIECES[theme]) kinds.set(kind(piece), [...(kinds.get(kind(piece)) ?? []), piece]);
  const taken = new Set<string>();
  const placed: Placement[] = [];
  for (const slot of slotOrder(next).slice(0, count)) {
    let best: { name: string; score: number } | undefined;
    for (const [name, variants] of kinds) {
      if (taken.has(name) || !variants.some((piece) => piece.fits.includes(slot))) continue;
      const gap = Math.min(history.step - (history.lastKind.get(name) ?? -LONG_AGO), LONG_AGO);
      const variety = Math.sqrt(Math.min(variants.length, 4));
      const score =
        (history.previous.has(name) ? 1000 : 0) +
        (history.before.has(name) ? 40 : 0) -
        gap * 10 * variety +
        (history.uses.get(name) ?? 0) * 3 +
        next() * 12;
      if (!best || score < best.score) best = { name, score };
    }
    if (!best) continue;
    const variants = kinds.get(best.name)!.filter((piece) => piece.fits.includes(slot));
    const oldest = Math.min(...variants.map((piece) => history.lastPiece.get(piece.id) ?? -1));
    const stale = variants.filter((piece) => (history.lastPiece.get(piece.id) ?? -1) === oldest);
    taken.add(best.name);
    placed.push({ piece: stale[Math.floor(next() * stale.length)]!, slot, offset: next() });
  }
  history.before = history.previous;
  history.previous = new Set(placed.map(({ piece }) => kind(piece)));
  for (const { piece } of placed) {
    history.lastKind.set(kind(piece), history.step);
    history.uses.set(kind(piece), (history.uses.get(kind(piece)) ?? 0) + 1);
    history.lastPiece.set(piece.id, history.step);
  }
  history.step++;
  return placed;
}

let campaignRooms: Map<number, Placement[]> | undefined;

function campaignRoom(level: number): Placement[] {
  if (!campaignRooms) {
    campaignRooms = new Map();
    const histories = new Map<ThemeId, History>();
    for (let id = 1; id <= LEVEL_COUNT; id++) {
      const theme = themeOf(id);
      const history = histories.get(theme) ?? newHistory();
      histories.set(theme, history);
      campaignRooms.set(id, furnish(theme, id, surroundingDensity(id).count, history));
    }
  }
  return campaignRooms.get(level)!;
}

/**
 * Campaign levels (seed === level) follow their theme's planned rotation;
 * any other seed, like the Daily, gets a fresh room of its own.
 */
export function arrange(theme: ThemeId, seed: number, level: number): Placement[] {
  if (seed === level && level >= 1 && level <= LEVEL_COUNT && themeOf(level) === theme) return campaignRoom(level);
  return furnish(theme, seed, surroundingDensity(level).count, newHistory());
}

export function Surroundings({ theme, seed, level }: { theme: ThemeId; seed: number; level: number }) {
  const { scale } = surroundingDensity(level);
  const placed = arrange(theme, seed, level);
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
