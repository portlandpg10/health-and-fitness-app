import { Outlet } from 'react-router-dom';
import Nav from './Nav';

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="p-4 md:p-6 max-w-6xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
