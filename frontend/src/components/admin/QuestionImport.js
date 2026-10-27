import React, { useRef, useState } from 'react';
import { adminDownload, adminUpload } from '../../helper/helper';

const ACCEPT = '.xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv';

function formatSize(bytes) {
    const size = Number(bytes) || 0;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function statusLabel(status) {
    if (status === 'valid') return 'Ready';
    if (status === 'skipped') return 'Duplicate';
    return 'Rejected';
}

export default function QuestionImport({ testId, isNew, existingQuestions, onImported, onApplyToForm }) {
    const inputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [loading, setLoading] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [preview, setPreview] = useState(null);
    const [importValidOnly, setImportValidOnly] = useState(true);

    function resetImport() {
        setFile(null);
        setPreview(null);
        setError('');
        setNotice('');
        setDragOver(false);
        if (inputRef.current) inputRef.current.value = '';
    }

    async function previewFile(nextFile) {
        if (!nextFile) return;
        setFile(nextFile);
        setLoading('preview');
        setError('');
        setNotice('');
        setPreview(null);
        try {
            const body = new FormData();
            body.append('file', nextFile);
            if (!isNew && testId) body.append('testId', testId);
            if (existingQuestions?.length) {
                body.append('existingQuestions', JSON.stringify(
                    existingQuestions.map((item) => ({ question: item.question }))
                ));
            }
            const response = await adminUpload('/api/admin/questions/preview', body);
            setPreview(response);
            if (response.rejected > 0) {
                setNotice('Some rows have errors. Review them before importing.');
            } else if (response.valid === 0) {
                setNotice('No new questions are ready to import.');
            }
        } catch (previewError) {
            setError(previewError.message);
        } finally {
            setLoading('');
        }
    }

    function onSelect(event) {
        const nextFile = event.target.files?.[0];
        previewFile(nextFile);
    }

    function onDrop(event) {
        event.preventDefault();
        setDragOver(false);
        const nextFile = event.dataTransfer.files?.[0];
        previewFile(nextFile);
    }

    async function downloadTemplate() {
        setError('');
        try {
            await adminDownload('/api/admin/questions/template', 'quizmaster-questions-template.xlsx');
        } catch (downloadError) {
            setError(downloadError.message);
        }
    }

    function formReadyQuestions() {
        const seen = new Set(
            (existingQuestions || [])
                .map((item) => String(item?.question || '').trim().toLowerCase().replace(/\s+/g, ' '))
                .filter(Boolean)
        );
        return (preview?.questions || [])
            .filter((row) => row.status === 'valid')
            .filter((row) => {
                const key = String(row.question || '').trim().toLowerCase().replace(/\s+/g, ' ');
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .map((row) => ({
                question: row.question,
                options: [...row.options],
                answer: row.answer,
                category: row.category || '',
                difficulty: row.difficulty || ''
            }));
    }

    async function confirmImport() {
        if (!file || !preview) return;
        if (!importValidOnly && preview.rejected > 0) {
            setError('Fix the rejected rows, or choose to import valid questions only.');
            return;
        }
        if (preview.valid === 0) {
            setError('There are no valid new questions to import.');
            return;
        }

        setLoading('import');
        setError('');
        setNotice('');
        try {
            if (isNew || !testId) {
                const questions = formReadyQuestions();
                if (!questions.length) {
                    setError('There are no valid new questions to add to this test.');
                    return;
                }
                onApplyToForm(questions);
                setNotice(`Added ${questions.length} question${questions.length === 1 ? '' : 's'} to this test. Save the test to keep them.`);
                setPreview(null);
                setFile(null);
                if (inputRef.current) inputRef.current.value = '';
                return;
            }

            const body = new FormData();
            body.append('file', file);
            body.append('importValidOnly', importValidOnly ? 'true' : 'false');
            const response = await adminUpload(`/api/admin/tests/${testId}/questions/import`, body);
            onImported(response);
            setNotice(response.message || `Imported ${response.imported} questions.`);
            setPreview(null);
            setFile(null);
            if (inputRef.current) inputRef.current.value = '';
        } catch (importError) {
            setError(importError.message);
        } finally {
            setLoading('');
        }
    }

    const busy = Boolean(loading);

    return (
        <section className="import-panel">
            <div className="import-header">
                <div>
                    <h3>Import questions from Excel</h3>
                    <p className="hint">
                        Upload an .xlsx or .csv file with Question, Option A–D, and Correct Answer (A, B, C, or D).
                        Category and Difficulty are optional.
                    </p>
                </div>
                <button type="button" className="btn prev" onClick={downloadTemplate} disabled={busy}>
                    Download Excel Template
                </button>
            </div>

            <div
                className={`drop-zone${dragOver ? ' active' : ''}`}
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
            >
                <input
                    ref={inputRef}
                    id="question-import-file"
                    type="file"
                    accept={ACCEPT}
                    onChange={onSelect}
                    disabled={busy}
                />
                <label htmlFor="question-import-file">
                    {file ? 'Choose a different file' : 'Choose an Excel or CSV file'}
                </label>
                <p>or drag and drop it here</p>
                {file && (
                    <p className="file-meta">
                        {file.name} · {formatSize(file.size)}
                    </p>
                )}
            </div>

            {loading === 'preview' && <p className="loading-note">Reading and validating the file...</p>}
            {loading === 'import' && <p className="loading-note">Importing questions...</p>}
            {error && <p className="form-error" role="alert">{error}</p>}
            {notice && <p className="notice">{notice}</p>}

            {preview && (
                <div className="import-preview">
                    <div className="import-stats">
                        <span>{preview.valid} ready</span>
                        <span>{preview.skipped} skipped</span>
                        <span>{preview.rejected} rejected</span>
                    </div>
                    <label className="check-line" htmlFor="import-valid-only">
                        <input
                            id="import-valid-only"
                            type="checkbox"
                            checked={importValidOnly}
                            onChange={(event) => setImportValidOnly(event.target.checked)}
                            disabled={busy}
                        />
                        Import valid rows only and skip duplicates
                    </label>
                    <div className="table-wrap">
                        <table className="preview-table">
                            <thead>
                                <tr>
                                    <th>Row</th>
                                    <th>Status</th>
                                    <th>Question</th>
                                    <th>A</th>
                                    <th>B</th>
                                    <th>C</th>
                                    <th>D</th>
                                    <th>Correct</th>
                                    <th>Category</th>
                                    <th>Difficulty</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.questions.map((row) => (
                                    <tr key={`preview-${row.row}`} className={row.status}>
                                        <td>{row.row}</td>
                                        <td>{statusLabel(row.status)}</td>
                                        <td>{row.question}</td>
                                        <td>{row.options?.[0]}</td>
                                        <td>{row.options?.[1]}</td>
                                        <td>{row.options?.[2]}</td>
                                        <td>{row.options?.[3]}</td>
                                        <td>{row.correctLabel || '—'}</td>
                                        <td>{row.category || '—'}</td>
                                        <td>{row.difficulty || '—'}</td>
                                        <td>{row.errors?.length ? row.errors.join(' ') : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="row-actions">
                        <button
                            type="button"
                            className="btn next"
                            onClick={confirmImport}
                            disabled={busy || preview.valid === 0}
                        >
                            {loading === 'import' ? 'Importing...' : 'Import Questions'}
                        </button>
                        <button type="button" className="btn danger" onClick={resetImport} disabled={busy}>
                            Cancel import
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
