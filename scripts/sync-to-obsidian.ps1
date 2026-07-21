# sync-to-obsidian.ps1
# Version: 1.0.0
# Direction: allrentz-main -> operational-brain (ONE-WAY ONLY)
#
# Generates five markdown status notes from repo state into the Obsidian
# operational-brain vault. Obsidian does not modify the repo. Obsidian doctrine
# does not trigger code, migration, RLS, Edge Function, UI, config, business
# logic, deployment, or documentation changes in the repo.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\scripts\sync-to-obsidian.ps1
#   powershell -ExecutionPolicy Bypass -File .\scripts\sync-to-obsidian.ps1 -DryRun

param(
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$SCRIPT_VERSION = "1.0.0"

# =============================================================================
# HARD PATH GUARDS
# =============================================================================

$REPO_ROOT    = "C:\Users\prmcg\allrentz-main"
$VAULT_ROOT   = "C:\Users\prmcg\ALLRENTZ-HQ\operational-brain"
$SYNC_TARGET  = "C:\Users\prmcg\ALLRENTZ-HQ\operational-brain\18_ENGINEERING_SYNC"

# Guard 1: Confirm repo root is exactly as expected
$actualRepo = (Resolve-Path $PSScriptRoot).Path -replace '\\scripts$', ''
if ($actualRepo -ne $REPO_ROOT) {
    Write-Host "ABORT: Script is not running from expected repo root."
    Write-Host "  Expected: $REPO_ROOT"
    Write-Host "  Detected: $actualRepo"
    exit 1
}

# Guard 2: Abort if repo path is missing
if (-not (Test-Path $REPO_ROOT)) {
    Write-Host "ABORT: Repo root does not exist: $REPO_ROOT"
    exit 1
}

# Guard 3: Abort if vault path is missing
if (-not (Test-Path $VAULT_ROOT)) {
    Write-Host "ABORT: Obsidian vault root does not exist: $VAULT_ROOT"
    exit 1
}

# Guard 4: Abort if vault does not contain .obsidian
if (-not (Test-Path "$VAULT_ROOT\.obsidian")) {
    Write-Host "ABORT: Vault root does not contain .obsidian  -  may not be a valid Obsidian vault."
    Write-Host "  Checked: $VAULT_ROOT\.obsidian"
    exit 1
}

# Guard 5: Confirm script is NOT running from inside the vault
$scriptPath = (Resolve-Path $PSScriptRoot).Path
if ($scriptPath.StartsWith($VAULT_ROOT, [System.StringComparison]::OrdinalIgnoreCase)) {
    Write-Host "ABORT: Script is running from inside the Obsidian vault. This is forbidden."
    Write-Host "  Script path: $scriptPath"
    exit 1
}

# Guard 6: Confirm destination is exactly the expected path
if ($SYNC_TARGET -ne "$VAULT_ROOT\18_ENGINEERING_SYNC") {
    Write-Host "ABORT: Destination path mismatch."
    Write-Host "  Expected: $VAULT_ROOT\18_ENGINEERING_SYNC"
    Write-Host "  Configured: $SYNC_TARGET"
    exit 1
}

# =============================================================================
# MODE ANNOUNCEMENT
# =============================================================================

$SYNC_TIME = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
$SYNC_TIME_ISO = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

Write-Host ""
Write-Host "========================================"
Write-Host "ALLRENTZ Repo -> Obsidian Sync"
Write-Host "Version: $SCRIPT_VERSION"
Write-Host "Direction: allrentz-main -> operational-brain (ONE-WAY)"
if ($DryRun) {
    Write-Host "Mode: DRY RUN - no files will be written"
} else {
    Write-Host "Mode: REAL RUN - files will be written"
}
Write-Host "Timestamp: $SYNC_TIME"
Write-Host "Destination: $SYNC_TARGET"
Write-Host "========================================"
Write-Host ""

# =============================================================================
# COLLECT REPO FACTS (read-only git commands only)
# =============================================================================

Push-Location $REPO_ROOT

$gitBranch    = git branch --show-current 2>&1
$gitHead      = git log -1 --format="%H %ai %s" 2>&1
$gitLog10     = git log --oneline -10 2>&1
$gitStatus    = git status --short 2>&1

# Parse status into categories
$untrackedLines  = @($gitStatus | Where-Object { $_ -match "^\?\?" })
$modifiedLines   = @($gitStatus | Where-Object { $_ -match "^ M" })
$stagedLines     = @($gitStatus | Where-Object { $_ -match "^[MADRC]" -and $_ -notmatch "^\?\?" })

# Migration filenames only  -  no SQL contents
$migrationFiles = @()
$migrationsPath = "$REPO_ROOT\supabase\migrations"
if (Test-Path $migrationsPath) {
    $migrationFiles = Get-ChildItem $migrationsPath -Filter "*.sql" -File |
        Sort-Object Name |
        Select-Object -ExpandProperty Name
}

# docs/**/*.md paths and last commit dates  -  filenames only, no contents
$docFiles = @()
$docsPath = "$REPO_ROOT\docs"
if (Test-Path $docsPath) {
    $docFileItems = Get-ChildItem $docsPath -Recurse -Filter "*.md" -File
    foreach ($df in $docFileItems) {
        $relPath = $df.FullName.Substring($REPO_ROOT.Length + 1)
        $lastDate = git log -1 --format="%ad" --date=short -- $df.FullName 2>&1
        if (-not $lastDate) { $lastDate = "no-commits" }
        $docFiles += [PSCustomObject]@{ Path = $relPath; LastCommit = $lastDate }
    }
}

# ALLRENTZ_CONSTITUTION.md  -  path and last commit date only
$constitutionInfo = $null
$constitutionPath = "$REPO_ROOT\ALLRENTZ_CONSTITUTION.md"
if (Test-Path $constitutionPath) {
    $lastDate = git log -1 --format="%ad" --date=short -- $constitutionPath 2>&1
    if (-not $lastDate) { $lastDate = "no-commits" }
    $constitutionInfo = [PSCustomObject]@{ Path = "ALLRENTZ_CONSTITUTION.md"; LastCommit = $lastDate }
}

# CLAUDE.md  -  path and last commit date only
$claudeMdInfo = $null
$claudeMdPath = "$REPO_ROOT\CLAUDE.md"
if (Test-Path $claudeMdPath) {
    $lastDate = git log -1 --format="%ad" --date=short -- $claudeMdPath 2>&1
    if (-not $lastDate) { $lastDate = "no-commits" }
    $claudeMdInfo = [PSCustomObject]@{ Path = "CLAUDE.md"; LastCommit = $lastDate }
}

# MASTER_PRIORITY_BOARD.md  -  active unchecked tasks only, no full content
$activeTasks = @()
$priorityBoardFound = $false
$priorityBoardPath = "$REPO_ROOT\MASTER_PRIORITY_BOARD.md"
if (Test-Path $priorityBoardPath) {
    $priorityBoardFound = $true
    $pbLines = Get-Content $priorityBoardPath -Encoding UTF8
    # Find ACTIVE PRIORITIES section, extract only unchecked "- [ ]" lines
    $inActive = $false
    foreach ($line in $pbLines) {
        if ($line -match "^#+\s*ACTIVE PRIORITIES") { $inActive = $true; continue }
        # Stop at next top-level section after ACTIVE PRIORITIES
        if ($inActive -and $line -match "^#[^#]" -and $line -notmatch "ACTIVE PRIORITIES") { $inActive = $false }
        if ($inActive -and $line -match "^\s*-\s*\[ \]") {
            $activeTasks += $line.Trim()
        }
    }
}

Pop-Location

# =============================================================================
# HEADER WARNING (required on every generated file)
# =============================================================================

$WARNING = "GENERATED FROM ALLRENTZ REPO STATE. DO NOT MANUALLY EDIT. OBSIDIAN DOES NOT CONTROL THE REPO."

# =============================================================================
# BUILD FILE CONTENTS
# =============================================================================

# --- REPO_STATUS.md ---
$repoStatusLines = @(
    "# REPO STATUS",
    "",
    "> $WARNING",
    "",
    "## Sync Metadata",
    "",
    "- **Sync timestamp:** $SYNC_TIME",
    "- **Script version:** $SCRIPT_VERSION",
    "- **Direction:** allrentz-main -> operational-brain (one-way only)",
    "",
    "## Current Branch",
    "",
    "``````",
    $gitBranch,
    "``````",
    "",
    "## HEAD Commit",
    "",
    "``````",
    $gitHead,
    "``````",
    "",
    "## Last 10 Commits",
    "",
    "``````"
) + $gitLog10 + @(
    "``````",
    "",
    "## Git Status (short)",
    "",
    "``````"
) + ($gitStatus | ForEach-Object { if ($_) { $_ } else { "(clean)" } }) + @(
    "``````",
    "",
    "## Untracked Files",
    ""
)
if ($untrackedLines.Count -gt 0) {
    $repoStatusLines += $untrackedLines | ForEach-Object { "- $($_.TrimStart('?? '))" }
} else {
    $repoStatusLines += "- (none)"
}
$repoStatusLines += @(
    "",
    "## Modified Tracked Files",
    ""
)
if ($modifiedLines.Count -gt 0) {
    $repoStatusLines += $modifiedLines | ForEach-Object { "- $($_.Trim())" }
} else {
    $repoStatusLines += "- (none)"
}
$repoStatusLines += @(
    "",
    "## Staged Files",
    ""
)
if ($stagedLines.Count -gt 0) {
    $repoStatusLines += $stagedLines | ForEach-Object { "- $($_.Trim())" }
} else {
    $repoStatusLines += "- (none)"
}
$repoStatusContent = $repoStatusLines -join "`n"

# --- MIGRATION_LOG.md ---
$migLogLines = @(
    "# MIGRATION LOG",
    "",
    "> $WARNING",
    "",
    "## Sync Metadata",
    "",
    "- **Sync timestamp:** $SYNC_TIME",
    "- **Source:** supabase/migrations/*.sql (filenames only - no SQL contents)",
    "",
    "## Migration Files ($($migrationFiles.Count) total)",
    ""
)
if ($migrationFiles.Count -gt 0) {
    $migLogLines += $migrationFiles | ForEach-Object { "- $_" }
    $migLogLines += @(
        "",
        "## Most Recent Migration",
        "",
        "- $($migrationFiles[-1])"
    )
} else {
    $migLogLines += "- (no migration files found)"
}
$migLogContent = $migLogLines -join "`n"

# --- ACTIVE_PRIORITIES.md ---
$activePriLines = @(
    "# ACTIVE PRIORITIES",
    "",
    "> $WARNING",
    "",
    "## Sync Metadata",
    "",
    "- **Sync timestamp:** $SYNC_TIME",
    "- **Source:** MASTER_PRIORITY_BOARD.md (unchecked tasks only)",
    ""
)
if (-not $priorityBoardFound) {
    $activePriLines += "MASTER_PRIORITY_BOARD.md was not found in the repo root."
} elseif ($activeTasks.Count -eq 0) {
    $activePriLines += "No unchecked active tasks found in MASTER_PRIORITY_BOARD.md."
} else {
    $activePriLines += "## Unchecked Active Tasks ($($activeTasks.Count))"
    $activePriLines += ""
    $activePriLines += $activeTasks
}
$activePriContent = $activePriLines -join "`n"

# --- DOCTRINE_SYNC.md ---
$docSyncLines = @(
    "# DOCTRINE SYNC",
    "",
    "> $WARNING",
    "",
    "## Sync Metadata",
    "",
    "- **Sync timestamp:** $SYNC_TIME",
    "- **Note:** File paths and last-commit dates only. No doctrine contents copied.",
    "",
    "## Root Governance Files",
    ""
)
if ($constitutionInfo) {
    $docSyncLines += "- ``$($constitutionInfo.Path)``  (last commit: $($constitutionInfo.LastCommit))"
} else {
    $docSyncLines += "- ALLRENTZ_CONSTITUTION.md  -  not found"
}
if ($claudeMdInfo) {
    $docSyncLines += "- ``$($claudeMdInfo.Path)``  (last commit: $($claudeMdInfo.LastCommit))"
} else {
    $docSyncLines += "- CLAUDE.md  -  not found"
}
$docSyncLines += @(
    "",
    "## docs/ Files ($($docFiles.Count) files)",
    ""
)
if ($docFiles.Count -gt 0) {
    foreach ($df in $docFiles) {
        $docSyncLines += "- ``$($df.Path)``  (last commit: $($df.LastCommit))"
    }
} else {
    $docSyncLines += "- (no markdown files found under docs/)"
}
$docSyncContent = $docSyncLines -join "`n"

# --- LAST_SYNC.md ---
$lastSyncContent = @(
    "# LAST SYNC",
    "",
    "> $WARNING",
    "",
    "## Sync Record",
    "",
    "- **Timestamp (ISO):** $SYNC_TIME_ISO",
    "- **Branch:** $gitBranch",
    "- **HEAD commit:** $(($gitHead -split ' ')[0])",
    "- **Script version:** $SCRIPT_VERSION",
    "- **Run mode:** $(if ($DryRun) { 'DRY RUN (no files written)' } else { 'REAL RUN' })",
    "- **Direction:** allrentz-main -> operational-brain (ONE-WAY ONLY)",
    "",
    "## Files Written",
    "",
    "- REPO_STATUS.md",
    "- MIGRATION_LOG.md",
    "- ACTIVE_PRIORITIES.md",
    "- DOCTRINE_SYNC.md",
    "- LAST_SYNC.md",
    "",
    "## Authority Boundary Confirmation",
    "",
    "Obsidian does not control the repo.",
    "This vault receives generated status notes only.",
    "No vault content was copied into the repo.",
    "No repo files were modified by this sync."
) -join "`n"

# =============================================================================
# OUTPUT / WRITE
# =============================================================================

$filesToWrite = @(
    [PSCustomObject]@{ Name = "REPO_STATUS.md";       Content = $repoStatusContent }
    [PSCustomObject]@{ Name = "MIGRATION_LOG.md";     Content = $migLogContent }
    [PSCustomObject]@{ Name = "ACTIVE_PRIORITIES.md"; Content = $activePriContent }
    [PSCustomObject]@{ Name = "DOCTRINE_SYNC.md";     Content = $docSyncContent }
    [PSCustomObject]@{ Name = "LAST_SYNC.md";         Content = $lastSyncContent }
)

if ($DryRun) {
    Write-Host "--- DRY RUN PREVIEW ---"
    Write-Host ""
    foreach ($f in $filesToWrite) {
        $dest = "$SYNC_TARGET\$($f.Name)"
        Write-Host "WOULD WRITE: $dest"
        Write-Host "  Lines: $($f.Content.Split("`n").Count)"
        Write-Host "  First line: $($f.Content.Split("`n")[0])"
        Write-Host ""
    }
    Write-Host "--- DRY RUN COMPLETE  -  no files written ---"
} else {
    # Create destination folder if needed
    if (-not (Test-Path $SYNC_TARGET)) {
        New-Item -ItemType Directory -Path $SYNC_TARGET -Force | Out-Null
        Write-Host "Created destination folder: $SYNC_TARGET"
    }

    $written = @()
    $failed  = @()

    foreach ($f in $filesToWrite) {
        $dest = "$SYNC_TARGET\$($f.Name)"
        try {
            [System.IO.File]::WriteAllText(
                $dest,
                $f.Content,
                (New-Object System.Text.UTF8Encoding $false)
            )
            Write-Host "  WRITTEN: $dest"
            $written += $f.Name
        } catch {
            Write-Host "  FAILED:  $dest  -  $($_.Exception.Message)"
            $failed += $f.Name
        }
    }

    Write-Host ""
    Write-Host "========================================"
    Write-Host "Sync complete."
    Write-Host "  Written: $($written.Count)"
    Write-Host "  Failed:  $($failed.Count)"
    if ($failed.Count -gt 0) {
        Write-Host "  Failed files: $($failed -join ', ')"
        exit 1
    }
    Write-Host "========================================"
}
