import OpenAI from "openai";

const apiKey =
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim() ||
  process.env.OPENAI_API_KEY?.trim();

const baseURL =
  process.env.AI_INTEGRATIONS_OPENAI_BASE_URL?.trim() ||
  process.env.OPENAI_BASE_URL?.trim() ||
  "https://api.openai.com/v1";

export const aiEnabled = Boolean(apiKey);

if (!aiEnabled) {
  console.warn(
    "OpenAI integration is disabled: no AI_INTEGRATIONS_OPENAI_API_KEY or OPENAI_API_KEY configured.",
  );
}

export const openai = new OpenAI({
  apiKey: apiKey || "openai-disabled",
  baseURL,
});
