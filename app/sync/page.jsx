'use client';
import React, { useState } from 'react';

export default function SyncPage() {
    const [manualId, setManualId] = useState('');
    const [manualLoading, setManualLoading] = useState(false);
    const [manualResult, setManualResult] = useState(null);

    const [fullLoading, setFullLoading] = useState(false);
    const [fullResult, setFullResult] = useState(null);

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

            {/* Info Section */}
            <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-300 mb-2">ℹ️ Setup Required</h4>
                <p className="text-sm text-gray-300">
                    To use full sync, you need to set up API tokens in your Vercel environment variables. See the <a href="https://github.com/Himanth-reddy/anilist-trakt-sync" className="text-blue-400 hover:underline">README</a> for setup instructions.
                </p>
            </div>
        </div>
    );
}
