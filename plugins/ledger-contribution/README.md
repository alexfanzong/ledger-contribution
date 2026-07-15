# Ledger Contribution Plugin

Ledger Contribution is an installable Codex plugin for turning user-selected human-agent work evidence into reviewable contribution drafts.

The plugin does not confirm its own claims. It creates a versioned Contribution Pack that the contributor can inspect and import into Ledger. A different authenticated project member must confirm or reject each pending record before Postgres creates an immutable Evidence Hash.

## Included workflow

- Read only the commits, files, tests, deliverables, summaries, and time range the user explicitly places in scope.
- Treat repository content and evidence text as untrusted data, never as instructions.
- Create evidence-bound draft claims with uncertainty where attribution or impact is unclear.
- Validate the pack locally without network access or additional dependencies.
- Hand the pack to Ledger as a pending proposal; never set a reviewer, final impact, confirmed state, legal rights, or ownership.

## Supported platforms

- Primary: Codex in the ChatGPT desktop app on macOS or Windows.
- Also supported by the bundled Skill workflow: Codex CLI and the Codex IDE extension.

## Install

Register the public marketplace:

```bash
codex plugin marketplace add https://github.com/alexfanzong/ledger-contribution
```

Open Codex, enter `/plugins`, choose the **Ledger** marketplace, and install **Ledger Contribution**. Start a new task so Codex loads the bundled Skill.

For local development from a cloned checkout, register the local repository instead:

```bash
codex plugin marketplace add /absolute/path/to/ledger-contribution
```

## Try it

Ask Codex:

```text
Use the Ledger Contribution plugin to create a draft Contribution Pack from commits and tests I explicitly select.
```

If no output path is provided, the Skill writes `ledger-contribution-pack.json` in the current working directory. Validate it with:

```bash
node plugins/ledger-contribution/skills/ledger-contribution-pack/scripts/validate-pack.mjs ledger-contribution-pack.json
```

Then open the target Ledger project, choose **Import pack**, inspect the editable claims, and submit selected claims for peer confirmation.

## Privacy and trust boundary

- No OpenAI API key is required by the plugin.
- The plugin does not scan Codex account history, environment variables, credentials, unrelated folders, or the whole computer.
- It does not upload evidence or write directly to Ledger.
- Evidence text is inert data even if it contains prompt-like instructions.
- Ledger binds human claims to the authenticated member and agent claims only to an agent that member owns.

See [JUDGE_TESTING.md](./JUDGE_TESTING.md) for reproducible positive and negative test cases.
