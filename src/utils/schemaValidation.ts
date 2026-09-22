import { z } from 'zod';

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Task title cannot be empty'),
  type: z.enum(['task', 'rest', 'break']).default('task'),
  durationMinutes: z.number().nonnegative(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  priority: z.enum(['p1', 'p2', 'p3', 'p4', 'high', 'medium', 'low']).optional(),
  category: z.string().default('General'),
  completed: z.boolean().default(false),
  isCompleted: z.boolean().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).passthrough();

export const BackupSchema = z.object({
  version: z.union([z.number(), z.string()]).optional(),
  exportedAt: z.string().optional(),
  daySchedules: z.record(z.string(), z.any()).optional(),
  days: z.record(z.string(), z.any()).optional(),
  categories: z.array(z.string()).optional(),
  masterRoutines: z.array(z.any()).optional(),
  routines: z.array(z.any()).optional(),
}).refine((data) => Boolean(data.daySchedules || data.days), {
  message: 'Backup must contain either "daySchedules" or "days" schedule data.',
}).passthrough();

export function validateBackupJson(data: unknown): { success: boolean; data?: any; error?: string } {
  const result = BackupSchema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map((i) => `${i.path.join('.') || 'root'}: ${i.message}`).join(', '),
    };
  }
  return { success: true, data: result.data };
}
