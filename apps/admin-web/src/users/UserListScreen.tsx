import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';
import type { AdminUserListResponse, AdminUserListItem } from '@asm-kyc/shared';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';

interface UserListScreenProps {
  onSelectUser: (id: string) => void;
}

const LIMIT = 20;

export function UserListScreen({ onSelectUser }: UserListScreenProps) {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (role) params.set('role', role);
      if (search) params.set('search', search);
      const res = await apiFetch<AdminUserListResponse>(`/admin/users?${params}`);
      setUsers(res.users);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, role, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [role, search]);

  const totalPages = Math.ceil(total / LIMIT);

  const roleBadge = (r: string) => {
    const map: Record<string, string> = {
      MINER_USER: 'Miner',
      TRADER_USER: 'Trader',
      REFINER_USER: 'Refiner',
      ADMIN_USER: 'Admin',
    };
    return map[r] ?? r;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Users</h1>
        <span className="page-header-count">{total} total</span>
      </div>

      <div className="filter-bar">
        <select
          className="filter-select"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="MINER_USER">Miners</option>
          <option value="TRADER_USER">Traders</option>
          <option value="REFINER_USER">Refiners</option>
          <option value="ADMIN_USER">Admins</option>
        </select>
        <SearchInput value={search} onChange={setSearch} placeholder="Search username or name..." />
      </div>

      {loading ? (
        <div className="page-loading">Loading...</div>
      ) : users.length === 0 ? (
        <div className="empty-state">No users found</div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Status</th>
                <th>KYC</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} onClick={() => onSelectUser(u.id)}>
                  <td className="td-bold">{u.username}</td>
                  <td>{u.profile_name ?? '—'}</td>
                  <td><span className={`role-tag role-tag-${(u.role.split('_')[0] ?? '').toLowerCase()}`}>{roleBadge(u.role)}</span></td>
                  <td>{u.phone_e164}</td>
                  <td>
                    {u.is_disabled ? (
                      <span className="badge badge-disabled">Disabled</span>
                    ) : (
                      <span className="badge badge-active">Active</span>
                    )}
                  </td>
                  <td>
                    {u.profile_completed ? (
                      <StatusBadge status="APPROVED" />
                    ) : (
                      <span className="badge badge-draft">Incomplete</span>
                    )}
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
