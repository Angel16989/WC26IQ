# Stitch MCP Setup

Use this when your MCP client needs a remote HTTP MCP server for Google Stitch.

## Before you paste the config

1. Create or choose a Google Cloud project.
2. Enable the Stitch API:

```bash
gcloud config set project YOUR_PROJECT_ID
gcloud services enable stitch.googleapis.com
```

3. Create your Stitch API key in Google Cloud.
4. Restrict the key if possible.

## Copy-paste config: `serverUrl` shape

Use this if your MCP client expects `serverUrl`.

```json
{
  "mcpServers": {
    "stitch": {
      "serverUrl": "https://stitch.googleapis.com/mcp",
      "headers": {
        "X-Goog-Api-Key": "PASTE_YOUR_API_KEY_HERE"
      }
    }
  }
}
```

## Copy-paste config: `httpUrl` shape

Use this if your MCP client expects `httpUrl`.

```json
{
  "mcpServers": {
    "stitch": {
      "httpUrl": "https://stitch.googleapis.com/mcp",
      "headers": {
        "X-Goog-Api-Key": "PASTE_YOUR_API_KEY_HERE"
      },
      "timeout": 30000
    }
  }
}
```

## Optional shell variable

If you want to keep the key out of copied JSON while testing from a shell:

```bash
export STITCH_API_KEY='PASTE_YOUR_API_KEY_HERE'
echo "$STITCH_API_KEY"
```

Do not commit a real API key into this repo.

## Optional project header

Some Google MCP setups also use the project header below:

```json
{
  "x-goog-user-project": "YOUR_PROJECT_ID"
}
```

If your client supports it, the full header block would become:

```json
{
  "headers": {
    "X-Goog-Api-Key": "PASTE_YOUR_API_KEY_HERE",
    "x-goog-user-project": "YOUR_PROJECT_ID"
  }
}
```

## How to verify

1. Save the MCP config.
2. Restart the MCP client so it reloads the Stitch config.
3. Run `codex mcp get stitch` and confirm the URL is `https://stitch.googleapis.com/mcp`.
4. Call the Stitch tool `mcp__stitch.list_projects`.

If `mcp__stitch.list_projects` returns your projects, the setup is working.

`codex mcp list` may still show `Auth: Unsupported` when you use a custom header, but that does not mean Stitch failed if the real tool call succeeds.

## If your client is ChatGPT, Claude, or Gemini CLI

Some clients prefer Google OAuth or ADC instead of a raw API key.

- ChatGPT app-style setup usually uses Google OAuth client ID and client secret.
- Claude custom connector setup usually uses Google OAuth client ID and client secret.
- Gemini CLI official setup usually uses Google Application Default Credentials.

So if the API key config fails in one of those clients, the next thing to try is OAuth or ADC, not a different Stitch URL.
