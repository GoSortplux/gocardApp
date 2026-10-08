import { useQuery, useMutation } from '@tanstack/react-query';
import { getUsersBySchool, getSchools, createUser, updateUser, deleteUser } from '../services/api';
import { useAuth } from '../services/auth';
import { Layout } from '../components/Layout';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';
import Swal from 'sweetalert2';
import type { User, School } from '../types';
import { Spinner } from '../components/Spinner';

// Define type for create user input
type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password?: string };

const UserSchema = Yup.object().shape({
  username: Yup.string().required('Required'),
  email: Yup.string().email('Invalid email').required('Required'),
  phoneNumber: Yup.string().matches(/^\d{10,15}$/, 'Phone number must be 10-15 digits').required('Required'),
  password: Yup.string().when('$isCreate', {
    is: true,
    then: (schema) => schema.required('Required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  role: Yup.string().oneOf(['admin', 'superadmin']).required('Required'),
  schoolId: Yup.string().when('role', {
    is: (role: string) => role === 'admin',
    then: (schema) => schema.required('Required for admin'),
    otherwise: (schema) => schema.notRequired(),
  }),
});

export const UserManagement = () => {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin' || user?.role === 'super_admin';
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | ''>(
    isSuperadmin ? '' : user?.schoolId || ''
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Fetch schools
  const { data: schools = [], isLoading: isSchoolsLoading, error: schoolsError } = useQuery<School[], Error>({
    queryKey: ['schools', isSuperadmin ? 'all' : user?.schoolId],
    queryFn: isSuperadmin ? getSchools : () => getSchools().then((schools) => schools.filter((school) => school.id === user?.schoolId)),
    enabled: !!user && (isSuperadmin || !!user?.schoolId),
  });

  // Fetch users
  const queryKey = isSuperadmin ? ['users', selectedSchoolId || 'all'] : ['users', user?.schoolId];
  const queryFn = () => getUsersBySchool(isSuperadmin ? selectedSchoolId : user?.schoolId || '');

  const { data, isLoading, error, refetch } = useQuery<User[], Error>({
    queryKey,
    queryFn,
    enabled: !!user && (isSuperadmin ? true : !!user?.schoolId),
  });

  const createMutation = useMutation<User, Error, CreateUserInput>({
    mutationFn: createUser,
    onSuccess: () => {
      refetch();
      setIsCreateModalOpen(false);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'User created successfully!',
        timer: 2000,
        showConfirmButton: false,
      });
    },
    onError: (error) => {
      console.error('Create user error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to create user!: ${error.message}`,
        confirmButtonText: 'OK',
      });
    },
  });

  const updateMutation = useMutation<User, Error, { id: string; data: Partial<CreateUserInput> }>({
    mutationFn: ({ id, data }) => updateUser(id, data),
    onSuccess: () => {
      refetch();
      setIsEditModalOpen(false);
      setSelectedUser(null);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'User updated successfully!',
        timer: 2000,
        showConfirmButton: false,
      });
    },
    onError: (error) => {
      console.error('Update user error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to update user: ${error.message}`,
        confirmButtonText: 'OK',
      });
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: deleteUser,
    onSuccess: () => {
      refetch();
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'User deleted successfully!',
        timer: 2000,
        showConfirmButton: false,
      });
    },
    onError: (error) => {
      console.error('Delete user error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to delete user: ${error.message}`,
        confirmButtonText: 'OK',
      });
    },
  });

  if (!user) return <div>Please log in</div>;

  const columns = [
    { header: 'Username', accessor: 'username' as keyof User },
    { header: 'Email', accessor: 'email' as keyof User },
    { header: 'Phone Number', accessor: 'phoneNumber' as keyof User },
    { header: 'Role', accessor: 'role' as keyof User },
    {
      header: 'School Name',
      accessor: (row: User) => {
        if (!row.schoolId) return 'N/A';
        const school = schools.find((school) => school.id === row.schoolId);
        return school ? school.name : 'Unknown School';
      },
    },
    {
      header: 'Actions',
      accessor: (row: User) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              console.log('Editing user:', row);
              setSelectedUser(row);
              setIsEditModalOpen(true);
            }}
            className="text-accent hover:underline"
          >
            Edit
          </button>
          <button
            onClick={() => {
              Swal.fire({
                title: 'Are you sure?',
                text: `You are about to delete user ${row.username}. This action cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, delete',
                cancelButtonText: 'Cancel',
              }).then((result) => {
                if (result.isConfirmed) {
                  deleteMutation.mutate(row.id);
                }
              });
            }}
            className="text-red-500 hover:underline"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-primary mb-6">User Management</h1>
      {isSuperadmin && (
        <div className="mb-4">
          <label htmlFor="schoolSelect" className="mr-2">Select School:</label>
          <select
            id="schoolSelect"
            value={selectedSchoolId}
            onChange={(e) => setSelectedSchoolId(e.target.value)}
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
          {isSchoolsLoading && <span className="ml-2">Loading schools...</span>}
          {schoolsError && (
            <span className="ml-2 text-red-500">Error loading schools: {schoolsError.message}</span>
          )}
        </div>
      )}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="mb-4 bg-primary text-white p-2 rounded hover:bg-secondary"
      >
        Add User
      </button>
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <div className="text-red-500">Error loading users: {error.message}</div>
      ) : (
        <DataTable columns={columns} data={data || []} />
      )}
      {/* Create User Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Add User">
        <Formik
          initialValues={{
            username: '',
            email: '',
            phoneNumber: '',
            password: '',
            role: 'admin' as 'admin' | 'superadmin',
            schoolId: isSuperadmin ? selectedSchoolId : user?.schoolId || '',
            token: undefined,
          }}
          validationSchema={UserSchema}
          context={{ isCreate: true }}
          onSubmit={(values) => {
            console.log('Create user values:', values);
            createMutation.mutate(values);
          }}
        >
          {({ values, isSubmitting }) => (
            <Form className="space-y-4">
              <div>
                <Field name="username" placeholder="Username" className="w-full p-2 border rounded" disabled={isSubmitting} />
                <ErrorMessage name="username" component="div" className="text-red-500 text-sm" />
              </div>
              <div>
                <Field name="email" type="email" placeholder="Email" className="w-full p-2 border rounded" disabled={isSubmitting} />
                <ErrorMessage name="email" component="div" className="text-red-500 text-sm" />
              </div>
              <div>
                <Field name="phoneNumber" placeholder="Phone Number" className="w-full p-2 border rounded" disabled={isSubmitting} />
                <ErrorMessage name="phoneNumber" component="div" className="text-red-500 text-sm" />
              </div>
              <div>
                <Field name="password" type="password" placeholder="Password" className="w-full p-2 border rounded" disabled={isSubmitting} />
                <ErrorMessage name="password" component="div" className="text-red-500 text-sm" />
              </div>
              <div>
                <Field as="select" name="role" className="w-full p-2 border rounded" disabled={isSubmitting}>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </Field>
                <ErrorMessage name="role" component="div" className="text-red-500 text-sm" />
              </div>
              {values.role === 'admin' && (
                <div>
                  {isSuperadmin ? (
                    <Field as="select" name="schoolId" className="w-full p-2 border rounded" disabled={isSubmitting}>
                      <option value="">Select a School</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                        </option>
                      ))}
                    </Field>
                  ) : (
                    <Field name="schoolId" placeholder="School ID" className="w-full p-2 border rounded" disabled />
                  )}
                  <ErrorMessage name="schoolId" component="div" className="text-red-500 text-sm" />
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-primary text-white p-2 rounded hover:bg-secondary disabled:bg-gray-400"
                disabled={isSubmitting || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </Form>
          )}
        </Formik>
      </Modal>
      {/* Edit User Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setSelectedUser(null); }} title="Edit User">
        {selectedUser && (
          <Formik
            initialValues={{
              username: selectedUser.username,
              email: selectedUser.email,
              phoneNumber: selectedUser.phoneNumber,
              password: '',
              role: selectedUser.role,
              schoolId: selectedUser.schoolId || '',
              token: selectedUser.token,
            }}
            validationSchema={UserSchema}
            context={{ isCreate: false }}
            onSubmit={(values) => {
              console.log('Update user values:', values);
              const updateData: Partial<CreateUserInput> = { ...values };
              if (!updateData.password) delete updateData.password;
              updateMutation.mutate({ id: selectedUser.id, data: updateData });
            }}
          >
            {({ values, isSubmitting }) => (
              <Form className="space-y-4">
                <div>
                  <Field name="username" placeholder="Username" className="w-full p-2 border rounded" disabled={isSubmitting} />
                  <ErrorMessage name="username" component="div" className="text-red-500 text-sm" />
                </div>
                <div>
                  <Field name="email" type="email" placeholder="Email" className="w-full p-2 border rounded" disabled={isSubmitting} />
                  <ErrorMessage name="email" component="div" className="text-red-500 text-sm" />
                </div>
                <div>
                  <Field name="phoneNumber" placeholder="Phone Number" className="w-full p-2 border rounded" disabled={isSubmitting} />
                  <ErrorMessage name="phoneNumber" component="div" className="text-red-500 text-sm" />
                </div>
                <div>
                  <Field name="password" type="password" placeholder="New Password (optional)" className="w-full p-2 border rounded" disabled={isSubmitting} />
                  <ErrorMessage name="password" component="div" className="text-red-500 text-sm" />
                </div>
                <div>
                  <Field as="select" name="role" className="w-full p-2 border rounded" disabled={isSubmitting}>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </Field>
                  <ErrorMessage name="role" component="div" className="text-red-500 text-sm" />
                </div>
                {values.role === 'admin' && (
                  <div>
                    {isSuperadmin ? (
                      <Field as="select" name="schoolId" className="w-full p-2 border rounded" disabled={isSubmitting}>
                        <option value="">Select a School</option>
                        {schools.map((school) => (
                          <option key={school.id} value={school.id}>
                            {school.name}
                          </option>
                        ))}
                      </Field>
                    ) : (
                      <Field name="schoolId" placeholder="School ID" className="w-full p-2 border rounded" disabled />
                    )}
                    <ErrorMessage name="schoolId" component="div" className="text-red-500 text-sm" />
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full bg-primary text-white p-2 rounded hover:bg-secondary disabled:bg-gray-400"
                  disabled={isSubmitting || updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Update'}
                </button>
              </Form>
            )}
          </Formik>
        )}
      </Modal>
    </Layout>
  );
};