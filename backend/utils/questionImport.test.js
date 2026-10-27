import assert from 'node:assert/strict';
import { test } from 'node:test';
import XLSX from 'xlsx';
import {
    TEMPLATE_HEADERS,
    buildTemplateBuffer,
    parseQuestionWorkbook,
    toQuestionDocuments
} from './questionImport.js';
import { scoreAttempt } from './score.js';
import { normalizeTest } from './testInput.js';

function workbookBuffer(rows, bookType = 'xlsx') {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Questions');
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType }));
}

function questionRow(index, answer = 'B') {
    return [
        `Sample question number ${index}?`,
        `Option A ${index}`,
        `Option B ${index}`,
        `Option C ${index}`,
        `Option D ${index}`,
        answer,
        'General Knowledge',
        'Easy'
    ];
}

test('builds a downloadable template with headers and a sample row', () => {
    const parsed = parseQuestionWorkbook(buildTemplateBuffer(), 'template.xlsx');
    assert.equal(parsed.stats.valid, 1);
    assert.equal(parsed.questions[0].question, 'What is the capital of India?');
    assert.equal(parsed.questions[0].answer, 1);
    assert.deepEqual(TEMPLATE_HEADERS.slice(0, 6), [
        'Question',
        'Option A',
        'Option B',
        'Option C',
        'Option D',
        'Correct Answer'
    ]);
});

test('imports a valid Excel file containing 10 questions', () => {
    const rows = [TEMPLATE_HEADERS, ...Array.from({ length: 10 }, (_, index) => questionRow(index + 1))];
    const parsed = parseQuestionWorkbook(workbookBuffer(rows), 'ten.xlsx');
    assert.equal(parsed.stats.valid, 10);
    assert.equal(parsed.stats.rejected, 0);
    assert.equal(toQuestionDocuments(parsed.questions).length, 10);
});

test('imports a valid CSV file', () => {
    const rows = [TEMPLATE_HEADERS, ...Array.from({ length: 5 }, (_, index) => questionRow(index + 1))];
    const parsed = parseQuestionWorkbook(workbookBuffer(rows, 'csv'), 'five.csv');
    assert.equal(parsed.stats.valid, 5);
    assert.equal(parsed.questions[1].correctLabel, 'B');
});

test('imports a file containing 100 questions', () => {
    const rows = [TEMPLATE_HEADERS, ...Array.from({ length: 100 }, (_, index) => questionRow(index + 1))];
    const parsed = parseQuestionWorkbook(workbookBuffer(rows), 'hundred.xlsx');
    assert.equal(parsed.stats.valid, 100);
});

test('rejects a file with missing required columns', () => {
    const rows = [['Question', 'Option A', 'Option B'], ['Only two options?', 'Yes', 'No']];
    assert.throws(
        () => parseQuestionWorkbook(workbookBuffer(rows), 'missing.xlsx'),
        /Missing required column/
    );
});

test('rejects a row with missing question text', () => {
    const rows = [TEMPLATE_HEADERS, ['', 'Mumbai', 'New Delhi', 'Kolkata', 'Chennai', 'B', 'GK', 'Easy']];
    const parsed = parseQuestionWorkbook(workbookBuffer(rows), 'no-question.xlsx');
    assert.equal(parsed.stats.rejected, 1);
    assert.match(parsed.questions[0].errors[0], /Question text is empty/);
    assert.equal(parsed.questions[0].row, 2);
});

test('rejects a row with missing options', () => {
    const rows = [TEMPLATE_HEADERS, ['What is 2 + 2?', '3', '', '5', '6', 'A']];
    const parsed = parseQuestionWorkbook(workbookBuffer(rows), 'missing-option.xlsx');
    assert.equal(parsed.questions[0].status, 'rejected');
    assert.match(parsed.questions[0].errors.join(' '), /Option B is empty/);
});

test('rejects an invalid correct-answer value', () => {
    const rows = [TEMPLATE_HEADERS, ['What is 2 + 2?', '3', '4', '5', '6', 'E']];
    const parsed = parseQuestionWorkbook(workbookBuffer(rows), 'bad-answer.xlsx');
    assert.equal(parsed.questions[0].status, 'rejected');
    assert.match(parsed.questions[0].errors.join(' '), /Correct Answer must be A, B, C, or D/);
});

test('rejects an empty file', () => {
    assert.throws(
        () => parseQuestionWorkbook(workbookBuffer([[]]), 'empty.xlsx'),
        /empty/i
    );
});

test('treats empty rows as skipped, not as questions', () => {
    const rows = [TEMPLATE_HEADERS, questionRow(1), ['', '', '', '', '', ''], questionRow(2)];
    const parsed = parseQuestionWorkbook(workbookBuffer(rows), 'empty-row.xlsx');
    assert.equal(parsed.stats.valid, 2);
    assert.equal(parsed.stats.emptyRows, 1);
    assert.equal(parsed.questions.length, 2);
});

test('accepts mixed-case and spaced column headers', () => {
    const rows = [
        [' question ', 'OPTION A', 'option b', 'Option_C', 'Option-D', 'correct answer'],
        ['What is 2 + 2?', '3', '4', '5', '6', ' option b ']
    ];
    const parsed = parseQuestionWorkbook(workbookBuffer(rows), 'headers.xlsx');
    assert.equal(parsed.stats.valid, 1);
    assert.equal(parsed.questions[0].answer, 1);
    assert.equal(parsed.questions[0].correctLabel, 'B');
});

test('skips duplicate questions without overwriting', () => {
    const rows = [TEMPLATE_HEADERS, questionRow(1), questionRow(1)];
    const parsed = parseQuestionWorkbook(workbookBuffer(rows), 'dupes.xlsx', {
        existingQuestions: [{ question: 'Sample question number 1?' }]
    });
    assert.equal(parsed.stats.valid, 0);
    assert.equal(parsed.stats.skipped, 2);
    assert.equal(toQuestionDocuments(parsed.questions).length, 0);
});

test('keeps valid rows when a file also has invalid rows', () => {
    const rows = [
        TEMPLATE_HEADERS,
        questionRow(1, 'A'),
        ['Broken question', 'Only', '', '', '', 'Z'],
        questionRow(3, 'C')
    ];
    const parsed = parseQuestionWorkbook(workbookBuffer(rows), 'mixed.xlsx');
    assert.equal(parsed.stats.valid, 2);
    assert.equal(parsed.stats.rejected, 1);
    assert.equal(parsed.questions[1].row, 3);
    const documents = toQuestionDocuments(parsed.questions);
    assert.equal(documents.length, 2);
    assert.equal(documents[0].answer, 0);
    assert.equal(documents[1].answer, 2);
});

test('existing manual test save still accepts a normal question list', () => {
    const saved = normalizeTest({
        title: 'Manual test',
        description: 'Created in the admin editor',
        pointsPerQuestion: 10,
        passPercentage: 50,
        durationMinutes: 5,
        maxAttempts: 1,
        isPublished: true,
        questions: [{
            question: 'Which keyword declares a block-scoped variable that can be reassigned?',
            options: ['var', 'let', 'const', 'function'],
            answer: 1
        }]
    });
    assert.equal(saved.questions[0].answer, 1);
    assert.equal(saved.durationSeconds, 300);
});

test('maps Excel letters to the stored answer index used by scoring', () => {
    const rows = [TEMPLATE_HEADERS, [
        'What is the capital of India?',
        'Mumbai',
        'New Delhi',
        'Kolkata',
        'Chennai',
        'B'
    ]];
    const parsed = parseQuestionWorkbook(workbookBuffer(rows), 'score.xlsx');
    const questions = toQuestionDocuments(parsed.questions);
    const correct = scoreAttempt(questions, [1], { pointsPerQuestion: 10, passPercentage: 50 });
    const wrong = scoreAttempt(questions, [0], { pointsPerQuestion: 10, passPercentage: 50 });
    assert.equal(questions[0].answer, 1);
    assert.equal(correct.points, 10);
    assert.equal(correct.achieved, 'Passed');
    assert.equal(wrong.points, 0);
    assert.equal(wrong.achieved, 'Failed');
});
