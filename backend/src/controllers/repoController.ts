import type { Request, Response } from 'express';
import { RepositoryModel } from '../models/Repository.js';

export async function listRepositories(req: Request, res: Response) {
  try {
    const orgId = (req as any).user?.organizationId;
    const query = orgId ? { organizationId: orgId } : {};
    const repos = await RepositoryModel.find(query).lean();
    res.json(repos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getRepository(req: Request, res: Response) {
  try {
    const repo = await RepositoryModel.findById(req.params.id).lean();
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    res.json(repo);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
