import OpenAI from "openai";

const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

export const aiEnabled = Boolean(apiKey && baseURL);

if (!aiEnabled) {
  console.warn(
    "OpenAI integration is disabled because the required environment variables are not configured.",
  );
}

export const openai = new OpenAI({
  apiKey: apiKey || "openai-disabled",
  baseURL: baseURL || "https://api.openai.com/v1",
});