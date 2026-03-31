import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type LlmProvider = 'openai' | 'anthropic' | 'gemini';

export interface LlmOptions {
  provider: LlmProvider;
  model?: string;
  apiKey: string;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface LlmResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-20250514',
  gemini: 'gemini-2.5-flash',
};

const ENV_VAR_NAMES: Record<LlmProvider, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

export function resolveApiKey(provider: LlmProvider): string | null {
  const envVarName = ENV_VAR_NAMES[provider];

  const envKey = process.env[envVarName];
  if (envKey) return envKey;

  const configPath = path.join(os.homedir(), '.apiscribe', 'config.json');
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (config[envVarName]) return config[envVarName];
  } catch {
    // Config file doesn't exist or is invalid
  }

  return null;
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  options: LlmOptions,
): Promise<LlmResponse> {
  const client = new OpenAI({ apiKey: options.apiKey });
  const model = options.model || DEFAULT_MODELS.openai;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: options.maxTokens || 16384,
    ...(options.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
  });

  return {
    content: response.choices[0].message.content || '',
    inputTokens: response.usage?.prompt_tokens || 0,
    outputTokens: response.usage?.completion_tokens || 0,
    model,
  };
}

async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  options: LlmOptions,
): Promise<LlmResponse> {
  const client = new Anthropic({ apiKey: options.apiKey });
  const model = options.model || DEFAULT_MODELS.anthropic;

  const response = await client.messages.create({
    model,
    max_tokens: options.maxTokens || 16384,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    temperature: 0.2,
  });

  const textBlock = response.content.find((b) => b.type === 'text');

  return {
    content: textBlock && 'text' in textBlock ? textBlock.text : '',
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model,
  };
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  options: LlmOptions,
): Promise<LlmResponse> {
  const genAI = new GoogleGenerativeAI(options.apiKey);
  const model = options.model || DEFAULT_MODELS.gemini;

  const generativeModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: options.maxTokens || 16384,
    },
  });

  const result = await generativeModel.generateContent(userPrompt);
  const response = result.response;

  return {
    content: response.text(),
    inputTokens: response.usageMetadata?.promptTokenCount || 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
    model,
  };
}

const CALL_FNS: Record<LlmProvider, typeof callOpenAI> = {
  openai: callOpenAI,
  anthropic: callAnthropic,
  gemini: callGemini,
};

export async function callLlm(
  systemPrompt: string,
  userPrompt: string,
  options: LlmOptions,
): Promise<LlmResponse> {
  const callFn = CALL_FNS[options.provider];

  try {
    return await callFn(systemPrompt, userPrompt, options);
  } catch (error: unknown) {
    const err = error as { status?: number; headers?: Record<string, string> };
    if (err.status === 429 || err.status === 500 || err.status === 503) {
      const retryAfter = parseInt(err.headers?.['retry-after'] || '5', 10);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return await callFn(systemPrompt, userPrompt, options);
    }
    throw error;
  }
}
