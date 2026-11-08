import type { CSSProperties, ReactNode } from "react";
import type { LookId } from "@/lib/path-connect/styles";

type Slot = "RT" | "RB" | "LT" | "LB" | "T" | "T2" | "B" | "B2";

interface Piece {
  id: string;
  width: number;
  height: number;
  fits: Slot[];
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

function Succulent({ pot, rim, leaf, leafDark, shadow }: { pot: string; rim: string; leaf: string; leafDark: string; shadow: string }) {
  return (
    <svg viewBox="0 0 64 72">
      <ellipse cx="32" cy="69" rx="22" ry="3" fill={shadow} />
      <path d="M32 40c-6-6-16-8-22-6 4 6 12 9 22 6z" fill={leafDark} />
      <path d="M32 40c6-6 16-8 22-6-4 6-12 9-22 6z" fill={leafDark} />
      <path d="M32 40c-6-8-8-18-4-26 6 6 7 16 4 26z" fill={leaf} />
      <path d="M32 40c6-8 8-18 4-26-6 6-7 16-4 26z" fill={leaf} />
      <path d="M17 40h30l-3 22a6 6 0 0 1-6 5H26a6 6 0 0 1-6-5z" fill={pot} />
      <rect x="14" y="36" width="36" height="8" rx="4" fill={rim} />
      <path d="M17 38.5h28" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.65" />
    </svg>
  );
}

const LIGHTS: Piece[] = [
  {
    id: "couch",
    width: 160,
    height: 120,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 160 120">
        <ellipse cx="86" cy="116" rx="70" ry="4" fill={SHADOW} />
        <rect x="6" y="14" width="124" height="62" rx="20" fill="#e2cdb2" />
        <path d="M18 18h100" stroke="#f2e5d3" strokeWidth="3" strokeLinecap="round" />
        <rect x="4" y="60" width="132" height="40" rx="14" fill="#d6bd9d" />
        <path d="M14 63h110" stroke="#ead9c2" strokeWidth="2.6" strokeLinecap="round" />
        <rect x="112" y="40" width="42" height="66" rx="18" fill="#dcc5a8" />
        <path d="M120 44c8-2 22-2 28 4" stroke="#f0e2cf" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M150 58v40" stroke="#c4a888" strokeWidth="3" strokeLinecap="round" />
        <rect x="16" y="100" width="7" height="14" rx="3" fill="#a7774f" />
        <rect x="140" y="100" width="7" height="14" rx="3" fill="#a7774f" />
      </svg>
    ),
  },
  {
    id: "floor-lamp",
    width: 96,
    height: 230,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 96 230" overflow="visible">
        <defs>
          <radialGradient id="pc-sur-lamp-glow">
            <stop offset="0" stopColor="#ffe6a6" stopOpacity="0.85" />
            <stop offset="1" stopColor="#ffe6a6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="44" r="78" fill="url(#pc-sur-lamp-glow)" />
        <ellipse cx="50" cy="226" rx="26" ry="4" fill={SHADOW} />
        <rect x="47" y="58" width="6" height="160" rx="3" fill="#b98a5a" />
        <path d="M48.6 62v150" stroke="#dcb487" strokeWidth="1.4" strokeLinecap="round" />
        <ellipse cx="50" cy="219" rx="22" ry="6" fill="#a87a4c" />
        <path d="M30 216.5h40" stroke="#c99c6c" strokeWidth="2" strokeLinecap="round" />
        <path d="M28 18h44l12 44H16z" fill="#f7e8c8" />
        <path d="M31 20 22 58" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        <path d="M16 62h68" stroke="#e6cfa4" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="50" cy="64" rx="26" ry="4" fill="#ffe9ad" opacity="0.9" />
      </svg>
    ),
  },
  {
    id: "plant",
    width: 90,
    height: 120,
    fits: ["RB", "LB", "B", "B2"],
    art: <Plant pot="#f2e6d5" rim="#e8d6bd" leaf="#93b47e" leafDark="#729760" />,
  },
  {
    id: "side-table",
    width: 120,
    height: 100,
    fits: ["B", "B2", "RB"],
    art: (
      <svg viewBox="0 0 120 100">
        <ellipse cx="60" cy="96" rx="42" ry="4" fill={SHADOW} />
        <rect x="55" y="44" width="10" height="46" rx="4" fill="#b58254" />
        <ellipse cx="60" cy="91" rx="24" ry="5" fill="#a87448" />
        <ellipse cx="60" cy="44" rx="52" ry="12" fill="#b98452" />
        <ellipse cx="60" cy="40" rx="52" ry="12" fill="#d29e68" />
        <path d="M18 36c14-6 46-8 70-4" stroke="#ebc08e" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <rect x="40" y="14" width="18" height="24" rx="5" fill="#f4ebdf" />
        <path d="M58 20c8 0 8 12 0 12" stroke="#e5d6c2" strokeWidth="3" fill="none" />
        <path d="M44 18v16" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <rect x="64" y="28" width="30" height="8" rx="2" fill="#c96f4c" />
        <rect x="66" y="21" width="26" height="7" rx="2" fill="#7f9d6e" />
      </svg>
    ),
  },
  {
    id: "sconce",
    width: 90,
    height: 100,
    fits: ["RT", "LT", "T", "T2"],
    art: (
      <svg viewBox="0 0 90 100" overflow="visible">
        <defs>
          <radialGradient id="pc-sur-sconce-glow">
            <stop offset="0" stopColor="#ffe3a0" stopOpacity="0.8" />
            <stop offset="1" stopColor="#ffe3a0" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="45" cy="52" r="62" fill="url(#pc-sur-sconce-glow)" />
        <rect x="37" y="58" width="16" height="30" rx="6" fill="#c89462" />
        <path d="M40 62v22" stroke="#e2b98a" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M45 58V46" stroke="#b07e4e" strokeWidth="4" strokeLinecap="round" />
        <path d="M28 14h34l8 34H20z" fill="#f8ebcf" />
        <path d="M30 17 24 44" stroke="white" strokeWidth="2.6" strokeLinecap="round" opacity="0.75" />
        <ellipse cx="45" cy="49" rx="25" ry="3.6" fill="#ffe7a8" />
      </svg>
    ),
  },
  {
    id: "armchair",
    width: 120,
    height: 120,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 120 120">
        <ellipse cx="62" cy="116" rx="50" ry="4" fill={SHADOW} />
        <rect x="14" y="14" width="86" height="70" rx="26" fill="#d8ab7e" />
        <path d="M28 20c18-4 42-4 58 0" stroke="#ecc79f" strokeWidth="3" strokeLinecap="round" fill="none" />
        <rect x="10" y="62" width="96" height="38" rx="14" fill="#c99668" />
        <rect x="84" y="44" width="30" height="60" rx="14" fill="#d3a275" />
        <path d="M90 48c6-1 16 0 20 4" stroke="#e8bf93" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <rect x="20" y="100" width="7" height="14" rx="3" fill="#8a5e3b" />
        <rect x="98" y="100" width="7" height="14" rx="3" fill="#8a5e3b" />
      </svg>
    ),
  },
  {
    id: "frame",
    width: 100,
    height: 84,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 100 84">
        <rect x="7" y="8" width="88" height="72" rx="8" fill={SHADOW} />
        <rect x="3" y="3" width="88" height="72" rx="8" fill="#c99a68" />
        <path d="M10 6h74" stroke="#e5bf91" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="11" y="11" width="72" height="56" rx="4" fill="#fbf1e1" />
        <path d="M11 54c14-14 24-16 36-6 10-10 22-10 36 0v13a6 6 0 0 1-6 6H17a6 6 0 0 1-6-6z" fill="#a9c08f" />
        <path d="M11 60c18-10 40-10 72 0v1a6 6 0 0 1-6 6H17a6 6 0 0 1-6-6z" fill="#8eab76" />
        <circle cx="62" cy="28" r="7" fill="#f2c56d" />
      </svg>
    ),
  },
  {
    id: "shelf",
    width: 130,
    height: 90,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 130 90">
        <rect x="6" y="52" width="118" height="10" rx="4" fill="#b98452" />
        <rect x="6" y="48" width="118" height="9" rx="4" fill="#d6a46f" />
        <path d="M12 50.5h104" stroke="#ecc596" strokeWidth="2" strokeLinecap="round" />
        <path d="M24 60v12M106 60v12" stroke="#a8784a" strokeWidth="5" strokeLinecap="round" />
        <rect x="16" y="20" width="10" height="28" rx="2" fill="#c96f4c" />
        <rect x="27" y="16" width="9" height="32" rx="2" fill="#7f9d6e" />
        <rect x="37" y="24" width="11" height="24" rx="2" fill="#e2b866" />
        <path d="M78 30h28l-3 16a4 4 0 0 1-4 3H85a4 4 0 0 1-4-3z" fill="#f2e6d5" />
        <path d="M92 30c-6-10-16-12-22-10 4 6 12 10 22 10z" fill="#93b47e" />
        <path d="M92 30c4-12 12-18 22-18-2 8-10 16-22 18z" fill="#729760" />
        <path d="M82 46c-4 10-6 20-4 30M100 46c4 8 6 18 4 26" stroke="#8aad74" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "succulent",
    width: 64,
    height: 72,
    fits: ["B", "B2", "RB"],
    art: <Succulent pot="#e9cfae" rim="#ddbf98" leaf="#9cbc84" leafDark="#7a9e66" shadow={SHADOW} />,
  },
];

const OFFICE: Piece[] = [
  {
    id: "desk",
    width: 170,
    height: 90,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 170 90">
        <ellipse cx="86" cy="86" rx="76" ry="4" fill="rgb(29 82 124 / 0.14)" />
        <rect x="14" y="30" width="8" height="54" rx="3" fill="#b5c6d6" />
        <rect x="148" y="30" width="8" height="54" rx="3" fill="#b5c6d6" />
        <rect x="4" y="22" width="162" height="14" rx="6" fill="#d9e4ee" />
        <rect x="4" y="18" width="162" height="12" rx="6" fill="#f4f8fb" />
        <path d="M12 20.5h146" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <rect x="36" y="8" width="60" height="9" rx="3" fill="#e2eaf1" />
        <path d="M40 11h52" stroke="#c4d2df" strokeWidth="1.4" strokeDasharray="3 2" />
        <rect x="110" y="0" width="16" height="18" rx="4" fill="#8ea9c2" />
        <path d="M126 5c6 0 6 9 0 9" stroke="#8ea9c2" strokeWidth="2.6" fill="none" />
      </svg>
    ),
  },
  {
    id: "monitor",
    width: 130,
    height: 120,
    fits: ["T", "T2", "RT"],
    art: (
      <svg viewBox="0 0 130 120">
        <ellipse cx="65" cy="116" rx="36" ry="4" fill="rgb(29 82 124 / 0.14)" />
        <rect x="58" y="80" width="14" height="28" rx="4" fill="#c3d1de" />
        <rect x="38" y="106" width="54" height="8" rx="4" fill="#b0c1d1" />
        <rect x="6" y="4" width="118" height="80" rx="12" fill="#dfe7ee" />
        <path d="M16 6.5h98" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="14" y="12" width="102" height="64" rx="6" fill="#3d5266" />
        <path d="M22 18 52 18 28 64" fill="#5d7690" opacity="0.5" />
        <rect x="24" y="24" width="30" height="5" rx="2.5" fill="#7fc8ea" opacity="0.8" />
        <rect x="24" y="34" width="46" height="4" rx="2" fill="#9fb7cd" opacity="0.6" />
        <rect x="24" y="43" width="38" height="4" rx="2" fill="#9fb7cd" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: "office-plant",
    width: 90,
    height: 120,
    fits: ["RB", "LB", "B", "B2"],
    art: <Plant pot="#f7fafc" rim="#dfe7ee" leaf="#8db58a" leafDark="#6c9a72" />,
  },
  {
    id: "chair",
    width: 100,
    height: 160,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 100 160">
        <ellipse cx="50" cy="155" rx="40" ry="4" fill="rgb(29 82 124 / 0.14)" />
        <rect x="20" y="6" width="60" height="70" rx="22" fill="#8ea9c2" />
        <path d="M32 12c12-3 26-3 36 0" stroke="#b4c9dc" strokeWidth="3" strokeLinecap="round" fill="none" />
        <rect x="12" y="78" width="76" height="22" rx="11" fill="#7f9bb5" />
        <path d="M20 81.5h60" stroke="#a8c0d5" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="46" y="100" width="8" height="34" rx="3" fill="#a9b9c8" />
        <path d="M16 142 50 132 84 142" stroke="#93a6b8" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="16" cy="146" r="5" fill="#6d8197" />
        <circle cx="84" cy="146" r="5" fill="#6d8197" />
        <circle cx="50" cy="140" r="5" fill="#6d8197" />
      </svg>
    ),
  },
  {
    id: "desk-lamp",
    width: 90,
    height: 110,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 90 110" overflow="visible">
        <defs>
          <radialGradient id="pc-sur-desk-glow">
            <stop offset="0" stopColor="#e9f7ff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#e9f7ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="62" cy="54" r="48" fill="url(#pc-sur-desk-glow)" />
        <ellipse cx="34" cy="104" rx="26" ry="5" fill="#a9bccd" />
        <ellipse cx="34" cy="101" rx="26" ry="5" fill="#c6d4e1" />
        <path d="M34 98 22 56 58 26" stroke="#b8c7d5" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="22" cy="56" r="5" fill="#9fb3c6" />
        <path d="M50 14l26 16-12 18-26-16z" fill="#8ea9c2" />
        <path d="M53 17l20 12" stroke="#b4c9dc" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M64 48 38 32" stroke="#f2fbff" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "clock",
    width: 84,
    height: 84,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 84 84">
        <circle cx="44" cy="45" r="36" fill="rgb(29 82 124 / 0.12)" />
        <circle cx="42" cy="42" r="36" fill="#8ea9c2" />
        <path d="M14 30a30 30 0 0 1 24-22" stroke="#b6cbdd" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="42" cy="42" r="29" fill="#f7fafc" />
        {[0, 90, 180, 270].map((angle) => (
          <rect key={angle} x="40.5" y="16" width="3" height="7" rx="1.5" fill="#9fb3c6" transform={`rotate(${angle} 42 42)`} />
        ))}
        <path d="M42 42V25M42 42l11 7" stroke="#3d5266" strokeWidth="3" strokeLinecap="round" />
        <circle cx="42" cy="42" r="3" fill="#3db7e8" />
      </svg>
    ),
  },
  {
    id: "pinboard",
    width: 120,
    height: 86,
    fits: ["T", "T2", "RT", "LT"],
    art: (
      <svg viewBox="0 0 120 86">
        <rect x="7" y="8" width="108" height="74" rx="8" fill="rgb(29 82 124 / 0.12)" />
        <rect x="3" y="3" width="108" height="74" rx="8" fill="#c8d5e1" />
        <path d="M10 6h94" stroke="#e7eef4" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="10" y="10" width="94" height="60" rx="4" fill="#e8dcc6" />
        <rect x="18" y="18" width="24" height="22" rx="2" fill="#fff4b8" transform="rotate(-4 30 29)" />
        <rect x="50" y="16" width="22" height="20" rx="2" fill="#bfe6f7" transform="rotate(3 61 26)" />
        <rect x="78" y="22" width="18" height="30" rx="2" fill="white" />
        <rect x="30" y="44" width="30" height="18" rx="2" fill="#d3e9cf" transform="rotate(2 45 53)" />
        {[[30, 19], [61, 17], [87, 23], [45, 45]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.4" fill="#3d7eab" />
        ))}
      </svg>
    ),
  },
  {
    id: "desk-succulent",
    width: 64,
    height: 72,
    fits: ["B", "B2", "RB"],
    art: <Succulent pot="#f7fafc" rim="#dfe7ee" leaf="#8db58a" leafDark="#6c9a72" shadow="rgb(29 82 124 / 0.14)" />,
  },
];

function Block({ x, letter, ink }: { x: number; letter: string; ink: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="0" y="14" width="56" height="56" rx="10" fill="#d9ad7c" />
      <rect x="0" y="10" width="56" height="54" rx="10" fill="#ecc797" />
      <path d="M8 13h40" stroke="#f8e2c2" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="9" y="18" width="38" height="38" rx="7" fill="#f6e3c8" />
      <text x="28" y="48" textAnchor="middle" fontSize="30" fontWeight="800" fill={ink} fontFamily="inherit">
        {letter}
      </text>
    </g>
  );
}

const SCHOOL: Piece[] = [
  {
    id: "blocks",
    width: 130,
    height: 80,
    fits: ["B", "B2", "RB"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 130 80">
        <ellipse cx="65" cy="76" rx="60" ry="4" fill="rgb(163 45 40 / 0.14)" />
        <Block x={4} letter="A" ink="#d9503f" />
        <Block x={68} letter="B" ink="#4a86c4" />
      </svg>
    ),
  },
  {
    id: "number",
    width: 80,
    height: 90,
    fits: ["B", "B2", "RB"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 80 90">
        <ellipse cx="40" cy="86" rx="28" ry="4" fill="rgb(163 45 40 / 0.14)" />
        <text x="42" y="82" textAnchor="middle" fontSize="88" fontWeight="800" fill="#c98f58" fontFamily="inherit">
          3
        </text>
        <text x="40" y="78" textAnchor="middle" fontSize="88" fontWeight="800" fill="#e8bd86" fontFamily="inherit">
          3
        </text>
      </svg>
    ),
  },
  {
    id: "poster",
    width: 110,
    height: 110,
    fits: ["T", "T2", "RT"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 110 110">
        <rect x="8" y="10" width="96" height="96" rx="10" fill="rgb(163 45 40 / 0.12)" />
        <rect x="4" y="4" width="96" height="96" rx="10" fill="#d9a66b" />
        <path d="M12 7h80" stroke="#efc996" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="13" y="13" width="78" height="78" rx="5" fill="#fff4e6" />
        <circle cx="52" cy="52" r="15" fill="#f29a48" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <rect key={angle} x="50" y="24" width="4" height="9" rx="2" fill="#f29a48" transform={`rotate(${angle} 52 52)`} />
        ))}
        <circle cx="47" cy="47" r="4" fill="#f8bd7c" />
      </svg>
    ),
  },
  {
    id: "locker",
    width: 80,
    height: 220,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 80 220">
        <ellipse cx="40" cy="216" rx="36" ry="4" fill="rgb(163 45 40 / 0.14)" />
        <rect x="4" y="4" width="72" height="210" rx="8" fill="#e9b4a6" />
        <path d="M10 7h60" stroke="#f6d4ca" strokeWidth="2.6" strokeLinecap="round" />
        <rect x="11" y="12" width="58" height="194" rx="5" fill="#efc2b5" />
        {[24, 32, 40, 48].map((y) => (
          <rect key={y} x="22" y={y} width="36" height="3.4" rx="1.7" fill="#d79a8b" />
        ))}
        <rect x="56" y="98" width="6" height="26" rx="3" fill="#c9877a" />
        <path d="M14 16v184" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: "pencils",
    width: 70,
    height: 100,
    fits: ["B", "B2", "RB", "LB"],
    art: (
      <svg viewBox="0 0 70 100">
        <ellipse cx="35" cy="96" rx="24" ry="4" fill="rgb(163 45 40 / 0.14)" />
        {[
          [18, -10, "#4a86c4"],
          [30, -3, "#f0b429"],
          [42, 6, "#d9503f"],
          [52, 14, "#7fae6a"],
        ].map(([x, angle, color]) => (
          <g key={String(color)} transform={`rotate(${angle} ${x} 56)`}>
            <rect x={Number(x) - 3.5} y="8" width="7" height="50" rx="2" fill={String(color)} />
            <path d={`M${Number(x) - 3.5} 8l3.5-7 3.5 7z`} fill="#f3d9b5" />
          </g>
        ))}
        <path d="M14 44h42l-4 46a6 6 0 0 1-6 5H24a6 6 0 0 1-6-5z" fill="#f3c9bd" />
        <rect x="11" y="40" width="48" height="9" rx="4.5" fill="#e9b4a6" />
        <path d="M14 42.5h40" stroke="#fbe2da" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M22 54l3 34" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: "letter-c",
    width: 66,
    height: 76,
    fits: ["B", "B2", "RB", "LB"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 66 76">
        <ellipse cx="33" cy="73" rx="28" ry="3" fill="rgb(163 45 40 / 0.14)" />
        <Block x={5} letter="C" ink="#7fae6a" />
      </svg>
    ),
  },
  {
    id: "abc-poster",
    width: 130,
    height: 88,
    fits: ["T", "T2", "RT", "LT"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 130 88">
        <rect x="7" y="8" width="118" height="76" rx="8" fill="rgb(163 45 40 / 0.12)" />
        <rect x="3" y="3" width="118" height="76" rx="8" fill="#f3c9bd" />
        <path d="M10 6h104" stroke="#fbe2da" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="10" y="10" width="104" height="62" rx="4" fill="#fff7f0" />
        {[
          ["A", 30, "#d9503f"],
          ["B", 62, "#4a86c4"],
          ["C", 94, "#7fae6a"],
        ].map(([letter, x, ink]) => (
          <text key={String(letter)} x={Number(x)} y="54" textAnchor="middle" fontSize="34" fontWeight="800" fill={String(ink)} fontFamily="inherit">
            {letter}
          </text>
        ))}
        <path d="M20 62h84" stroke="#f0d4cb" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "number-7",
    width: 70,
    height: 84,
    fits: ["B", "B2", "LB"],
    noFlip: true,
    art: (
      <svg viewBox="0 0 70 84">
        <ellipse cx="35" cy="80" rx="24" ry="4" fill="rgb(163 45 40 / 0.14)" />
        <text x="37" y="78" textAnchor="middle" fontSize="80" fontWeight="800" fill="#b8566a" fontFamily="inherit">
          7
        </text>
        <text x="35" y="74" textAnchor="middle" fontSize="80" fontWeight="800" fill="#e89aa8" fontFamily="inherit">
          7
        </text>
      </svg>
    ),
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
    id: "fridge",
    width: 92,
    height: 200,
    fits: ["RB", "LB"],
    art: (
      <svg viewBox="0 0 92 200">
        <ellipse cx="46" cy="196" rx="40" ry="4" fill={PLUMB_SHADOW} />
        <path d="M8 40a38 30 0 0 1 76 0v146a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6z" fill="#cfe3d6" />
        <path d="M84 40v146a6 6 0 0 1-6 6h-8a6 6 0 0 0 6-6V40c0-14-8-24-20-28 16 2 28 14 28 28z" fill="#b2cdbb" />
        <path d="M14 44c0-14 10-26 26-30" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M10 88h72" stroke="#9fbcaa" strokeWidth="2" />
        <rect x="64" y="52" width="7" height="26" rx="3.5" fill="#e9e6df" stroke="#b7b2a6" strokeWidth="1" />
        <rect x="64" y="100" width="7" height="34" rx="3.5" fill="#e9e6df" stroke="#b7b2a6" strokeWidth="1" />
        <rect x="30" y="24" width="32" height="7" rx="3.5" fill="#eae6dc" />
        <path d="M14 96v84" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity="0.45" />
        <rect x="14" y="186" width="10" height="8" rx="2" fill="#9a9488" />
        <rect x="68" y="186" width="10" height="8" rx="2" fill="#9a9488" />
      </svg>
    ),
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

const PIECES: Record<LookId, Piece[]> = { lights: LIGHTS, alarm: OFFICE, fire: SCHOOL, plumbing: PLUMBING };
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
  if (level >= 15) return { count: 6, scale: 1.18 };
  if (level >= 8) return { count: 5, scale: 1.12 };
  if (level >= 4) return { count: 4, scale: 1.06 };
  return { count: 3, scale: 1 };
}

export interface Placement {
  piece: Piece;
  slot: Slot;
  offset: number;
}

export function arrange(theme: LookId, seed: number, count: number): Placement[] {
  const next = random(seed * 2654435761);
  const used = new Set<Slot>();
  const placed: Placement[] = [];
  const order = shuffled(SLOTS, next);
  for (const piece of shuffled(PIECES[theme], next)) {
    if (placed.length >= count) break;
    const slot = order.find((candidate) => piece.fits.includes(candidate) && !used.has(candidate));
    if (!slot) continue;
    used.add(slot);
    placed.push({ piece, slot, offset: next() });
  }
  return placed;
}

export function Surroundings({ theme, seed, level }: { theme: LookId; seed: number; level: number }) {
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
