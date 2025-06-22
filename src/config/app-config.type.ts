export type AppConfig = {
  nodeEnv: string;
  name: string;
  workingDirectory: string;
  frontendDomain?: string;
  backendDomain: string;
  port: number;
  apiPrefix: string;
  fallbackLanguage: string;
  headerLanguage: string;
  fonnteToken: string;
  throttlerTtl: number;
  throttlerLimit: number;
};

export interface RedisConfig {
  uri: string | undefined;
  otpExpiresInSeconds: number;
  otpLength: number;
  otpCooldownSeconds: number;
  otpMaxAttempts: number; // <--- ADD THIS
}
