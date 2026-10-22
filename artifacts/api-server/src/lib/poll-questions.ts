import { z } from "zod/v4";

export const pollQuestionsSchema = z.array(z.object({
  title: z.string().trim().min(1).max(300),
  options: z.array(z.string().trim().min(1).max(200)).min(2).max(12)
    .refine(options => new Set(options.map(o => o.toLowerCase())).size === options.length, "Answer options must be distinct"),
})).min(1).max(20);
export type PollQuestion = z.infer<typeof pollQuestionsSchema>[number];

export function questionsFor(poll: { title: string; options: unknown; questions?: unknown }): PollQuestion[] {
  const parsed = pollQuestionsSchema.safeParse(poll.questions);
  return parsed.success ? parsed.data : [{ title: poll.title, options: (poll.options as { label: string }[]).map(o => o.label) }];
}
export function validateAnswers(questions: PollQuestion[], answers: unknown): answers is number[] {
  return Array.isArray(answers) && answers.length === questions.length && answers.every((value, i) => Number.isInteger(value) && value >= 0 && value < questions[i]!.options.length);
}
export function questionResults(questions: PollQuestion[], votes: { optionIndex: number; answers?: unknown }[]) {
  return questions.map((question, i) => {
    const answers = votes.map(vote => Array.isArray(vote.answers) && vote.answers.length ? vote.answers[i] : i === 0 ? vote.optionIndex : undefined).filter(value => Number.isInteger(value) && value >= 0 && value < question.options.length);
    return { title: question.title, total: answers.length, options: question.options.map((label, index) => {
      const count = answers.filter(value => value === index).length;
      return { label, index, votes: count, pct: answers.length ? Math.round(count / answers.length * 100) : 0 };
    }) };
  });
}
