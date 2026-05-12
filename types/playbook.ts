import { z } from "zod";

export const PhaseSchema = z.object({
  id: z.string(),
  timeframe: z.string(),
  title: z.string(),
  objective: z.string(),
  actions: z.array(z.string()).min(2).max(8),
  deliverable: z.string(),
  estCost: z.number().nonnegative(),
  owner: z.string(),
  risks: z.array(z.string()),
});

export const PlaybookSchema = z.object({
  phases: z.array(PhaseSchema).min(4).max(10),
  successMetrics: z.array(z.string()).min(2),
  topRisks: z.array(z.string()).min(1),
  summary: z.string(),
});

export type Phase = z.infer<typeof PhaseSchema>;
export type Playbook = z.infer<typeof PlaybookSchema>;
