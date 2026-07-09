import "server-only";

import { z } from "zod";

// Empty strings in .env files are treated as "not set" for optional URL fields.
const optionalUrl = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().url().optional(),
);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // NextAuth aliases — either form is accepted
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: optionalUrl,

  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z
    .string()
    .url()
    .default("http://localhost:3000/api/app/google/callback"),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z
    .string()
    .min(1)
    .default("Expert Gatekeeper <noreply@example.com>"),

  OPENAI_API_KEY: z.string().optional(),

  ENCRYPTION_KEY: z.string().optional(),
  ACCESS_CODE_PEPPER: z.string().optional(),

  // Sentry — optional; Sentry is a no-op when these are absent.
  // optionalUrl treats "" the same as undefined so .env.example's blank
  // values don't fail the URL validator at startup.
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
  SENTRY_DSN: optionalUrl,
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
});

const parsedEnv = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  ACCESS_CODE_PEPPER: process.env.ACCESS_CODE_PEPPER,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_ORG: process.env.SENTRY_ORG,
  SENTRY_PROJECT: process.env.SENTRY_PROJECT,
  SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
});

if (!parsedEnv.success) {
  const errors = parsedEnv.error.flatten().fieldErrors;
  const lines = Object.entries(errors)
    .map(([key, msgs]) => `  ${key}: ${msgs?.join(", ")}`)
    .join("\n");
  console.error(`\n❌ Missing or invalid environment variables:\n${lines}\n`);
  throw new Error("Server cannot start: fix the environment variables above.");
}

export const env = parsedEnv.data;
export type Env = typeof env;