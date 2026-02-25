import { useAuth } from '../auth/AuthContext';

export function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 4 }}>
            Welcome, {user?.username}
          </p>
        </div>
        <button className="btn-text" onClick={logout}>
          Sign Out
        </button>
      </div>

      <div className="dashboard-placeholder">
        <p style={{ fontSize: 18, marginBottom: 8 }}>Admin Dashboard</p>
        <p>Coming in Phase 5</p>
        <p style={{ fontSize: 13, marginTop: 16 }}>
          This will include compliance review, miner search, record management, and more.
        </p>
      </div>
    </div>
  );
}
