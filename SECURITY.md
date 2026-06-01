# Security

## Secret Handling

- Keep `GEMINI_API_KEY`, live-session tokens, robot credentials, and service
  account material out of source control.
- Store production secrets in the deployment platform's secret manager.
- Use `.env` only for local development, with values copied from
  `.env.example`.
- Never expose server secrets through Vite client variables or browser-delivered
  JavaScript.

## Key Rotation And Revocation

Rotate Gemini API keys and robot-control credentials whenever a maintainer
leaves the project, a deployment environment changes ownership, logs expose a
secret, or a scan reports a possible leak.

1. Create the replacement key or credential in the upstream provider.
2. Update the local server `.env` file or deployment secret manager.
3. Restart or redeploy the server so the new value is loaded.
4. Smoke test live-session creation and robot command dispatch.
5. Revoke the old key or credential in the upstream provider.
6. Review recent logs for authentication failures or unexpected traffic.

If a secret was committed, revoke it before rewriting history. History cleanup
can reduce accidental reuse, but revocation is the real containment step.

## Read-Only Secret Scans

Run these commands from the repository root. They report matching files without
printing the suspected secret values.

Current worktree scan:

```sh
rg --hidden --no-ignore -l --pcre2 -g '!.git' -g '!node_modules' -g '!dist' "(AIza[0-9A-Za-z_-]{35}|AKIA[0-9A-Z]{16}|ghp_[0-9A-Za-z_]{20,}|github_pat_[0-9A-Za-z_]{20,}|sk-[0-9A-Za-z_-]{20,}|xox[baprs]-[0-9A-Za-z-]{10,}|-----BEGIN (RSA |OPENSSH |EC |DSA |)?PRIVATE KEY-----)" .
```

Tracked-file scan:

```sh
git grep -I -l -E "(AIza[0-9A-Za-z_-]{35}|AKIA[0-9A-Z]{16}|ghp_[0-9A-Za-z_]{20,}|github_pat_[0-9A-Za-z_]{20,}|sk-[0-9A-Za-z_-]{20,}|xox[baprs]-[0-9A-Za-z-]{10,}|-----BEGIN (RSA |OPENSSH |EC |DSA |)?PRIVATE KEY-----)" -- .
```

Commit history scan without printing matched lines:

```sh
git rev-list --all | while read commit; do git grep -I -l -E "(AIza[0-9A-Za-z_-]{35}|AKIA[0-9A-Z]{16}|ghp_[0-9A-Za-z_]{20,}|github_pat_[0-9A-Za-z_]{20,}|sk-[0-9A-Za-z_-]{20,}|xox[baprs]-[0-9A-Za-z-]{10,}|-----BEGIN (RSA |OPENSSH |EC |DSA |)?PRIVATE KEY-----)" "$commit" -- . | sed "s#^#$commit #"; done
```

For deeper checks, run a dedicated scanner such as Gitleaks or TruffleHog in a
mode that redacts secrets from output.
