import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminRequest, formatTime, getAdminToken, setAdminToken } from '../../helper/helper';
import '../../styles/Admin.css';

export default function AdminTests() {
    const navigate = useNavigate();
    const [tests, setTests] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    function load() {
        setLoading(true);
        adminRequest('get', '/api/admin/tests')
            .then((response) => {
                setTests(Array.isArray(response?.tests) ? response.tests : []);
                setError('');
            })
            .catch((loadError) => {
                if (!getAdminToken()) {
                    navigate('/admin/login', { replace: true });
                    return;
                }
                setError(loadError.message);
            })
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        load();
    }, []);

    async function removeTest(test) {
        const confirmed = window.confirm(`Delete "${test.title}" and its saved scores?`);
        if (!confirmed) return;
        try {
            await adminRequest('delete', `/api/admin/tests/${test.id}`);
            setTests((current) => current.filter((item) => item.id !== test.id));
        } catch (deleteError) {
            setError(deleteError.message);
        }
    }

    function logout() {
        setAdminToken('');
        navigate('/admin/login', { replace: true });
    }

    return (
        <div className="container wide">
            <div className="admin-bar">
                <Link to="/">View student site</Link>
                <button type="button" onClick={logout}>Log out</button>
            </div>
            <header className="hero">
                <p className="eyebrow">Admin</p>
                <h1 className="title compact text-light">Tests</h1>
                <p className="subtitle">Published tests appear for students. Drafts stay hidden until you publish them.</p>
            </header>
            <div className="start">
                <Link className="btn next" to="/admin/tests/new">New test</Link>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            {loading && <h3 className="text-light loading-note">Loading tests...</h3>}
            {!loading && tests.length === 0 && <p className="empty-note">No tests yet. Create one to add questions and rules.</p>}
            <div className="test-grid">
                {tests.map((test) => (
                    <article className="test-card" key={test.id}>
                        <div className="card-title">
                            <h2>{test.title}</h2>
                            <span className={test.isPublished ? 'badge pass' : 'badge draft'}>
                                {test.isPublished ? 'Published' : 'Draft'}
                            </span>
                        </div>
                        {test.description && <p>{test.description}</p>}
                        <div className="chips">
                            <span>{test.totalQuestions} questions</span>
                            <span>{test.pointsPerQuestion} pts each</span>
                            <span>{formatTime(test.durationSeconds)}</span>
                            <span>Pass {test.passPercentage}%</span>
                            <span>{test.maxAttempts ? `${test.maxAttempts} attempts` : 'Unlimited attempts'}</span>
                        </div>
                        <div className="row-actions">
                            <Link className="btn next" to={`/admin/tests/${test.id}`}>Edit</Link>
                            <Link className="btn prev" to={`/admin/results/${test.id}`}>Scores</Link>
                            <button className="btn danger" type="button" onClick={() => removeTest(test)}>Delete</button>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
