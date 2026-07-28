import OpenAI from "openai";

const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

export const imageAiEnabled = Boolean(apiKey && baseURL);

if (!imageAiEnabled) {
  console.warn(
    "OpenAI image integration is disabled because the required environment variables are not configured.",
  );
}

export const openaiImageClient = new OpenAI({
  apiKey: apiKey || "openai-disabled",
  baseURL: baseURL || "https://api.openai.com/v1",
});