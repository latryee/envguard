export type ShellType = 'bash' | 'zsh' | 'fish' | 'powershell';

export function generateCompletionScript(shell: ShellType): string {
  switch (shell) {
    case 'bash':
      return `
# envguard bash completion script
_envguard_completions() {
  local cur prev commands options
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  commands="check sync fix gen-types types hook init export pull vscode diff fmt encrypt decrypt completion"
  options="--env --example --strict --staged --paranoid --scan-history --workspaces --format --quiet --verbose --version --help"

  if [ $COMP_CWORD -eq 1 ]; then
    COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
  else
    COMPREPLY=( $(compgen -W "$options" -- "$cur") )
  fi
}
complete -F _envguard_completions envguard
`;

    case 'zsh':
      return `
#compdef envguard
# envguard zsh completion script

_envguard() {
  local -a commands
  commands=(
    'check:Scan code and validate .env against .env.example'
    'sync:Synchronize .env.example with missing variables'
    'diff:Compare differences between two environment files'
    'fmt:Format and clean .env files'
    'encrypt:Encrypt .env using AES-256-GCM'
    'decrypt:Decrypt .env.enc'
    'export:Export variables to K8s, Docker, Terraform, Helm'
    'pull:Pull secrets from Cloud Secret Managers'
    'vscode:Configure VS Code file nesting and schema'
    'gen-types:Generate TypeScript ambient declarations'
    'hook:Manage Git pre-commit hooks'
    'init:One-click onboarding setup'
    'completion:Generate shell autocompletion script'
  )

  _arguments \\
    '1: :->command' \\
    '*: :->args'

  case $state in
    command)
      _describe 'command' commands
      ;;
    args)
      _arguments \\
        '--env[Path to .env file]' \\
        '--example[Path to .env.example]' \\
        '--strict[Fail on warnings]' \\
        '--staged[Only scan staged files]' \\
        '--paranoid[Show medium-confidence secrets]' \\
        '--scan-history[Scan Git commit history]' \\
        '--workspaces[Scan all monorepo packages]' \\
        '--format[Output format: terminal, json, github, sarif, pr-comment]' \\
        '--interactive[Run interactive wizard]' \\
        '--prune[Remove obsolete variables]'
      ;;
  esac
}

_envguard
`;

    case 'fish':
      return `
# envguard fish completion script
complete -c envguard -n "__fish_use_subcommand" -a "check sync diff fmt encrypt decrypt export pull vscode gen-types hook init completion"
complete -c envguard -l env -d "Path to .env file"
complete -c envguard -l example -d "Path to .env.example file"
complete -c envguard -l strict -d "Fail on warnings"
complete -c envguard -l staged -d "Scan Git staged files"
complete -c envguard -l paranoid -d "Show medium-confidence secrets"
complete -c envguard -l scan-history -d "Scan Git commit history"
complete -c envguard -l workspaces -d "Scan monorepo packages"
complete -c envguard -l format -d "Output format"
`;

    case 'powershell':
      return `
# envguard PowerShell completion script
Register-ArgumentCompleter -Native -CommandName envguard -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)
    $commands = @('check', 'sync', 'diff', 'fmt', 'encrypt', 'decrypt', 'export', 'pull', 'vscode', 'gen-types', 'hook', 'init', 'completion')
    $options = @('--env', '--example', '--strict', '--staged', '--paranoid', '--scan-history', '--workspaces', '--format', '--quiet', '--verbose')

    $elements = $commandAst.CommandElements
    if ($elements.Count -le 2) {
        $commands | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }
    } else {
        $options | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }
    }
}
`;
  }
}
