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
};

export interface RedisConfig {
  uri: string | undefined;
  otpExpiresInSeconds: number;
  otpLength: number;
  otpCooldownSeconds: number; // <--- ADD THIS
}
