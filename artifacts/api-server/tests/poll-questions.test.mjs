import test from 'node:test';
import assert from 'node:assert/strict';
import { pollQuestionsSchema, questionsFor, validateAnswers, questionResults } from '../src/lib/poll-questions.ts';
const questions = [{ title: 'Water access?', options: ['Daily', 'Weekly'] }, { title: 'Road condition?', options: ['Good', 'Fair', 'Poor'] }];
test('all questions need one valid answer; index zero is valid', () => {
  assert.equal(validateAnswers(questions, [0, 2]), true);
  for (const answers of [[0], [0, 3], [0, -1], [0, 1.5], [0, '1'], [0, 1, 2], null]) assert.equal(validateAnswers(questions, answers), false);
});
test('question validation rejects empty, duplicate and oversized options', () => {
  assert.equal(pollQuestionsSchema.safeParse(questions).success, true);
  for (const options of [['a'], ['a', ' A '], ['a', ''], Array.from({length: 13}, (_, i) => String(i))]) assert.equal(pollQuestionsSchema.safeParse([{ title: 'Question', options }]).success, false);
  assert.equal(pollQuestionsSchema.safeParse(Array(21).fill(questions[0])).success, false);
});
test('old single-question polls remain readable without rewriting votes', () => {
  assert.deepEqual(questionsFor({ title: 'Original question', options: [{ label: 'Yes' }, { label: 'No' }], questions: [] }), [{ title: 'Original question', options: ['Yes', 'No'] }]);
});
test('per-question results preserve legacy first answers without fabricating later answers', () => {
  const result = questionResults(questions, [{ optionIndex: 1, answers: [] }, { optionIndex: 0, answers: [0, 2] }]);
  assert.equal(result[0].total, 2);
  assert.deepEqual(result[0].options.map(o => o.votes), [1, 1]);
  assert.equal(result[1].total, 1);
  assert.deepEqual(result[1].options.map(o => o.votes), [0, 0, 1]);
});
