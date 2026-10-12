# Local Windows / Codex Cloud workflow

One product, one Git repository, separate working copies. The owner's Windows
checkout remains the local development source; the Linux Cloud checkout works
on task branches of the same repository. Neither GitHub changes nor Cloud task
results automatically change local files, built packages or the personal install.

## Reported integration status — 2026-10-12

The owner reports that the repository is connected to Codex Cloud, a separate
Linux environment has been published, its Installation Script and Start-Skill
have been configured, and iPhone access works while the PC is off. They report
129 tests passed and 17 Windows-specific tests skipped. This session did not
inspect the Cloud environment, scripts, task logs or tested commit, and did not
reproduce those tests. These numbers are historical user-reported evidence, not
a current test baseline or clean Windows/iPhone acceptance.

Record the environment revision, Node/tool versions, tested commit and detailed
test report when available. Do not export credentials or private environment
configuration to document this setup. An environment-only script/Start-Skill
change is not necessarily a repository commit; record which was changed and
whether the version-controlled instructions need alignment. If environment
instructions contradict AGENTS.md or isolation rules, stop and reconcile them.

## Before work

1. Read AGENTS.md, PROJECT-STATUS.md, CHANGELOG.md, docs/ROADMAP.md and this guide.
   Inspect status, current branch/HEAD, upstream and pending work in that checkout.
2. Identify the task owner, exact starting commit, branch, intended paths and
   platform. Inspect local locks without deleting or expiring another owner's
   lock. The ignored `.local/work-lock.json` is **local only**, not a distributed
   lock; copies and Cloud sessions do not share it.
3. Agree on non-overlapping work. Parallel tasks must use distinct branches and
   avoid editing the same paths. Coordinate shared catalogs, lockfiles, manifests
   and status documents too. Branch isolation does not prevent semantic conflicts.
4. Use a separate Cloud task branch, such as `cloud/<task-slug>`, from an agreed
   reviewed commit. Do not start from stale main or write directly to main by
   default. Branch creation/publication must be within that task's authorization.

## GitHub-to-local synchronization

- Report branch and exact result commit/PR; a chat summary is not a Git transfer.
- With separate synchronization authorization, first check for existing edits
  and local-only commits; inspect the remote refs and review the proposed diff.
  Updating remote refs with fetch does not itself update working files.
- A clean, non-diverged local main may be advanced by an explicitly authorized
  fast-forward. If histories diverge, inspect both sides and choose a reviewed
  integration branch; do not blindly pull, reset, force-push or overwrite files.
  Preserve uncommitted work; do not stash/rebase someone else's work automatically.
- Review Cloud results through a PR before integration. Resolving text conflicts
  is not enough: check behavior, dependency integrity and platform boundaries.
- Run the relevant local Windows checks on the integrated commit. Record the
  resulting commit separately from the Cloud-tested commit. Existing packages
  remain tied to their recorded source commit and hashes until rebuilt.

The local development conversation does not push or publish releases. The
publication conversation handles authorized GitHub integration/publication.
Cloud development authorization does not authorize binary releases, personal
deployment, secrets uploads or unrelated workflow dispatches.

## Platform and safety rules

Use the reviewed lockfile and dependency lifecycle policy (`npm ci --ignore-scripts
--no-audit --no-fund`), the isolated test suite and source gate. On Windows use
`npm.cmd` when PowerShell blocks npm.ps1. Missing dependencies or adapters must
fail explicitly, never silently load personal installation state.

- **Linux Cloud:** validate platform-neutral logic and applicable isolated tests;
  report every skip and reason. Do not hide Windows failures by adding broad skips
  or changing product behavior merely to make Linux tests green. Browser tests
  need an available, documented browser; absence means not run, not passed.
- **Windows:** validate affected native/C#/PowerShell, RTF, WebView2, permission
  and packaging paths with their authorized isolated tests. Linux success is not
  evidence for these paths. Real clipboard/UAC/firewall/certificate/installation
  tests remain separately authorized acceptance, not ordinary test execution.
- **Both:** retain SOURCE-CHECKOUT, temporary data/ports and complete mocked OS
  adapters. No personal clipboard/history, keys, certificates, network names,
  profiles, logs or backups enter Cloud, Git or screenshots. No synchronization
  step updates the user's installed application.

The separate pinned native-rebuild/ABI GitHub workflows have their own reviewed
scope. A generic Cloud environment or its tests do not implicitly replace their
evidence or the deferred clean Windows/iPhone acceptance.

## Required handoff

Every task should report: task/owner, branch and base/result commit; changed paths;
environment/OS and relevant tool versions; commands and passed/failed/skipped
counts with skip reasons; checks not performed; compatibility risks; integration
status (local-only / branch pushed / PR / merged); package and personal deployment
status. Update PROJECT-STATUS.md and CHANGELOG.md without overwriting parallel
records. Public records use relative/environment-variable paths and synthetic
data, never private machine details. Leave the checkout's lock released at handoff.

Cloud configuration changes alone do not close product release gates. Stable
release still needs real clean Windows/iPhone acceptance; publication and personal
deployment continue to require their existing separate approvals.
