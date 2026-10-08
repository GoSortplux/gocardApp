import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAnalytics, getSchools } from '../services/api';
import { useAuth } from '../services/auth';
import { Layout } from '../components/Layout';
import { DashboardCard } from '../components/DashboardCard';
import type { Analytics, School } from '../types';
import { Spinner } from '../components/Spinner';
import { AttendanceChart } from '../components/AttendanceChart';
import { MessagesPieChart } from '../components/MessagesPieChart';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin' || user?.role === 'super_admin';
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    isSuperadmin ? '' : user?.schoolId || ''
  );

  // Fetch schools for superadmin dropdown
  const { data: schools = [], isLoading: isSchoolsLoading, error: schoolsError } = useQuery<School[], Error>({
    queryKey: ['schools'],
    queryFn: getSchools,
    enabled: isSuperadmin, // Only fetch for superadmin
  });

  // Fetch analytics based on selected school or user.schoolId
  const queryKey = isSuperadmin ? ['analytics', selectedSchoolId || 'all'] : ['analytics', user?.schoolId || ''];
  const queryFn = () => {
    const schoolIdToFetch = isSuperadmin ? selectedSchoolId : user?.schoolId || '';
    if (!isSuperadmin && !schoolIdToFetch) {
      throw new Error('No school ID associated with this user');
    }
    return getAnalytics(schoolIdToFetch);
  };

  const { data, isLoading, error } = useQuery<Analytics, Error>({
    queryKey,
    queryFn,
    enabled: !!user && (isSuperadmin || !!user?.schoolId), // Ensure schoolId exists for admins
  });

  if (!user) return <div>Please log in</div>;

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-primary mb-6">
        {isSuperadmin ? 'Superadmin Dashboard' : 'Admin Dashboard'}
      </h1>
      {isSuperadmin && (
        <div className="mb-4">
          <label htmlFor="schoolSelect" className="mr-2">Select School:</label>
          <select
            id="schoolSelect"
            value={selectedSchoolId}
            onChange={(e) => setSelectedSchoolId(e.target.value || '')} // Ensure no undefined
            className="border rounded p-2"
            disabled={isSchoolsLoading}
          >
            <option value="">All Schools</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
          {isSchoolsLoading && <Spinner />}
          {schoolsError && (
            <span className="ml-2 text-red-500">Error loading schools: {schoolsError.message}</span>
          )}
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <div className="text-red-500">Error loading analytics: {error.message}</div>
      ) : !isSuperadmin && !user.schoolId ? (
        <div className="text-red-500">No school ID associated with this user</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard
            title={isSuperadmin && !selectedSchoolId ? 'Total Students (All Schools)' : 'Total Students'}
            value={data?.totalStudents ?? 0}
          />
          <DashboardCard
            title="Attendance Today"
            value={data?.attendanceToday ?? 0}
          />
          <DashboardCard
            title="Students In"
            value={data?.inCount ?? 0}
          />
          <DashboardCard
            title="Students Out"
            value={data?.outCount ?? 0}
          />
          <DashboardCard
            title="Last Week's Attendance"
            value={data?.lastWeekAttendance ?? 0}
          />
          <DashboardCard
            title="Messages Sent Today"
            value={data?.messagesToday ?? 0}
          />
          <DashboardCard
            title="Last Week's Messages"
            value={data?.lastWeekMessages ?? 0}
          />
          <DashboardCard
            title="Total Messages Sent"
            value={data?.totalMessages ?? 0}
          />
        </div>
      )}
      {data && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AttendanceChart
            today={data.attendanceToday}
            lastWeek={data.lastWeekAttendance}
          />
          <MessagesPieChart
            sent={data.sentCount}
            failed={data.failedCount}
          />
        </div>
      )}
    </Layout>
  );
};