import { config } from '../config/index.js';

export class AIIntegration {
  public static isConfigured(): boolean {
    return Boolean(config.aiService.olamaKey);
  }

  public static async requestReview(prompt: string, context: Record<string, any>) {
    const res = await fetch(`${config.aiService.url}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': config.aiService.internalKey,
      },
      body: JSON.stringify({ prompt, context }),
    });
    if (!res.ok) {
      throw new Error(`AI service responded with status: ${res.status}`);
    }
    return res.json();
  }
}
