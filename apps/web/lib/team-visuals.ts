// FIFA code → ISO 3166-1 alpha-2 mapping for all 48 WC 2026 teams
const fifaToIsoCode: Record<string, string> = {
  // AFC
  AUS: "AU",
  IRN: "IR",
  IRQ: "IQ",
  JOR: "JO",
  JPN: "JP",
  KOR: "KR",
  KSA: "SA",
  QAT: "QA",
  UZB: "UZ",
  // CAF
  ALG: "DZ",
  CIV: "CI",
  COD: "CD",
  CPV: "CV",
  EGY: "EG",
  GHA: "GH",
  MAR: "MA",
  NGA: "NG",
  RSA: "ZA",
  SEN: "SN",
  TUN: "TN",
  // CONCACAF
  CAN: "CA",
  CUW: "CW",
  HAI: "HT",
  JAM: "JM",
  MEX: "MX",
  PAN: "PA",
  USA: "US",
  // CONMEBOL
  ARG: "AR",
  BOL: "BO",
  BRA: "BR",
  CHI: "CL",
  COL: "CO",
  ECU: "EC",
  PAR: "PY",
  PER: "PE",
  URU: "UY",
  VEN: "VE",
  // OFC
  NZL: "NZ",
  // UEFA
  AUT: "AT",
  BEL: "BE",
  BIH: "BA",
  CRO: "HR",
  CZE: "CZ",
  DEN: "DK",
  ENG: "GB",
  ESP: "ES",
  FRA: "FR",
  GER: "DE",
  HUN: "HU",
  ISL: "IS",
  ITA: "IT",
  NED: "NL",
  NOR: "NO",
  POL: "PL",
  POR: "PT",
  ROU: "RO",
  SCO: "GB",
  SRB: "RS",
  SUI: "CH",
  SVK: "SK",
  SVN: "SI",
  SWE: "SE",
  TUR: "TR",
  UKR: "UA",
  WAL: "GB",
};

function isoCodeToFlagEmoji(isoCode: string) {
  return isoCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export function getTeamIsoCode(fifaCode: string): string {
  return fifaToIsoCode[fifaCode.toUpperCase()] ?? "UN";
}

export function getTeamFlagEmoji(fifaCode: string): string {
  const iso = getTeamIsoCode(fifaCode);
  if (iso === "UN") return "🏳️";
  return isoCodeToFlagEmoji(iso);
}

// Returns a path to a local flag SVG if it exists, otherwise falls back to emoji.
// SVGs are downloaded by scripts/download_flags.sh to public/flags/{iso}.svg
export function getTeamFlagSvgPath(fifaCode: string): string | null {
  const iso = getTeamIsoCode(fifaCode);
  if (!iso || iso === "UN") return null;
  return `/flags/${iso.toLowerCase()}.svg`;
}

// Confederation colours used as accent gradients in team cards
export const confederationAccent: Record<string, string> = {
  UEFA:     "#00e5ff",
  CONMEBOL: "#d3f340",
  CONCACAF: "#ff9f1c",
  CAF:      "#ff007f",
  AFC:      "#a78bfa",
  OFC:      "#4ade80",
};
