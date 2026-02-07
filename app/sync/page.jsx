'use client';
import React, { useEffect, useState } from 'react';

export default function SyncPage() {
    const [manualId, setManualId] = useState('');
    const [manualLoading, setManualLoading] = useState(false);
    const [manualResult, setManualResult] = useState(null);

    const [fullLoading, setFullLoading] = useState(false);
    const [fullResult, setFullResult] = useState(null);
    const [completedLoading, setCompletedLoading] = useState(false);
    const [completedResult, setCompletedResult] = useState(null);
    const [watchingLoading, setWatchingLoading] = useState(false);
    const [watchingResult, setWatchingResult] = useState(null);
    const [syncStatus, setSyncStatus] = useState(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState(null);
    const [modalItems, setModalItems] = useState([]);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [authUrl, setAuthUrl] = useState('');
    const [authCode, setAuthCode] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authResult, setAuthResult] = useState(null);

    useEffect(() => {
        fetch('/api/status', { cache: 'no-store' })
            .then(r => r.json())
            .then(setSyncStatus)
            .catch(() => { });
    }, []);

    const syncShow = async () => {
        if (!manualId.trim()) {
            setManualResult({ error: 'Please enter an AniList ID' });
            return;
        }

        setManualLoading(true);
        setManualResult(null);
        try {
            const res = await fetch(`/api/sync?anilistId=${manualId}`);
            const data = await res.json();
            setManualResult(data);
        } catch (e) {
            setManualResult({ error: e.message });
        } finally {
            setManualLoading(false);
        }
    };

    const syncAll = async () => {
        setFullLoading(true);
        setFullResult(null);
        try {
            const res = await fetch('/api/full-sync');
            const text = await res.text();

            // Try to parse as JSON
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                // If JSON parsing fails, show the raw response
                setFullResult({
                    error: `API returned non-JSON response: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`
                });
                return;
            }

            setFullResult(data);
        } catch (e) {
            setFullResult({ error: e.message });
        } finally {
            setFullLoading(false);
        }
    };

    const openPreview = async (mode) => {
        const endpoint = mode === 'completed' ? '/api/completed-sync?preview=1' : '/api/watching-sync?preview=1';
        setPreviewLoading(true);
        try {
            const res = await fetch(endpoint);
            const data = await res.json();
            if (!res.ok) {
                const msg = data?.error || 'Failed to load preview.';
                if (mode === 'completed') setCompletedResult({ error: msg });
                else setWatchingResult({ error: msg });
                return;
            }
            setModalMode(mode);
            setModalItems(Array.isArray(data.items) ? data.items : []);
            setModalOpen(true);
        } catch (e) {
            if (mode === 'completed') setCompletedResult({ error: e.message });
            else setWatchingResult({ error: e.message });
        } finally {
            setPreviewLoading(false);
        }
    };

    const runSync = async () => {
        const isCompleted = modalMode === 'completed';
        const endpoint = isCompleted ? '/api/completed-sync' : '/api/watching-sync';

        if (isCompleted) {
            setCompletedLoading(true);
            setCompletedResult(null);
        } else {
            setWatchingLoading(true);
            setWatchingResult(null);
        }

        setModalOpen(false);
        setModalItems([]);
        setModalMode(null);

        try {
            const res = await fetch(endpoint, { method: 'POST' });
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                const errMsg = `API returned non-JSON response: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`;
                if (isCompleted) setCompletedResult({ error: errMsg });
                else setWatchingResult({ error: errMsg });
                return;
            }
            if (isCompleted) setCompletedResult(data);
            else setWatchingResult(data);
        } catch (e) {
            if (isCompleted) setCompletedResult({ error: e.message });
            else setWatchingResult({ error: e.message });
        } finally {
            if (isCompleted) setCompletedLoading(false);
            else setWatchingLoading(false);
            fetch('/api/status', { cache: 'no-store' }).then(r => r.json()).then(setSyncStatus).catch(() => { });
        }
    };

    const getTraktAuthUrl = async () => {
        setAuthLoading(true);
        setAuthResult(null);
        try {
            const res = await fetch('/api/trakt-auth');
            const data = await res.json();
            if (!res.ok) {
                setAuthResult({ error: data?.error || 'Failed to get auth URL.' });
                return;
            }
            setAuthUrl(data.authUrl || '');
        } catch (e) {
            setAuthResult({ error: e.message });
        } finally {
            setAuthLoading(false);
        }
    };

    const exchangeTraktCode = async () => {
        if (!authCode.trim()) {
            setAuthResult({ error: 'Please enter the Trakt code.' });
            return;
        }
        setAuthLoading(true);
        setAuthResult(null);
        try {
            const res = await fetch('/api/trakt-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: authCode.trim() })
            });
            const data = await res.json();
            if (!res.ok) {
                setAuthResult({ error: data?.error || 'Token exchange failed.' });
                return;
            }
            setAuthResult({ message: 'Trakt tokens updated.' });
        } catch (e) {
            setAuthResult({ error: e.message });
        } finally {
            setAuthLoading(false);
        }
    };

    const ResultDisplay = ({ result }) => {
        if (!result) return null;

        if (result.error) {
            return (
                <div className="mt-4 p-4 bg-red-900/50 text-red-200 rounded border border-red-800">
                    <strong>Error:</strong> {result.error}
                </div>
            );
        }

        return (
            <div className="mt-4 p-4 bg-green-900/50 text-green-200 rounded border border-green-800">
                <p className="font-medium mb-2">✓ Sync Successful</p>
                {result.count !== undefined && <p>Episodes synced: <span className="font-mono">{result.count}</span></p>}
                {result.synced !== undefined && <p>Episodes processed: <span className="font-mono">{result.synced}</span></p>}
                {result.found !== undefined && <p>Scrobbles found: <span className="font-mono">{result.found}</span></p>}
                {result.message && <p className="text-sm mt-2 text-green-300">{result.message}</p>}
                {result.added && result.added.episodes !== undefined && (
                    <p className="text-sm mt-2 font-medium">
                        Posted to Trakt: <span className="font-mono">{result.added.episodes}</span> episodes
                    </p>
                )}
                {result.addedEpisodes !== undefined && (
                    <p className="text-sm mt-2 font-medium">
                        Posted to Trakt: <span className="font-mono">{result.addedEpisodes}</span> episodes
                    </p>
                )}
            </div>
        );
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Sync Shows</h2>

            {/* Manual Sync Section */}
            <div className="bg-gray-800 p-6 rounded-lg mb-6">
                <h3 className="text-xl font-semibold mb-4">Sync Single Show</h3>
                <p className="text-gray-400 mb-4 text-sm">
                    Sync a specific show by entering its AniList ID. This will fetch the show metadata and store episode mappings.
                </p>

                <div className="flex gap-3 mb-2">
                    <input
                        type="text"
                        value={manualId}
                        onChange={(e) => setManualId(e.target.value)}
                        placeholder="Enter AniList ID (e.g., 1 for Cowboy Bebop)"
                        className="flex-1 px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                        onKeyPress={(e) => e.key === 'Enter' && syncShow()}
                    />
                    <button
                        onClick={syncShow}
                        disabled={manualLoading}
                        className={`px-6 py-2 rounded font-medium transition-colors ${manualLoading
                            ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                    >
                        {manualLoading ? 'Syncing...' : 'Sync Show'}
                    </button>
                </div>

                <ResultDisplay result={manualResult} />
            </div>

            {/* Full Sync Section */}
            <div className="bg-gray-800 p-6 rounded-lg mb-6">
                <h3 className="text-xl font-semibold mb-4">Full AniList Sync</h3>
                <div className="bg-yellow-900/30 border border-yellow-800 p-3 rounded mb-4 text-sm">
                    <p className="font-medium text-yellow-300 mb-1">⚠️ Important Setup</p>
                    <ol className="text-gray-300 list-decimal list-inside space-y-1">
                        <li>First, refresh the Fribbs database using the <strong>Dashboard</strong> page</li>
                        <li>Ensure <code className="bg-gray-900 px-1">ANILIST_ACCESS_TOKEN</code> and <code className="bg-gray-900 px-1">TRAKT_ACCESS_TOKEN</code> are set in Render</li>
                        <li>The system will automatically find Trakt IDs for your shows</li>
                    </ol>
                </div>

                <button
                    onClick={syncAll}
                    disabled={fullLoading}
                    className={`px-6 py-2 rounded font-medium transition-colors ${fullLoading
                        ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                >
                    {fullLoading ? 'Syncing...' : 'Sync All Watched'}
                </button>

                <ResultDisplay result={fullResult} />
                {fullResult?.lastRun && (
                    <p className="text-xs text-gray-500 mt-2 text-right">Last run: {new Date(fullResult.lastRun).toLocaleString()}</p>
                )}
            </div>

            {/* Completed Sync Section */}
            <div className="bg-gray-800 p-6 rounded-lg mb-6">
                <h3 className="text-xl font-semibold mb-4">Completed Sync</h3>
                <p className="text-gray-400 mb-4 text-sm">
                    Sync all completed anime from AniList into Trakt. Uses AniList completed date if present; otherwise uses today.
                </p>

                <button
                    onClick={() => openPreview('completed')}
                    disabled={completedLoading || previewLoading}
                    className={`px-6 py-2 rounded font-medium transition-colors ${completedLoading
                        ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                >
                    {completedLoading ? 'Syncing...' : 'Sync Completed'}
                </button>

                <ResultDisplay result={completedResult} />
                {previewLoading && (
                    <p className="text-xs text-gray-400 mt-2">Preparing list…</p>
                )}
                {completedLoading && (
                    <p className="text-xs text-gray-400 mt-2">Sync in progress…</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                    Last completed sync: {syncStatus?.lastCompletedSync ? new Date(syncStatus.lastCompletedSync).toLocaleString() : 'Never'}
                </p>
            </div>

            {/* Watching Sync Section */}
            <div className="bg-gray-800 p-6 rounded-lg mb-6">
                <h3 className="text-xl font-semibold mb-4">Watching Sync</h3>
                <p className="text-gray-400 mb-4 text-sm">
                    Sync all currently watching anime from AniList into Trakt using today’s date.
                </p>

                <button
                    onClick={() => openPreview('watching')}
                    disabled={watchingLoading || previewLoading}
                    className={`px-6 py-2 rounded font-medium transition-colors ${watchingLoading
                        ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                >
                    {watchingLoading ? 'Syncing...' : 'Sync Watching'}
                </button>

                <ResultDisplay result={watchingResult} />
                {previewLoading && (
                    <p className="text-xs text-gray-400 mt-2">Preparing list…</p>
                )}
                {watchingLoading && (
                    <p className="text-xs text-gray-400 mt-2">Sync in progress…</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                    Last watching sync: {syncStatus?.lastWatchingSync ? new Date(syncStatus.lastWatchingSync).toLocaleString() : 'Never'}
                </p>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl p-5">
                        <h4 className="text-lg font-semibold mb-3">
                            {modalMode === 'completed' ? 'Confirm Completed Sync' : 'Confirm Watching Sync'}
                        </h4>
                        <div className="max-h-[400px] overflow-y-auto text-sm space-y-2">
                            {modalItems.length === 0 ? (
                                <p className="text-gray-400">No items to sync.</p>
                            ) : (
                                modalItems.map((item, idx) => (
                                    <div key={idx} className="border-b border-gray-800 pb-2">
                                        <div className="font-medium">{item.titleEnglish}</div>
                                        {modalMode === 'completed' ? (
                                            <div className="text-gray-400">
                                                Watched at: {new Date(item.watchedAt).toLocaleString()}
                                            </div>
                                        ) : (
                                            <div className="text-gray-400">
                                                Episodes: {item.progress}{item.totalEpisodes ? ` / ${item.totalEpisodes}` : ''} • Date: {new Date(item.watchedAt).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => { setModalOpen(false); setModalItems([]); setModalMode(null); }}
                                className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={runSync}
                                className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Section */}
            <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-300 mb-2">ℹ️ Setup Required</h4>
                <p className="text-sm text-gray-300">
                    To use full sync, you need to set up API tokens in your Render environment variables. See the <a href="https://github.com/Himanth-reddy/anilist-trakt-sync" className="text-blue-400 hover:underline">README</a> for setup instructions.
                </p>
            </div>

            {/* Trakt Auth Section */}
            <div className="bg-gray-800 p-6 rounded-lg mb-6">
                <h3 className="text-xl font-semibold mb-4">Trakt Auth</h3>
                <p className="text-gray-400 mb-4 text-sm">
                    Use this to re-authorize Trakt and update tokens in the database.
                </p>

                <div className="flex gap-3 mb-3">
                    <button
                        onClick={getTraktAuthUrl}
                        disabled={authLoading}
                        className={`px-4 py-2 rounded font-medium transition-colors ${authLoading
                            ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                    >
                        {authLoading ? 'Loading...' : 'Get Auth URL'}
                    </button>
                    {authUrl && (
                        <a
                            href={authUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 rounded font-medium bg-gray-700 hover:bg-gray-600 text-white"
                        >
                            Open Trakt Auth
                        </a>
                    )}
                </div>

                <div className="flex gap-3 mb-2">
                    <input
                        type="text"
                        value={authCode}
                        onChange={(e) => setAuthCode(e.target.value)}
                        placeholder="Paste Trakt auth code here"
                        className="flex-1 px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                        onClick={exchangeTraktCode}
                        disabled={authLoading}
                        className={`px-4 py-2 rounded font-medium transition-colors ${authLoading
                            ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                    >
                        {authLoading ? 'Saving...' : 'Save Code'}
                    </button>
                </div>

                {authResult?.error && (
                    <div className="text-red-400 text-sm mt-2">{authResult.error}</div>
                )}
                {authResult?.message && (
                    <div className="text-green-400 text-sm mt-2">{authResult.message}</div>
                )}
            </div>
        </div>
    );
}
