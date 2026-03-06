import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import type {
  EntityPackListResponse,
  EntityPackDownloadResponse,
} from '@asm-kyc/shared';
import { FolderOpen, Folder } from 'lucide-react';

interface EntityPackScreenProps {
  onNavigateToUser: (userId: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EntityPackScreen({ onNavigateToUser }: EntityPackScreenProps) {
  const [data, setData] = useState<EntityPackListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadPacks = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<EntityPackListResponse>('/admin/entity-packs');
      setData(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPacks();
  }, []);

  const toggleFolder = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleDownload = async (key: string) => {
    setDownloading(key);
    try {
      const res = await apiFetch<EntityPackDownloadResponse>(
        `/admin/entity-packs/download?key=${encodeURIComponent(key)}`,
      );
      window.open(res.url, '_blank');
    } catch {
      alert('Failed to generate download link');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!data) return <div className="page-error">Failed to load entity packs</div>;

  const filteredFolders = data.folders.filter((f) =>
    f.user_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div>
      <div className="page-header">
        <h1>Entity Packs</h1>
        <span className="page-header-count">
          {data.total_packs} pack{data.total_packs !== 1 ? 's' : ''} across{' '}
          {data.folders.length} user{data.folders.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by user name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            width: 300,
            fontSize: 14,
          }}
        />
      </div>

      {filteredFolders.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 48,
            color: '#9ca3af',
            fontSize: 15,
          }}
        >
          {searchTerm
            ? 'No users match your search'
            : 'No entity packs generated yet. Packs are created when miners complete surveys.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredFolders.map((folder) => {
            const isExpanded = expandedUsers.has(folder.user_id);
            const roleLabel =
              folder.user_role.split('_')[0]?.toLowerCase() ?? folder.user_role;

            return (
              <div
                key={folder.user_id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  background: '#fff',
                  overflow: 'hidden',
                }}
              >
                {/* Folder header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    gap: 12,
                  }}
                  onClick={() => toggleFolder(folder.user_id)}
                >
                  <span style={{ color: 'var(--color-gold)', display: 'flex', alignItems: 'center' }}>
                    {isExpanded ? <FolderOpen size={20} /> : <Folder size={20} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {folder.user_name}
                    </span>
                    <span
                      style={{ color: '#6b7280', marginLeft: 8, fontSize: 13 }}
                    >
                      ({roleLabel})
                    </span>
                  </div>
                  <span
                    style={{ color: '#6b7280', fontSize: 13, whiteSpace: 'nowrap' }}
                  >
                    {folder.pack_count} pack{folder.pack_count !== 1 ? 's' : ''}
                  </span>
                  {folder.latest_date && (
                    <span
                      style={{
                        color: '#9ca3af',
                        fontSize: 12,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Latest: {new Date(folder.latest_date).toLocaleDateString()}
                    </span>
                  )}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToUser(folder.user_id);
                    }}
                  >
                    View User
                  </button>
                </div>

                {/* Expanded pack list */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #e5e7eb' }}>
                    <table className="data-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Filename</th>
                          <th>Size</th>
                          <th>Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {folder.packs.map((pack) => (
                          <tr key={pack.key}>
                            <td className="td-bold">{pack.filename}</td>
                            <td>{formatSize(pack.size)}</td>
                            <td>
                              {pack.last_modified
                                ? new Date(pack.last_modified).toLocaleString()
                                : '\u2014'}
                            </td>
                            <td>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleDownload(pack.key)}
                                disabled={downloading === pack.key}
                              >
                                {downloading === pack.key ? '...' : 'Download'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
