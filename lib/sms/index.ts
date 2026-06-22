export { buildOptOutFooter, isSmsOptedOut, normalizePhoneNumber } from "@/lib/sms/compliance";
export { getMissingSmsEnvVars, getSmsProvider, isSmsSendingConfigured } from "@/lib/sms/env";
export { sendSmsMessage } from "@/lib/sms/send";
export type {
  SendSmsMessageInput,
  SmsMessagePurpose,
  SmsProvider,
  SmsSendResult,
  SmsSendStatus,
} from "@/lib/sms/types";
