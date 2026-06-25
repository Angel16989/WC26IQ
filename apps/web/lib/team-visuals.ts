const fifaToIsoCode: Record<string, string> = {
  ARG: "AR",
  AUS: "AU",
  BEL: "BE",
  BRA: "BR",
  CAN: "CA",
  CMR: "CM",
  CRC: "CR",
  CRO: "HR",
  DEN: "DK",
  ECU: "EC",
  ENG: "GB",
  ESP: "ES",
  FRA: "FR",
  GER: "DE",
  GHA: "GH",
  IRN: "IR",
  JPN: "JP",
  KOR: "KR",
  KSA: "SA",
  MAR: "MA",
  MEX: "MX",
  NED: "NL",
  POL: "PL",
  POR: "PT",
  QAT: "QA",
  SEN: "SN",
  SRB: "RS",
  SUI: "CH",
  TUN: "TN",
  URU: "UY",
  USA: "US",
  WAL: "GB",
};

function isoCodeToFlagEmoji(isoCode: string) {
  return isoCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export function getTeamIsoCode(fifaCode: string) {
  return fifaToIsoCode[fifaCode.toUpperCase()] ?? fifaCode.slice(0, 2).toUpperCase();
}

export function getTeamFlagEmoji(fifaCode: string) {
  return isoCodeToFlagEmoji(getTeamIsoCode(fifaCode));
}
