import { useQuery, useMutation } from '@tanstack/react-query';
import { getSchools, createSchool, updateSchool } from '../services/api';
import { Layout } from '../components/Layout';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';
import Swal from 'sweetalert2';
import type { School } from '../types';
import { Spinner } from '../components/Spinner';

const SchoolSchema = Yup.object().shape({
  name: Yup.string()
    .min(3, 'School name must be at least 3 characters')
    .max(100, 'School name cannot exceed 100 characters')
    .required('School name is required'),
  address: Yup.string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address cannot exceed 200 characters')
    .required('Address is required'),
  logoUrl: Yup.string()
    .url('Please enter a valid URL (e.g., https://example.com)')
    .nullable(),
});

export const SchoolManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  const { data, isLoading, error, refetch } = useQuery<School[], Error>({
    queryKey: ['schools'],
    queryFn: getSchools,
  });

  const createMutation = useMutation<School, Error, Omit<School, '_id' | 'id' | 'createdAt' | 'updatedAt'>>({
    mutationFn: createSchool,
    onSuccess: () => {
      refetch();
      setIsModalOpen(false);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'School created successfully!',
        timer: 2000,
        showConfirmButton: false,
      });
    },
    onError: (error) => {
      console.error('Create school error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to create school: ${error.message}`,
        confirmButtonText: 'OK',
      });
    },
  });

  const updateMutation = useMutation<School, Error, { id: string; data: Partial<School> }>({
    mutationFn: ({ id, data }) => updateSchool(id, data),
    onSuccess: () => {
      refetch();
      setIsEditModalOpen(false);
      setSelectedSchool(null);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'School updated successfully!',
        timer: 2000,
        showConfirmButton: false,
      });
    },
    onError: (error) => {
      console.error('Update school error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to update school: ${error.message}`,
        confirmButtonText: 'OK',
      });
    },
  });

  const handleOpenModal = () => {
    console.log('Add School button clicked, setting isModalOpen to true');
    setIsModalOpen(true);
  };

  const columns = [
    { header: 'Name', accessor: 'name' as keyof School },
    { header: 'Address', accessor: 'address' as keyof School },
    { header: 'Admin', accessor: (row: School) => row.admin?.username || 'N/A' },
    {
      header: 'Actions',
      accessor: (row: School) => (
        <button
          onClick={() => {
            setSelectedSchool(row);
            setIsEditModalOpen(true);
          }}
          className="text-accent hover:underline"
        >
          Edit
        </button>
      ),
    },
  ];

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-primary mb-6">School Management</h1>
      <button
        onClick={handleOpenModal}
        className="mb-4 bg-primary text-white p-2 rounded hover:bg-secondary"
      >
        Add School
      </button>
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <div className="text-red-500">Error loading schools: {error.message}</div>
      ) : (
        <DataTable columns={columns} data={data || []} />
      )}
      {/* Create School Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add School">
        <Formik
          initialValues={{ name: '', address: '', logoUrl: '' }}
          validationSchema={SchoolSchema}
          onSubmit={(values) => {
            console.log('Submitting create school form with values:', values);
            createMutation.mutate(values);
          }}
          validateOnChange={true}
          validateOnBlur={true}
        >
          {({ isSubmitting, isValid, touched, errors }) => (
            <Form className="space-y-4">
              <div>
                <Field
                  name="name"
                  placeholder="School Name"
                  className={`w-full p-2 border rounded ${
                    touched.name && errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                />
                <ErrorMessage name="name" component="div" className="text-red-500 text-sm mt-1" />
              </div>
              <div>
                <Field
                  name="address"
                  placeholder="Address"
                  className={`w-full p-2 border rounded ${
                    touched.address && errors.address ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                />
                <ErrorMessage name="address" component="div" className="text-red-500 text-sm mt-1" />
              </div>
              <div>
                <Field
                  name="logoUrl"
                  placeholder="Logo URL (Optional)"
                  className={`w-full p-2 border rounded ${
                    touched.logoUrl && errors.logoUrl ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                />
                <ErrorMessage name="logoUrl" component="div" className="text-red-500 text-sm mt-1" />
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-white p-2 rounded hover:bg-secondary disabled:bg-gray-400"
                disabled={isSubmitting || createMutation.isPending || !isValid}
              >
                {createMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </Form>
          )}
        </Formik>
      </Modal>
      {/* Edit School Modal */}
      {selectedSchool && (
        <Modal isOpen={isEditModalOpen} onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSchool(null);
        }} title="Edit School">
          <Formik
            initialValues={{
              name: selectedSchool.name,
              address: selectedSchool.address || '',
              logoUrl: selectedSchool.logoUrl || '',
            }}
            validationSchema={SchoolSchema}
            onSubmit={(values) => {
              console.log('Submitting edit school form with values:', values);
              updateMutation.mutate({ id: selectedSchool.id, data: values });
            }}
            validateOnChange={true}
            validateOnBlur={true}
          >
            {({ isSubmitting, isValid, touched, errors }) => (
              <Form className="space-y-4">
                <div>
                  <Field
                    name="name"
                    placeholder="School Name"
                    className={`w-full p-2 border rounded ${
                      touched.name && errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting}
                  />
                  <ErrorMessage name="name" component="div" className="text-red-500 text-sm mt-1" />
                </div>
                <div>
                  <Field
                    name="address"
                    placeholder="Address"
                    className={`w-full p-2 border rounded ${
                      touched.address && errors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting}
                  />
                  <ErrorMessage name="address" component="div" className="text-red-500 text-sm mt-1" />
                </div>
                <div>
                  <Field
                    name="logoUrl"
                    placeholder="Logo URL (Optional)"
                    className={`w-full p-2 border rounded ${
                      touched.logoUrl && errors.logoUrl ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting}
                  />
                  <ErrorMessage name="logoUrl" component="div" className="text-red-500 text-sm mt-1" />
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary text-white p-2 rounded hover:bg-secondary disabled:bg-gray-400"
                  disabled={isSubmitting || updateMutation.isPending || !isValid}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </Form>
            )}
          </Formik>
        </Modal>
      )}
    </Layout>
  );
};