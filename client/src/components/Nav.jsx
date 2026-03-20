import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Nav() {
  const { logout } = useAuth();

  const linkClass = ({ isActive }) =>
    `px-4 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'}`;

  return (
    <nav className="bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap items-center gap-2">
      <NavLink to="/weight" className={linkClass}>Body Tracker</NavLink>
      <NavLink to="/workouts" className={linkClass}>Workouts</NavLink>
      <NavLink to="/lifts" className={linkClass}>Lifts</NavLink>
      <NavLink to="/history" className={linkClass}>History</NavLink>
      <div className="flex-1" />
      <button onClick={logout} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
        Logout
      </button>
    </nav>
  );
}
