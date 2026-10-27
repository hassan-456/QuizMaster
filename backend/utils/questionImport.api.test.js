import assert from 'node:assert/strict';
import { test } from 'node:test';
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import router from '../router/route.js';
import Test from '../models/testSchema.js';
import { signAdmin } from './token.js';
import { TEMPLATE_HEADERS } from './questionImport.js';
import { scoreAttempt } from './score.js';

function workbookBuffer(rows, bookType = 'xlsx') {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Questions');
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType }));
}

function questionRow(index, answer = 'B') {
    return [
        `API sample question ${index}?`,
        `Alpha ${index}`,
        `Bravo ${index}`,
        `Charlie ${index}`,
        `Delta ${index}`,
        answer,
        'Science',
        'Medium'
    ];
}

function fileFrom(buffer, filename, type) {
    return new File([buffer], filename, { type });
}

async function parseResponse(response) {
    const text = await response.text();
    try {
        return { status: response.status, body: JSON.parse(text), raw: text, headers: response.headers };
    } catch {
        return { status: response.status, body: null, raw: text, headers: response.headers };
    }
}

const mongoUri = process.env.ATLAS_URI;

test('API import, duplicates, unsupported type, and quiz scoring', { skip: !mongoUri }, async (t) => {
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    const server = await new Promise((resolve) => {
        const started = app.listen(0, '127.0.0.1', () => resolve(started));
    });
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;
    const token = signAdmin({ _id: '000000000000000000000001', username: 'import-test-admin' });
    const auth = { Authorization: `Bearer ${token}` };
    let created;

    async function postFile(path, { file, fields = {}, withAuth = true } = {}) {
        const body = new FormData();
        Object.entries(fields).forEach(([key, value]) => body.append(key, value));
        if (file) body.append('file', file);
        return parseResponse(await fetch(`${base}${path}`, {
            method: 'POST',
            headers: withAuth ? auth : {},
            body
        }));
    }

    await mongoose.connect(mongoUri, {
        dbName: process.env.DB_NAME || 'quizmaster'
    });

    t.after(async () => {
        if (created?._id) await Test.deleteOne({ _id: created._id });
        await mongoose.disconnect();
        await new Promise((resolve) => server.close(resolve));
    });

    created = await Test.create({
        title: 'Excel import API test',
        description: 'Temporary test used by automated import checks.',
        pointsPerQuestion: 10,
        passPercentage: 50,
        durationSeconds: 300,
        maxAttempts: 0,
        isPublished: true,
        questions: [{
            question: 'Placeholder question already on the test?',
            options: ['One', 'Two', 'Three', 'Four'],
            answer: 1
        }]
    });

    await t.test('rejects an unsupported file type', async () => {
        const response = await postFile('/api/admin/questions/preview', {
            file: fileFrom(Buffer.from('not a spreadsheet'), 'notes.txt', 'text/plain')
        });
        assert.equal(response.status, 400);
        assert.match(response.body.message, /\.xlsx or \.csv/i);
    });

    await t.test('rejects preview without a file', async () => {
        const response = await postFile('/api/admin/questions/preview');
        assert.equal(response.status, 400);
    });

    await t.test('requires admin authentication', async () => {
        const response = await parseResponse(await fetch(`${base}/api/admin/questions/template`));
        assert.equal(response.status, 401);
    });

    await t.test('downloads the Excel template', async () => {
        const response = await fetch(`${base}/api/admin/questions/template`, { headers: auth });
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type'), /spreadsheetml/);
        const buffer = Buffer.from(await response.arrayBuffer());
        assert.ok(buffer.length > 0);
    });

    const tenFile = fileFrom(
        workbookBuffer([TEMPLATE_HEADERS, ...Array.from({ length: 10 }, (_, index) => questionRow(index + 1))]),
        'ten.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    await t.test('previews 10 valid Excel questions', async () => {
        const response = await postFile('/api/admin/questions/preview', {
            file: tenFile,
            fields: { testId: String(created._id) }
        });
        assert.equal(response.status, 200);
        assert.equal(response.body.valid, 10);
        assert.equal(response.body.rejected, 0);
    });

    await t.test('imports 10 questions into MongoDB', async () => {
        const response = await postFile(`/api/admin/tests/${created._id}/questions/import`, { file: tenFile });
        assert.equal(response.status, 200);
        assert.equal(response.body.imported, 10);
        const stored = await Test.findById(created._id).lean();
        assert.equal(stored.questions.length, 11);
        assert.equal(stored.questions[1].answer, 1);
        assert.equal(stored.questions[1].options[1], 'Bravo 1');
    });

    await t.test('skips duplicate questions on a second import', async () => {
        const response = await postFile(`/api/admin/tests/${created._id}/questions/import`, { file: tenFile });
        assert.equal(response.status, 200);
        assert.equal(response.body.imported, 0);
        assert.equal(response.body.skipped, 10);
        const stored = await Test.findById(created._id).lean();
        assert.equal(stored.questions.length, 11);
    });

    await t.test('imports a CSV file', async () => {
        const response = await postFile(`/api/admin/tests/${created._id}/questions/import`, {
            file: fileFrom(
                workbookBuffer([
                    TEMPLATE_HEADERS,
                    ['CSV capital question?', 'Paris', 'Lyon', 'Nice', 'Lille', 'A', 'Geography', 'Easy']
                ], 'csv'),
                'one.csv',
                'text/csv'
            )
        });
        assert.equal(response.status, 200);
        assert.equal(response.body.imported, 1);
    });

    await t.test('imports 100 questions', async () => {
        const response = await postFile(`/api/admin/tests/${created._id}/questions/import`, {
            file: fileFrom(
                workbookBuffer([TEMPLATE_HEADERS, ...Array.from({ length: 100 }, (_, index) => questionRow(index + 200))]),
                'hundred.xlsx',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
        });
        assert.equal(response.status, 200);
        assert.equal(response.body.imported, 100);
    });

    await t.test('rejects missing required columns', async () => {
        const response = await postFile('/api/admin/questions/preview', {
            file: fileFrom(
                workbookBuffer([['Question', 'Option A'], ['Incomplete?', 'Yes']]),
                'missing.xlsx',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
        });
        assert.equal(response.status, 400);
        assert.match(response.body.message, /Missing required column/);
    });

    await t.test('imports valid rows from a mixed file and reports rejected rows', async () => {
        const response = await postFile(`/api/admin/tests/${created._id}/questions/import`, {
            file: fileFrom(
                workbookBuffer([
                    TEMPLATE_HEADERS,
                    questionRow(900, 'A'),
                    ['Broken mixed row', 'Only', '', '', '', 'Z'],
                    questionRow(901, 'D')
                ]),
                'mixed.xlsx',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
        });
        assert.equal(response.status, 200);
        assert.equal(response.body.imported, 2);
        assert.equal(response.body.rejected, 1);
        assert.equal(response.body.errors[0].row, 3);
    });

    await t.test('imported questions appear on the public quiz API and score correctly', async () => {
        const stored = await Test.findById(created._id).lean();
        const publicResponse = await parseResponse(await fetch(`${base}/api/tests/${created._id}`));
        assert.equal(publicResponse.status, 200);
        assert.ok(publicResponse.body.questions.length >= 12);
        assert.equal(publicResponse.body.questions[0].options.length, 4);
        assert.equal(publicResponse.body.questions[0].answer, undefined);

        const imported = stored.questions.find((item) => item.question === 'API sample question 1?');
        const index = stored.questions.findIndex((item) => item.question === 'API sample question 1?');
        const answers = stored.questions.map(() => -1);
        answers[index] = imported.answer;
        const scored = scoreAttempt(stored.questions, answers, {
            pointsPerQuestion: stored.pointsPerQuestion,
            passPercentage: stored.passPercentage
        });
        assert.equal(scored.breakdown[index].isCorrect, true);
        assert.equal(scored.points, 10);
    });
});
