import { useAuth } from '../auth/AuthContext';
import { PlaceholderCard } from './PlaceholderCard';

export function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <div className="home-screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Hello, {user?.profile?.full_name || user?.username}</h1>
          <p className="subtitle">
            {user?.role === 'TRADER_USER' ? 'Trader' : 'Miner'} Dashboard
          </p>
        </div>
        <button className="btn btn-text" onClick={logout} style={{ fontSize: 14 }}>
          Sign Out
        </button>
      </div>

      <div className="card-grid">
        <PlaceholderCard title="My Profile" icon="👤" subtitle="View and edit your profile" disabled />
        <PlaceholderCard title="New Record" icon="➕" subtitle="Create a bar or lot record" disabled />
        <PlaceholderCard title="My Records" icon="📋" subtitle="View submitted records" disabled />
      </div>
    </div>
  );
}
