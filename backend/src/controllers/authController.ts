import type { Request, Response } from 'express';
import { AuthService } from '../services/authService.js';

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name, organizationName } = req.body;
    const result = await AuthService.register({ email, password, name, organizationName });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 401).json({ error: err.message });
  }
}

export async function getProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const profile = await AuthService.getProfile(userId);
    res.json(profile);
  } catch (err: any) {
    res.status(err.status || 404).json({ error: err.message });
  }
}
