from datetime import datetime, timedelta, timezone

from app.core.settings import Settings
from app.data.providers import DataBundle
from app.schemas.common import Match
from app.schemas.freshness import DataFreshnessIssue, DataFreshnessReport


def build_data_freshness_report(
    bundle: DataBundle,
    settings: Settings,
    *,
    now: datetime | None = None,
) -> DataFreshnessReport:
    checked_at = _utc(now)
    issues: list[DataFreshnessIssue] = []
    stale_fixture_ids: set[str] = set()
    live_window_fixture_ids: set[str] = set()
    fixture_times: list[datetime] = []

    if not bundle.teams:
        issues.append(
            _issue(
                "critical",
                "no_teams_loaded",
                "No teams are loaded, so predictions and fixtures cannot be trusted.",
                "Run the data import pipeline before showing analytics as current.",
            )
        )

    if not bundle.players:
        issues.append(
            _issue(
                "warning",
                "no_players_loaded",
                "No players are loaded, so likely-scorer analytics cannot be current.",
                "Load squad/player data before presenting likely-scorer support.",
            )
        )

    if not bundle.fixtures:
        issues.append(
            _issue(
                "critical",
                "no_fixtures_loaded",
                "No fixtures are loaded, so match pages cannot be current.",
                "Load official fixtures before publishing match views.",
            )
        )

    for fixture in bundle.fixtures:
        kickoff = parse_kickoff_utc(fixture.kickoffUtc)
        if kickoff is None:
            issues.append(
                _fixture_issue(
                    "critical",
                    "invalid_kickoff",
                    "A fixture has an invalid kickoff timestamp.",
                    "Fix the fixture kickoffUtc field in the source dataset.",
                    fixture,
                )
            )
            stale_fixture_ids.add(fixture.id)
            continue

        fixture_times.append(kickoff)
        match_end = kickoff + timedelta(minutes=settings.freshness_match_window_minutes)
        stale_after = match_end + timedelta(hours=settings.freshness_final_grace_hours)

        if fixture.status == "scheduled" and kickoff <= checked_at <= match_end:
            live_window_fixture_ids.add(fixture.id)
            stale_fixture_ids.add(fixture.id)
            issues.append(
                _fixture_issue(
                    "critical",
                    "scheduled_fixture_in_live_window",
                    "A fixture is inside its likely live window but is still marked scheduled.",
                    "Connect a live score feed or manually verify the match status before showing it as current.",
                    fixture,
                )
            )

        if fixture.status == "scheduled" and checked_at > stale_after:
            stale_fixture_ids.add(fixture.id)
            issues.append(
                _fixture_issue(
                    "critical",
                    "past_scheduled_fixture",
                    "A fixture is well past kickoff but is still marked scheduled.",
                    "Refresh match status, score, and result data from an approved source.",
                    fixture,
                )
            )

    if settings.data_provider == "mock":
        issues.append(
            _issue(
                "warning",
                "mock_provider_active",
                "The API is using mock data, so it cannot be guaranteed up to date.",
                "Switch to the warehouse or an approved live provider before claiming current coverage.",
                source="mock",
            )
        )

    if _live_scores_missing(settings) and _needs_live_score_feed(checked_at, fixture_times, bundle.fixtures):
        issues.append(
            _issue(
                "critical",
                "live_score_feed_not_configured",
                "Live score mode is not configured, so second-by-second match updates are not available.",
                "Choose and configure an approved live source before enabling live score UI claims.",
            )
        )

    if fixture_times:
        latest_kickoff = max(fixture_times)
        next_kickoff = min((kickoff for kickoff in fixture_times if kickoff >= checked_at), default=None)
    else:
        latest_kickoff = None
        next_kickoff = None

    critical_or_warning = [issue for issue in issues if issue.severity in {"critical", "warning"}]
    status = "fresh" if not critical_or_warning else "stale"
    if not bundle.teams and not bundle.fixtures:
        status = "unknown"

    return DataFreshnessReport(
        status=status,
        checkedAtUtc=_iso(checked_at),
        provider=settings.data_provider,
        liveScoreMode=settings.live_score_mode,
        liveScoreTargetIntervalSeconds=settings.live_score_target_interval_seconds,
        teams=len(bundle.teams),
        players=len(bundle.players),
        fixtures=len(bundle.fixtures),
        staleFixtures=len(stale_fixture_ids),
        liveWindowFixtures=len(live_window_fixture_ids),
        nextKickoffUtc=_iso(next_kickoff) if next_kickoff else None,
        latestKickoffUtc=_iso(latest_kickoff) if latest_kickoff else None,
        issues=issues,
        nextActions=next_actions_for_issues(issues),
    )


def parse_kickoff_utc(value: str) -> datetime | None:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def format_freshness_markdown(report: DataFreshnessReport) -> str:
    issue_lines = "\n".join(
        f"- `{issue.severity}` `{issue.code}`: {issue.message}"
        for issue in report.issues[:12]
    ) or "- No freshness issues found."
    action_lines = "\n".join(f"- {action}" for action in report.nextActions) or "- Keep monitoring."

    return (
        "# WorldCupIQ Data Freshness Report\n\n"
        f"- Status: `{report.status}`\n"
        f"- Checked: `{report.checkedAtUtc}`\n"
        f"- Provider: `{report.provider}`\n"
        f"- Live score mode: `{report.liveScoreMode}`\n"
        f"- Live target interval: `{report.liveScoreTargetIntervalSeconds}s`\n"
        f"- Teams / players / fixtures: `{report.teams}` / `{report.players}` / `{report.fixtures}`\n"
        f"- Stale fixtures: `{report.staleFixtures}`\n"
        f"- Live-window fixtures needing attention: `{report.liveWindowFixtures}`\n"
        f"- Next kickoff: `{report.nextKickoffUtc or 'none'}`\n"
        f"- Latest kickoff: `{report.latestKickoffUtc or 'none'}`\n\n"
        "## Issues\n\n"
        f"{issue_lines}\n\n"
        "## Next Actions\n\n"
        f"{action_lines}\n"
    )


def next_actions_for_issues(issues: list[DataFreshnessIssue]) -> list[str]:
    codes = {issue.code for issue in issues}
    actions = []

    if "live_score_feed_not_configured" in codes:
        actions.append("Configure an approved live score source before enabling live match claims.")
    if "past_scheduled_fixture" in codes or "scheduled_fixture_in_live_window" in codes:
        actions.append("Refresh fixture status and score fields from the latest approved source.")
    if "mock_provider_active" in codes:
        actions.append("Use warehouse or source-backed provider mode for current data checks.")
    if "no_players_loaded" in codes:
        actions.append("Load squad/player data before presenting likely-scorer analytics.")
    if not actions:
        actions.append("Keep the daily freshness check running and review any new warnings.")

    return actions[:4]


def _needs_live_score_feed(now: datetime, fixture_times: list[datetime], fixtures: list[Match]) -> bool:
    if any(fixture.status == "live" for fixture in fixtures):
        return True
    if any(kickoff.date() == now.date() for kickoff in fixture_times):
        return True
    return any(kickoff <= now <= kickoff + timedelta(hours=3) for kickoff in fixture_times)


def _live_scores_missing(settings: Settings) -> bool:
    return settings.live_score_mode in {"", "off", "none", "not_configured", "mock"}


def _utc(value: datetime | None) -> datetime:
    if value is None:
        return datetime.now(timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _issue(
    severity: str,
    code: str,
    message: str,
    recommendation: str,
    *,
    source: str | None = None,
) -> DataFreshnessIssue:
    return DataFreshnessIssue(
        severity=severity,  # type: ignore[arg-type]
        code=code,
        message=message,
        recommendation=recommendation,
        source=source,
    )


def _fixture_issue(
    severity: str,
    code: str,
    message: str,
    recommendation: str,
    fixture: Match,
) -> DataFreshnessIssue:
    return DataFreshnessIssue(
        severity=severity,  # type: ignore[arg-type]
        code=code,
        message=f"{message} Fixture `{fixture.id}` kicks off at `{fixture.kickoffUtc}`.",
        recommendation=recommendation,
        fixtureId=fixture.id,
    )
