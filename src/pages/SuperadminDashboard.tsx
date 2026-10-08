import { Layout } from '../components/Layout';
import { Link } from 'react-router-dom';

export const SuperadminDashboard = () => (
  <Layout>
    <h1 className="text-2xl font-bold text-primary mb-6">Superadmin Dashboard</h1>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Link to="/schools" className="p-4 bg-white rounded-lg shadow hover:bg-ash">
        <h2 className="text-xl font-semibold text-primary">Manage Schools</h2>
        <p className="text-gray-600">Create, update, or view schools</p>
      </Link>
      <Link to="/users" className="p-4 bg-white rounded-lg shadow hover:bg-ash">
        <h2 className="text-xl font-semibold text-primary">Manage Users</h2>
        <p className="text-gray-600">Create or manage admin accounts</p>
      </Link>
    </div>
  </Layout>
);