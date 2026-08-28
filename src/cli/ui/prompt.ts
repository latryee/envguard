import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import pc from 'picocolors';

export interface PromptSelectOption {
  label: string;
  value: string;
  description?: string;
}

/**
 * Prompts user with a text question, supporting a default fallback value.
 */
export async function promptQuestion(
  question: string,
  defaultValue?: string,
  rlInstance?: readline.Interface
): Promise<string> {
  const rl = rlInstance ?? readline.createInterface({ input, output });
  const shouldClose = !rlInstance;

  try {
    const formattedDefault = defaultValue !== undefined ? pc.dim(` (${defaultValue})`) : '';
    const answer = await rl.question(`${pc.cyan('?')} ${pc.bold(question)}${formattedDefault}: `);
    const trimmed = answer.trim();
    return trimmed === '' && defaultValue !== undefined ? defaultValue : trimmed;
  } finally {
    if (shouldClose) {
      rl.close();
    }
  }
}

/**
 * Prompts user to select from multiple options via numbered choice.
 */
export async function promptSelect(
  question: string,
  options: PromptSelectOption[],
  defaultIndex = 0,
  rlInstance?: readline.Interface
): Promise<string> {
  const rl = rlInstance ?? readline.createInterface({ input, output });
  const shouldClose = !rlInstance;

  try {
    console.log(`\n${pc.cyan('?')} ${pc.bold(question)}:`);
    options.forEach((opt, idx) => {
      const num = pc.cyan(`[${idx + 1}]`);
      const desc = opt.description ? pc.dim(` - ${opt.description}`) : '';
      const isDefault = idx === defaultIndex ? pc.green(' (default)') : '';
      console.log(`  ${num} ${opt.label}${desc}${isDefault}`);
    });

    const answer = await rl.question(`\n${pc.cyan('Enter choice')} ${pc.dim(`[1-${options.length}] (default: ${defaultIndex + 1})`)}: `);
    const choiceNum = parseInt(answer.trim(), 10);

    if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > options.length) {
      return options[defaultIndex].value;
    }
    return options[choiceNum - 1].value;
  } finally {
    if (shouldClose) {
      rl.close();
    }
  }
}

/**
 * Prompts user for a yes/no confirmation.
 */
export async function promptConfirm(
  question: string,
  defaultValue = true,
  rlInstance?: readline.Interface
): Promise<boolean> {
  const rl = rlInstance ?? readline.createInterface({ input, output });
  const shouldClose = !rlInstance;

  try {
    const hint = defaultValue ? '[Y/n]' : '[y/N]';
    const answer = await rl.question(`${pc.cyan('?')} ${pc.bold(question)} ${pc.dim(hint)}: `);
    const trimmed = answer.trim().toLowerCase();

    if (trimmed === '') return defaultValue;
    return trimmed === 'y' || trimmed === 'yes';
  } finally {
    if (shouldClose) {
      rl.close();
    }
  }
}
