import { useAuth } from '../services/auth';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  UserIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [logoSrc, setLogoSrc] = useState(user?.schoolLogoUrl || '');

  useEffect(() => {
    setLogoSrc(user?.schoolLogoUrl || '');
  }, [user]);

  const handleLogoError = () => {
    setLogoSrc('https://images.vexels.com/media/users/3/224234/isolated/preview/ff7c525c1c3e1bef640644542001e1fd-online-school-logo.png');
  };

  const isActive = (path: string) => location.pathname === path;
  const isSuperadmin = user?.role === 'superadmin' || user?.role === 'super_admin';
  const displayName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username || user?.email;

  return (
    <div className="flex h-screen bg-ash">
      <aside className="w-64 bg-primary text-white p-4 flex flex-col">
        <div>
          {!isSuperadmin ? (
            <div className="flex flex-col items-center text-center mb-6">
              {user?.schoolLogoUrl && (
                <img
                  src={logoSrc}
                  alt={`${user.schoolName || 'School'} Logo`}
                  className="h-16 w-16 rounded-full object-cover mb-2"
                  onError={handleLogoError}
                />
              )}
              {user?.schoolName && <h1 className="text-lg font-bold">{user.schoolName}</h1>}
              <p className="text-sm">Hello, {displayName} 👋</p>
            </div>
          ) : (
            <div className="flex flex-col mb-6">
              <img src="/logo-white.svg" alt="Logo" className="h-6 w-32 mr-2" />
              <h1 className="text-xl font-bold mt-2.5">Dashboard</h1>
              <p className="text-xs text-gray-300 mt-1">Hello, {displayName} 👋</p>
            </div>
          )}
          <nav>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/dashboard"
                className={`flex items-center p-2 rounded ${
                  isActive('/dashboard') ? 'bg-secondary text-white' : 'hover:bg-secondary'
                }`}
              >
                <ChartBarIcon className="h-6 w-6 mr-2" />
                Dashboard
              </Link>
            </li>

            {isSuperadmin && (
              <>
                <li>
                  <Link
                    to="/schools"
                    className={`flex items-center p-2 rounded ${
                      isActive('/schools') ? 'bg-secondary text-white' : 'hover:bg-secondary'
                    }`}
                  >
                    <BuildingOfficeIcon className="h-6 w-6 mr-2" />
                    Schools
                  </Link>
                </li>
                <li>
                  <Link
                    to="/users"
                    className={`flex items-center p-2 rounded ${
                      isActive('/users') ? 'bg-secondary text-white' : 'hover:bg-secondary'
                    }`}
                  >
                    <UserIcon className="h-6 w-6 mr-2" />
                    Users
                  </Link>
                </li>
              </>
            )}

            <li>
              <Link
                to="/students"
                className={`flex items-center p-2 rounded ${
                  isActive('/students') ? 'bg-secondary text-white' : 'hover:bg-secondary'
                }`}
              >
                <UserIcon className="h-6 w-6 mr-2" />
                Students
              </Link>
            </li>
            <li>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="flex items-center p-2 w-full text-left hover:bg-secondary rounded"
              >
                <ArrowLeftOnRectangleIcon className="h-6 w-6 mr-2" />
                Logout
              </button>
            </li>
          </ul>
        </nav>
        </div>
        {user?.role === 'admin' && (
          <div className="mt-auto pt-4 border-t border-gray-700">
            <img src="/logo-white.svg" alt="Gosortplux Logo" className="h-6 w-auto mx-auto" />
          </div>
        )}
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
};
