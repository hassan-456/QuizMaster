import React, { useEffect, useState } from 'react';
import { formatWhen, getServerData } from '../helper/helper';

export default function ResultTable({ testId = '', refreshKey = 0, highlightName = '' }) {
    const [data, setData] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);

        if (!testId) {
            setData([]);
            setError('');
            setLoading(false);
            return undefined;
        }

        getServerData(`/api/result?testId=${encodeURIComponent(testId)}`)
            .then((response) => {
                if (!active) return;
                setData(Array.isArray(response?.results) ? response.results : []);
                setError('');
            })
            .catch((loadError) => {
                if (!active) return;
                setData([]);
                setError(loadError.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [refreshKey, testId]);

    return (
        <section className="leaderboard">
            <h2 className="text-light">Top scores</h2>
            <div className="table-wrap">
                <table>
                    <thead className="table-header">
                        <tr>
                            <th>Rank</th>
                            <th>Name</th>
                            <th>Answered</th>
                            <th>Score</th>
                            <th>Result</th>
                            <th>When</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr className="table-body">
                                <td colSpan="6">Loading scores...</td>
                            </tr>
                        )}
                        {!loading && error && (
                            <tr className="table-body">
                                <td colSpan="6">{error}</td>
                            </tr>
                        )}
                        {!loading && !error && data.length === 0 && (
                            <tr className="table-body">
                                <td colSpan="6">No scores yet. Finish a quiz to appear here.</td>
                            </tr>
                        )}
                        {!loading && !error && data.map((item, index) => (
                            <tr
                                className={`table-body ${item.username === highlightName ? 'mine' : ''}`}
                                key={item.id || `${item.username}-${index}`}
                            >
                                <td>{index + 1}</td>
                                <td>{item.username || ''}</td>
                                <td>{item.attempts || 0}</td>
                                <td>{item.points || 0}{item.totalPoints ? ` / ${item.totalPoints}` : ''}</td>
                                <td>{item.achieved || ''}</td>
                                <td>{formatWhen(item.createdAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
