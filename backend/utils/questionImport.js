import XLSX from 'xlsx';
import {
    MAX_IMPORT_QUESTIONS,
    MAX_QUESTION_LENGTH,
    MIN_QUESTION_LENGTH
} from './limits.js';

const LETTER_INDEX = { a: 0, b: 1, c: 2, d: 3 };
const OPTION_KEYS = ['optionA', 'optionB', 'optionC', 'optionD'];

const HEADER_ALIASES = {
    question: ['question', 'question text', 'questions'],
    optionA: ['option a', 'optiona', 'a'],
    optionB: ['option b', 'optionb', 'b'],
    optionC: ['option c', 'optionc', 'c'],
    optionD: ['option d', 'optiond', 'd'],
    correctAnswer: ['correct answer', 'correctanswer', 'answer', 'correct', 'correct option'],
    category: ['category'],
    difficulty: ['difficulty', 'level']
};

const REQUIRED_FIELDS = ['question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer'];

export const TEMPLATE_HEADERS = [
    'Question',
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Correct Answer',
    'Category',
    'Difficulty'
];

export const TEMPLATE_SAMPLE = [
    'What is the capital of India?',
    'Mumbai',
    'New Delhi',
    'Kolkata',
    'Chennai',
    'B',
    'General Knowledge',
    'Easy'
];

function fail(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    throw error;
}

export function normalizeHeader(value) {
    return String(value ?? '')
        .replace(/^\uFEFF/, '')
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ');
}

export function normalizeQuestionText(value) {
    return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function cellText(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\r\n/g, '\n').trim();
}

function isEmptyRow(cells) {
    return cells.every((cell) => cellText(cell) === '');
}

function mapHeaders(headerRow) {
    const columns = {};
    headerRow.forEach((cell, index) => {
        const normalized = normalizeHeader(cell);
        if (!normalized) return;
        Object.entries(HEADER_ALIASES).forEach(([field, aliases]) => {
            if (columns[field] === undefined && aliases.includes(normalized)) {
                columns[field] = index;
            }
        });
    });
    return columns;
}

function missingRequiredColumns(columns) {
    const labels = {
        question: 'Question',
        optionA: 'Option A',
        optionB: 'Option B',
        optionC: 'Option C',
        optionD: 'Option D',
        correctAnswer: 'Correct Answer'
    };
    return REQUIRED_FIELDS
        .filter((field) => columns[field] === undefined)
        .map((field) => labels[field]);
}

function parseCorrectAnswer(value) {
    const raw = cellText(value).toLowerCase().replace(/^option\s+/, '');
    if (Object.prototype.hasOwnProperty.call(LETTER_INDEX, raw)) {
        return { index: LETTER_INDEX[raw], label: raw.toUpperCase() };
    }
    return { error: 'Correct Answer must be A, B, C, or D.' };
}

function validateRow(cells, columns, excelRow) {
    const question = cellText(cells[columns.question]);
    const options = OPTION_KEYS.map((key) => cellText(cells[columns[key]]));
    const category = columns.category === undefined ? '' : cellText(cells[columns.category]);
    const difficulty = columns.difficulty === undefined ? '' : cellText(cells[columns.difficulty]);
    const errors = [];

    if (!question) errors.push('Question text is empty.');
    else if (question.length < MIN_QUESTION_LENGTH || question.length > MAX_QUESTION_LENGTH) {
        errors.push(`Question text must be ${MIN_QUESTION_LENGTH}–${MAX_QUESTION_LENGTH} characters.`);
    }

    options.forEach((option, index) => {
        if (!option) errors.push(`Option ${String.fromCharCode(65 + index)} is empty.`);
    });

    const filledOptions = options.filter(Boolean);
    if (filledOptions.length === 4 && new Set(filledOptions.map((option) => option.toLowerCase())).size !== 4) {
        errors.push('Options must be unique.');
    }

    const correct = parseCorrectAnswer(cells[columns.correctAnswer]);
    if (correct.error) errors.push(correct.error);
    else if (!options[correct.index]) {
        errors.push(`Correct Answer ${correct.label} does not match a filled option.`);
    }

    return {
        row: excelRow,
        question,
        options,
        answer: correct.error ? null : correct.index,
        correctLabel: correct.error ? cellText(cells[columns.correctAnswer]) : correct.label,
        category,
        difficulty,
        status: errors.length ? 'rejected' : 'valid',
        errors
    };
}

function readSheetRows(buffer, originalName = '') {
    if (!buffer || !buffer.length) fail('The uploaded file is empty.');

    const name = String(originalName || '').toLowerCase();
    let workbook;
    try {
        workbook = XLSX.read(buffer, {
            type: 'buffer',
            raw: false,
            cellDates: false
        });
    } catch {
        fail(name.endsWith('.csv')
            ? 'Could not read that CSV file. Check the encoding and column headers.'
            : 'Could not read that Excel file. Upload a valid .xlsx or .csv file.');
    }

    const sheetName = workbook.SheetNames?.[0];
    if (!sheetName) fail('The uploaded file does not contain a worksheet.');

    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        blankrows: true,
        raw: false
    });
}

export function parseQuestionWorkbook(buffer, originalName = '', { existingQuestions = [] } = {}) {
    const rows = readSheetRows(buffer, originalName);
    const headerIndex = rows.findIndex((row) => Array.isArray(row) && !isEmptyRow(row));
    if (headerIndex === -1) fail('The uploaded file is empty.');

    const columns = mapHeaders(rows[headerIndex] || []);
    const missing = missingRequiredColumns(columns);
    if (missing.length) {
        fail(`Missing required column${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}.`);
    }

    const seen = new Set(
        (Array.isArray(existingQuestions) ? existingQuestions : [])
            .map((item) => normalizeQuestionText(item?.question))
            .filter(Boolean)
    );

    const questions = [];
    let emptyRows = 0;
    let dataCount = 0;

    for (let index = headerIndex + 1; index < rows.length; index += 1) {
        const excelRow = index + 1;
        const cells = Array.isArray(rows[index]) ? rows[index] : [];
        if (isEmptyRow(cells)) {
            emptyRows += 1;
            continue;
        }

        dataCount += 1;
        if (dataCount > MAX_IMPORT_QUESTIONS) {
            questions.push({
                row: excelRow,
                question: cellText(cells[columns.question]),
                options: OPTION_KEYS.map((key) => cellText(cells[columns[key]])),
                answer: null,
                correctLabel: cellText(cells[columns.correctAnswer]),
                category: columns.category === undefined ? '' : cellText(cells[columns.category]),
                difficulty: columns.difficulty === undefined ? '' : cellText(cells[columns.difficulty]),
                status: 'rejected',
                errors: [`A file can contain at most ${MAX_IMPORT_QUESTIONS} questions.`]
            });
            continue;
        }

        const parsed = validateRow(cells, columns, excelRow);
        if (parsed.status === 'valid') {
            const key = normalizeQuestionText(parsed.question);
            if (seen.has(key)) {
                parsed.status = 'skipped';
                parsed.errors = ['Duplicate question. Existing questions are not overwritten.'];
            } else {
                seen.add(key);
            }
        }
        questions.push(parsed);
    }

    const valid = questions.filter((item) => item.status === 'valid');
    const skipped = questions.filter((item) => item.status === 'skipped');
    const rejected = questions.filter((item) => item.status === 'rejected');

    if (!questions.length) {
        fail('The file does not contain any questions.');
    }

    return {
        questions,
        stats: {
            totalRows: questions.length,
            emptyRows,
            valid: valid.length,
            skipped: skipped.length,
            rejected: rejected.length
        }
    };
}

export function toQuestionDocuments(rows) {
    return rows
        .filter((row) => row.status === 'valid')
        .map((row) => ({
            question: row.question,
            options: [...row.options],
            answer: row.answer,
            category: row.category || '',
            difficulty: row.difficulty || ''
        }));
}

export function buildTemplateBuffer() {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_SAMPLE]);
    sheet['!cols'] = [
        { wch: 42 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 22 },
        { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(workbook, sheet, 'Questions');
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}
