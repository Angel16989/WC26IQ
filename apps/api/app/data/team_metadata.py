from dataclasses import dataclass
import re
import unicodedata


@dataclass(frozen=True)
class TeamMetadata:
    fifa_code: str
    confederation: str


TEAM_METADATA_BY_NAME: dict[str, TeamMetadata] = {
    "Argentina": TeamMetadata(fifa_code="ARG", confederation="CONMEBOL"),
    "Australia": TeamMetadata(fifa_code="AUS", confederation="AFC"),
    "Belgium": TeamMetadata(fifa_code="BEL", confederation="UEFA"),
    "Brazil": TeamMetadata(fifa_code="BRA", confederation="CONMEBOL"),
    "Cameroon": TeamMetadata(fifa_code="CMR", confederation="CAF"),
    "Canada": TeamMetadata(fifa_code="CAN", confederation="CONCACAF"),
    "Costa Rica": TeamMetadata(fifa_code="CRC", confederation="CONCACAF"),
    "Croatia": TeamMetadata(fifa_code="CRO", confederation="UEFA"),
    "Denmark": TeamMetadata(fifa_code="DEN", confederation="UEFA"),
    "Ecuador": TeamMetadata(fifa_code="ECU", confederation="CONMEBOL"),
    "England": TeamMetadata(fifa_code="ENG", confederation="UEFA"),
    "France": TeamMetadata(fifa_code="FRA", confederation="UEFA"),
    "Germany": TeamMetadata(fifa_code="GER", confederation="UEFA"),
    "Ghana": TeamMetadata(fifa_code="GHA", confederation="CAF"),
    "Iran": TeamMetadata(fifa_code="IRN", confederation="AFC"),
    "Japan": TeamMetadata(fifa_code="JPN", confederation="AFC"),
    "Mexico": TeamMetadata(fifa_code="MEX", confederation="CONCACAF"),
    "Morocco": TeamMetadata(fifa_code="MAR", confederation="CAF"),
    "Netherlands": TeamMetadata(fifa_code="NED", confederation="UEFA"),
    "Poland": TeamMetadata(fifa_code="POL", confederation="UEFA"),
    "Portugal": TeamMetadata(fifa_code="POR", confederation="UEFA"),
    "Qatar": TeamMetadata(fifa_code="QAT", confederation="AFC"),
    "Saudi Arabia": TeamMetadata(fifa_code="KSA", confederation="AFC"),
    "Senegal": TeamMetadata(fifa_code="SEN", confederation="CAF"),
    "Serbia": TeamMetadata(fifa_code="SRB", confederation="UEFA"),
    "South Korea": TeamMetadata(fifa_code="KOR", confederation="AFC"),
    "Spain": TeamMetadata(fifa_code="ESP", confederation="UEFA"),
    "Switzerland": TeamMetadata(fifa_code="SUI", confederation="UEFA"),
    "Tunisia": TeamMetadata(fifa_code="TUN", confederation="CAF"),
    "United States": TeamMetadata(fifa_code="USA", confederation="CONCACAF"),
    "Uruguay": TeamMetadata(fifa_code="URU", confederation="CONMEBOL"),
    "Wales": TeamMetadata(fifa_code="WAL", confederation="UEFA"),
}

TEAM_ALIASES = {
    "IR Iran": "Iran",
    "Iran, Islamic Republic of": "Iran",
    "Korea Republic": "South Korea",
    "Republic of Korea": "South Korea",
    "USA": "United States",
    "United States of America": "United States",
}

TEAM_METADATA_BY_CODE = {
    metadata.fifa_code: metadata for metadata in TEAM_METADATA_BY_NAME.values()
}


def normalise_text(value: str) -> str:
    ascii_value = (
        unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    )
    return re.sub(r"[^a-z0-9]+", "", ascii_value.lower())


NORMALISED_TEAM_NAME_LOOKUP = {
    normalise_text(name): metadata for name, metadata in TEAM_METADATA_BY_NAME.items()
}
NORMALISED_TEAM_ALIAS_LOOKUP = {
    normalise_text(alias): TEAM_METADATA_BY_NAME[canonical]
    for alias, canonical in TEAM_ALIASES.items()
}


def lookup_team_metadata(
    name: str | None, short_code: str | None = None
) -> TeamMetadata | None:
    if short_code:
        metadata = TEAM_METADATA_BY_CODE.get(short_code.upper())
        if metadata is not None:
            return metadata

    if not name:
        return None

    normalised_name = normalise_text(name)
    return NORMALISED_TEAM_NAME_LOOKUP.get(normalised_name) or NORMALISED_TEAM_ALIAS_LOOKUP.get(
        normalised_name
    )
