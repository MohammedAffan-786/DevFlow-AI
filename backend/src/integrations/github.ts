import { GitHubService } from '../services/githubService.js';
import { config } from '../config/index.js';

export class GitHubIntegration {
  public static isConfigured(): boolean {
    return Boolean(config.github.appId && config.github.privateKey);
  }

  public static async getClient(installationId?: number) {
    return GitHubService.getOctokit(installationId);
  }
}
