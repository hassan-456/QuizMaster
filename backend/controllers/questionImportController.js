import mongoose from 'mongoose';
import Test from '../models/testSchema.js';
import { presentTest, sendError } from './adminController.js';
import { MAX_QUESTIONS_PER_TEST } from '../utils/limits.js';
import { buildTemplateBuffer, parseQuestionWorkbook, toQuestionDocuments } from '../utils/questionImport.js';

const importLocks = new Set();

function presentPreviewRow(row) {
    return {
        row: row.row,
        question: row.question,
        options: [...row.options],
        answer: row.answer,
        correctLabel: row.correctLabel,
        category: row.category || '',
        difficulty: row.difficulty || '',
        status: row.status,
        errors: [...row.errors]
    };
}

export function downloadTemplate(req, res) {
    const buffer = buildTemplateBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="quizmaster-questions-template.xlsx"');
    return res.status(200).send(buffer);
}

function readClientQuestionHints(value) {
    if (!value) return [];
    try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (!Array.isArray(parsed)) return [];
        return parsed.map((item) => ({
            question: typeof item === 'string' ? item : String(item?.question || '')
        }));
    } catch {
        return [];
    }
}

async function existingQuestionsFor(testId) {
    if (!testId) return [];
    if (!mongoose.isValidObjectId(testId)) return [];
    const test = await Test.findById(testId).select('questions.question').lean();
    return test?.questions || [];
}

export async function previewQuestions(req, res) {
    try {
        if (!req.file?.buffer) {
            return res.status(400).json({ success: false, message: 'Choose an Excel .xlsx or .csv file to upload.' });
        }

        const existingQuestions = [
            ...(await existingQuestionsFor(req.body?.testId || req.query?.testId)),
            ...readClientQuestionHints(req.body?.existingQuestions)
        ];
        const parsed = parseQuestionWorkbook(req.file.buffer, req.file.originalname, { existingQuestions });

        return res.status(200).json({
            success: true,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            ...parsed.stats,
            questions: parsed.questions.map(presentPreviewRow)
        });
    } catch (error) {
        return sendError(res, error);
    }
}

export async function importQuestions(req, res) {
    const testId = req.params.id;
    if (!mongoose.isValidObjectId(testId)) {
        return res.status(404).json({ success: false, message: 'Test not found.' });
    }
    if (importLocks.has(testId)) {
        return res.status(409).json({ success: false, message: 'An import is already running for this test. Wait for it to finish.' });
    }

    importLocks.add(testId);
    try {
        if (!req.file?.buffer) {
            return res.status(400).json({ success: false, message: 'Choose an Excel .xlsx or .csv file to upload.' });
        }

        const test = await Test.findById(testId);
        if (!test) return res.status(404).json({ success: false, message: 'Test not found.' });

        const parsed = parseQuestionWorkbook(req.file.buffer, req.file.originalname, {
            existingQuestions: test.questions
        });

        const importValidOnly = String(req.body?.importValidOnly ?? 'true') !== 'false';
        if (!importValidOnly && parsed.stats.rejected > 0) {
            return res.status(400).json({
                success: false,
                message: 'Import cancelled because the file contains invalid rows. Fix those rows or choose to import valid questions only.',
                imported: 0,
                skipped: parsed.stats.skipped,
                rejected: parsed.stats.rejected,
                errors: parsed.questions
                    .filter((row) => row.status === 'rejected')
                    .map((row) => ({ row: row.row, errors: row.errors }))
            });
        }

        const incoming = toQuestionDocuments(parsed.questions);
        const remaining = MAX_QUESTIONS_PER_TEST - test.questions.length;
        if (remaining <= 0) {
            return res.status(400).json({
                success: false,
                message: `This test already has the maximum of ${MAX_QUESTIONS_PER_TEST} questions.`
            });
        }

        const accepted = incoming.slice(0, remaining);
        const overflow = incoming.length - accepted.length;
        if (!accepted.length) {
            return res.status(200).json({
                success: true,
                message: 'No new questions were imported.',
                imported: 0,
                skipped: parsed.stats.skipped + overflow,
                rejected: parsed.stats.rejected,
                duplicates: parsed.questions
                    .filter((row) => row.status === 'skipped')
                    .map((row) => ({ row: row.row, question: row.question })),
                errors: parsed.questions
                    .filter((row) => row.status === 'rejected')
                    .map((row) => ({ row: row.row, errors: row.errors })),
                test: presentTest(test)
            });
        }

        test.questions.push(...accepted);
        await test.save();

        return res.status(200).json({
            success: true,
            message: overflow
                ? `Imported ${accepted.length} questions. ${overflow} valid question${overflow === 1 ? '' : 's'} skipped because this test can hold ${MAX_QUESTIONS_PER_TEST} questions.`
                : `Imported ${accepted.length} question${accepted.length === 1 ? '' : 's'}.`,
            imported: accepted.length,
            skipped: parsed.stats.skipped + overflow,
            rejected: parsed.stats.rejected,
            duplicates: parsed.questions
                .filter((row) => row.status === 'skipped')
                .map((row) => ({ row: row.row, question: row.question })),
            errors: parsed.questions
                .filter((row) => row.status === 'rejected')
                .map((row) => ({ row: row.row, errors: row.errors })),
            test: presentTest(test)
        });
    } catch (error) {
        return sendError(res, error);
    } finally {
        importLocks.delete(testId);
    }
}
