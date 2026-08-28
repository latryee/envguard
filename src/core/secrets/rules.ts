export interface SecretRule {
  id: string;
  name: string;
  category: 'cloud' | 'ai' | 'vcs' | 'payment' | 'auth' | 'crypto' | 'database' | 'generic';
  severity: 'critical' | 'high' | 'medium';
  regex: RegExp;
  description: string;
  remediation: string;
}

export const SECRET_RULES: SecretRule[] = [
  // Anthropic API Key (placed before general sk-)
  {
    id: 'anthropic-api-key',
    name: 'Anthropic Claude API Key',
    category: 'ai',
    severity: 'critical',
    regex: /\b(sk-ant-[a-zA-Z0-9_-]{30,90})\b/g,
    description: 'Exposed Anthropic Claude API Key.',
    remediation: 'Rotate your key on Anthropic Console.'
  },
  // OpenAI API Key (Standard & Project-scoped, excluding sk-ant-)
  {
    id: 'openai-api-key',
    name: 'OpenAI API Key',
    category: 'ai',
    severity: 'critical',
    regex: /\b(sk-(?!ant-)(?:proj-|none-|admin-|svcacct-)?[a-zA-Z0-9_-]{30,80})\b/g,
    description: 'Exposed OpenAI API Key.',
    remediation: 'Rotate your key on the OpenAI API keys dashboard.'
  },
  // AWS Access Key ID
  {
    id: 'aws-access-key',
    name: 'AWS Access Key ID',
    category: 'cloud',
    severity: 'critical',
    regex: /\b((?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16})\b/g,
    description: 'Exposed AWS Access Key identifier.',
    remediation: 'Revoke key in AWS IAM immediately and use IAM Roles or environment secret manager.'
  },
  // AWS Secret Access Key
  {
    id: 'aws-secret-key',
    name: 'AWS Secret Access Key',
    category: 'cloud',
    severity: 'critical',
    regex: /(?:aws_secret_access_key|aws_sec_key|aws_secret)\s*[:=]\s*['"]?([a-zA-Z0-9/+=]{40})['"]?/gi,
    description: 'Potential AWS Secret Access Key.',
    remediation: 'Rotate this secret in AWS IAM immediately.'
  },
  // GitHub Personal Access Token
  {
    id: 'github-pat',
    name: 'GitHub Personal Access Token',
    category: 'vcs',
    severity: 'critical',
    regex: /\b((?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82})\b/g,
    description: 'Exposed GitHub Access Token.',
    remediation: 'Revoke and regenerate the token in GitHub Developer Settings.'
  },
  // Stripe Secret Key
  {
    id: 'stripe-secret-key',
    name: 'Stripe Secret Key',
    category: 'payment',
    severity: 'critical',
    regex: /\b((?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{24,99})\b/g,
    description: 'Exposed Stripe API Secret Key.',
    remediation: 'Roll the key in Stripe Dashboard -> Developers -> API keys.'
  },
  // Slack Bot / User Token
  {
    id: 'slack-token',
    name: 'Slack API Token',
    category: 'auth',
    severity: 'high',
    regex: /\b(xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,32})\b/g,
    description: 'Exposed Slack Bot or User Token.',
    remediation: 'Revoke token in the Slack App management console.'
  },
  // Google API Key
  {
    id: 'google-api-key',
    name: 'Google API Key',
    category: 'cloud',
    severity: 'high',
    regex: /\b(AIza[0-9A-Za-z_-]{35})\b/g,
    description: 'Exposed Google Cloud / Maps / Firebase API Key.',
    remediation: 'Restrict or rotate key in Google Cloud Console Credentials.'
  },
  // Private Key Blocks (PKCS#1, PKCS#8, OpenSSH, PGP)
  {
    id: 'private-key',
    name: 'Private Encryption Key',
    category: 'crypto',
    severity: 'critical',
    regex: /-----BEGIN (?:(?:RSA|DSA|EC|OPENSSH|PGP|ENCRYPTED) )?PRIVATE KEY(?: BLOCK)?-----/g,
    description: 'Unencrypted or encrypted private cryptographic key block.',
    remediation: 'Never commit private keys to version control. Store as encrypted secrets or file references.'
  },
  // SendGrid API Key
  {
    id: 'sendgrid-api-key',
    name: 'SendGrid API Key',
    category: 'auth',
    severity: 'high',
    regex: /\b(SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43})\b/g,
    description: 'Exposed SendGrid API Key.',
    remediation: 'Revoke in SendGrid settings -> API Keys.'
  },
  // JWT Token with Signature
  {
    id: 'jwt-token',
    name: 'JSON Web Token (JWT)',
    category: 'auth',
    severity: 'medium',
    regex: /\b(eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})\b/g,
    description: 'Hardcoded JWT bearer token or session token.',
    remediation: 'Use dynamic token exchange instead of hardcoding JWTs.'
  },
  // GitLab Access Token
  {
    id: 'gitlab-pat',
    name: 'GitLab Access Token',
    category: 'vcs',
    severity: 'critical',
    regex: /\b((?:glpat|glcbt|glptt)-[0-9a-zA-Z_-]{20,26})\b/g,
    description: 'Exposed GitLab Personal, Pipeline, or Trigger Access Token.',
    remediation: 'Revoke token in GitLab -> User Settings -> Access Tokens.'
  },
  // npm Access Token
  {
    id: 'npm-token',
    name: 'npm Access Token',
    category: 'auth',
    severity: 'critical',
    regex: /\b(npm_[a-zA-Z0-9]{36})\b/g,
    description: 'Exposed npm registry publishing or automation token.',
    remediation: 'Revoke and regenerate the token on npmjs.com/settings/tokens.'
  },
  // Slack Webhook URL
  {
    id: 'slack-webhook',
    name: 'Slack Incoming Webhook URL',
    category: 'auth',
    severity: 'high',
    regex: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]{8,12}\/B[a-zA-Z0-9_]{8,12}\/[a-zA-Z0-9_]{24}/g,
    description: 'Exposed Slack Incoming Webhook endpoint URL.',
    remediation: 'Regenerate or remove the webhook in your Slack App Incoming Webhooks configuration.'
  },
  // Discord Bot Token
  {
    id: 'discord-bot-token',
    name: 'Discord Bot Token',
    category: 'auth',
    severity: 'critical',
    regex: /\b([MN][A-Za-z\d]{23,26}\.[\w-]{6}\.[\w-]{27,38})\b/g,
    description: 'Exposed Discord Bot Token.',
    remediation: 'Regenerate your bot token in Discord Developer Portal.'
  },
  // Hugging Face Access Token
  {
    id: 'huggingface-token',
    name: 'Hugging Face Access Token',
    category: 'ai',
    severity: 'high',
    regex: /\b(hf_[a-zA-Z0-9]{34,40})\b/g,
    description: 'Exposed Hugging Face API / User Access Token.',
    remediation: 'Revoke and regenerate your token on huggingface.co/settings/tokens.'
  },
  // Twilio API Key
  {
    id: 'twilio-api-key',
    name: 'Twilio API Key',
    category: 'auth',
    severity: 'high',
    regex: /\b(SK[0-9a-fA-F]{32})\b/g,
    description: 'Exposed Twilio API Key or Secret.',
    remediation: 'Delete and recreate the API key in the Twilio Console.'
  },
  // Resend API Key
  {
    id: 'resend-api-key',
    name: 'Resend API Key',
    category: 'auth',
    severity: 'high',
    regex: /\b(re_[a-zA-Z0-9]{24,36})\b/g,
    description: 'Exposed Resend transactional email API key.',
    remediation: 'Rotate the API key in the Resend dashboard.'
  }
];
