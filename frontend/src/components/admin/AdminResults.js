import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminRequest, formatWhen, getAdminToken, setAdminToken } from '../../helper/helper';
import '../../styles/Admin.css';

export default function AdminResults() {
    const { testId } = useParams();
    const navigate = useNavigate();
    const [test, setTest] = useState(null);
    const [results, setResults] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        adminRequest('get', `/api/admin/tests/${testId}/results`)
            .then((response) => {
                if (!active) return;
                setTest(response.test || null);
                setResults(Array.isArray(response.results) ? response.results : []);
                setError('');
            })
            .catch((loadError) => {
                if (!active) return;
                if (!getAdminToken()) {
                    navigate('/admin/login', { replace: true });
                    return;
                }
                setError(loadError.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [navigate, testId]);

    function logout() {
        setAdminToken('');
        navigate('/admin/login', { replace: true });
    }

    return (
        <div className="container wide">
            <div className="admin-bar">
                <Link to="/admin">All tests</Link>
                <button type="button" onClick={logout}>Log out</button>
            </div>
            <header className="hero">
                <p className="eyebrow">Scores</p>
                <h1 className="title compact text-light">{test?.title || 'Test scores'}</h1>
            </header>
            {loading && <h3 className="text-light">Loading scores...</h3>}
            {error && <p className="form-error" role="alert">{error}</p>}
            {!loading && !error && (
                <div className="table-wrap">
                    <table>
                        <thead className="table-header">
                            <tr>
                                <th>Name</th>
                                <th>Answered</th>
                                <th>Score</th>
                                <th>Result</th>
                                <th>When</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.length === 0 && (
                                <tr className="table-body">
                                    <td colSpan="5">No one has taken this test yet.</td>
                                </tr>
                            )}
                            {results.map((item) => (
                                <tr className="table-body" key={item.id}>
                                    <td>{item.username}</td>
                                    <td>{item.attempts || 0}</td>
                                    <td>{item.points || 0} / {item.totalPoints || 0}</td>
                                    <td>{item.achieved}</td>
                                    <td>{formatWhen(item.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
