/* eslint-disable @typescript-eslint/no-unused-vars */
import { useQuery, useMutation } from '@tanstack/react-query';
import { getStudents, createStudent, updateStudent, deleteStudent, importStudents, getSchools, deleteAllStudents } from '../services/api';
import { useAuth } from '../services/auth';
import { Layout } from '../components/Layout';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useState, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import type { Student, School, Column } from '../types';
import { Spinner } from '../components/Spinner';

const StudentSchema = Yup.object().shape({
  rfid: Yup.string()
    .min(4, 'RFID must be at least 4 characters')
    .required('RFID is required'),
  name: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .required('Name is required'),
  admissionNumber: Yup.string()
    .min(4, 'Admission number must be at least 4 characters')
    .required('Admission number is required'),
  parentPhone: Yup.string()
    .matches(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number (e.g., +1234567890)')
    .required('Parent phone is required'),
  parentPhone2: Yup.string()
    .matches(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number (e.g., +1234567890)')
    .nullable(),
  schoolId: Yup.string().required('School ID is required'),
});

export const StudentManagement = () => {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin' || user?.role === 'super_admin';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    isSuperadmin ? '' : user?.schoolId || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const itemsPerPage = 20;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch schools for superadmin to populate dropdown
  const { data: schools = [], isLoading: isSchoolsLoading } = useQuery<School[], Error>({
    queryKey: ['schools'],
    queryFn: getSchools,
    enabled: isSuperadmin,
  });

  // Use selectedSchoolId for superadmin, user?.schoolId for admin
  const effectiveSchoolId = isSuperadmin ? selectedSchoolId : user?.schoolId || '';
  console.log('Effective School ID:', effectiveSchoolId); // Debug log

  const { data: students, isLoading, error, refetch } = useQuery<Student[], Error>({
    queryKey: ['students', effectiveSchoolId],
    queryFn: () => {
      console.log('Fetching students for schoolId:', effectiveSchoolId); // Debug log
      return getStudents(effectiveSchoolId);
    },
    enabled: !!effectiveSchoolId && effectiveSchoolId !== 'undefined',
  });

  const createMutation = useMutation<
    Student,
    Error,
    { schoolId: string; data: Omit<Student, '_id' | 'createdAt' | 'updatedAt' | 'schoolId'> }
  >({
    mutationFn: ({ schoolId, data }) => createStudent(schoolId, data),
    onSuccess: () => {
      refetch();
      setIsModalOpen(false);
      setCurrentPage(1);
      setSelectedStudents(new Set());
      setSelectAll(false);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Student created successfully!',
        timer: 2000,
        showConfirmButton: false,
      });
    },
    onError: (error) => {
      console.error('Create student error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to create student: ${error.message}`,
        confirmButtonText: 'OK',
      });
    },
  });

  const updateMutation = useMutation<Student, Error, { schoolId: string; rfid: string; data: Partial<Student> }>({
    mutationFn: ({ schoolId, rfid, data }) => updateStudent(schoolId, rfid, data),
    onSuccess: () => {
      refetch();
      setIsEditModalOpen(false);
      setSelectedStudent(null);
      setCurrentPage(1);
      setSelectedStudents(new Set());
      setSelectAll(false);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Student updated successfully!',
        timer: 2000,
        showConfirmButton: false,
      });
    },
    onError: (error) => {
      console.error('Update student error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to update student: ${error.message}`,
        confirmButtonText: 'OK',
      });
    },
  });

  const deleteMutation = useMutation<void, Error, { schoolId: string; rfid: string }>({
    mutationFn: ({ schoolId, rfid }) => deleteStudent(schoolId, rfid),
    onSuccess: () => {
      refetch();
      setCurrentPage(1);
      setSelectedStudents(new Set());
      setSelectAll(false);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Student deleted successfully!',
        timer: 2000,
        showConfirmButton: false,
      });
    },
    onError: (error) => {
      console.error('Delete student error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to delete student: ${error.message}`,
        confirmButtonText: 'OK',
      });
    },
  });

  const bulkDeleteMutation = useMutation<void, Error, { schoolId: string; rfids: string[] }>({
    mutationFn: ({ schoolId, rfids }) =>
      Promise.all(rfids.map((rfid) => deleteStudent(schoolId, rfid))).then(() => {}),
    onSuccess: () => {
      refetch();
      setCurrentPage(1);
      setSelectedStudents(new Set());
      setSelectAll(false);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Selected students deleted successfully!',
        timer: 2000,
        showConfirmButton: false,
      });
    },
    onError: (error) => {
      console.error('Bulk delete students error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to delete selected students: ${error.message}`,
        confirmButtonText: 'OK',
      });
    },
  });

  const deleteAllMutation = useMutation<void, Error, { schoolId: string }>({
    mutationFn: ({ schoolId }) => deleteAllStudents(schoolId),
    onSuccess: () => {
      refetch();
      setCurrentPage(1);
      setSelectedStudents(new Set());
      setSelectAll(false);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'All students deleted successfully!',
        timer: 2000,
        showConfirmButton: false,
      });
    },
    onError: (error) => {
      console.error('Delete all students error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to delete all students: ${error.message}`,
        confirmButtonText: 'OK',
      });
    },
  });

  const importMutation = useMutation<void, Error, { schoolId: string; file: File }>({
    mutationFn: ({ schoolId, file }) => {
      console.log('Initiating import for schoolId:', schoolId); // Debug log
      return importStudents(schoolId, file);
    },
    onSuccess: () => {
      refetch();
      setCurrentPage(1);
      setSelectedStudents(new Set());
      setSelectAll(false);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Students imported successfully!',
        timer: 2000,
        showConfirmButton: false,
      });
    },
    onError: (error) => {
      console.error('Import students error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to import students: ${error.message}`,
        confirmButtonText: 'OK',
      });
    },
  });

  // Filter students based on search query
  const filteredStudents = students?.filter((student) =>
    [student.name, student.rfid, student.admissionNumber]
      .join(' ')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  ) || [];

  // Pagination logic
  const totalItems = filteredStudents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Reset currentPage, selectedStudents, and selectAll when searchQuery or effectiveSchoolId changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedStudents(new Set());
    setSelectAll(false);
  }, [searchQuery, effectiveSchoolId]);

  // Update selectAll based on selectedStudents and paginatedStudents
  useEffect(() => {
    if (paginatedStudents.length === 0) {
      setSelectAll(false);
      return;
    }
    const allSelected = paginatedStudents.every((student) => selectedStudents.has(student.rfid));
    setSelectAll(allSelected);
  }, [selectedStudents, paginatedStudents]);

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && effectiveSchoolId) {
      console.log('Selected file:', event.target.files[0].name); // Debug log
      importMutation.mutate({ schoolId: effectiveSchoolId, file: event.target.files[0] });
      event.target.value = ''; // Reset input after selection
    }
  };

  // Toggle individual student selection
  const handleSelectStudent = (rfid: string) => {
    setSelectedStudents((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(rfid)) {
        newSelected.delete(rfid);
      } else {
        newSelected.add(rfid);
      }
      return newSelected;
    });
  };

  // Toggle select all for current page
  const handleSelectAll = () => {
    setSelectedStudents((prev) => {
      const newSelected = new Set(prev);
      if (selectAll) {
        paginatedStudents.forEach((student) => newSelected.delete(student.rfid));
      } else {
        paginatedStudents.forEach((student) => newSelected.add(student.rfid));
      }
      return newSelected;
    });
    setSelectAll(!selectAll);
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedStudents.size === 0) return;
    Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ${selectedStudents.size} student(s). This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed && effectiveSchoolId) {
        bulkDeleteMutation.mutate({ schoolId: effectiveSchoolId, rfids: Array.from(selectedStudents) });
      }
    });
  };

  // Handle delete all
  const handleDeleteAll = () => {
    if (!effectiveSchoolId) return;
    const schoolName = schools.find((school) => school._id === effectiveSchoolId)?.name || 'this school';
    Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ALL students for ${schoolName}. This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete all',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed && effectiveSchoolId) {
        deleteAllMutation.mutate({ schoolId: effectiveSchoolId });
      }
    });
  };

  if (!user) return <div>Please log in</div>;

  const columns: Column<Student>[] = [
    {
      header: '',
      accessor: (row: Student) => (
        <input
          type="checkbox"
          checked={selectedStudents.has(row.rfid)}
          onChange={() => handleSelectStudent(row.rfid)}
          disabled={!effectiveSchoolId}
        />
      ),
    },
    { header: 'Name', accessor: 'name' as keyof Student },
    { header: 'RFID', accessor: 'rfid' as keyof Student },
    { header: 'Admission No.', accessor: 'admissionNumber' as keyof Student },
    { header: 'Parent Phone', accessor: 'parentPhone' as keyof Student },
    {
      header: 'Actions',
      accessor: (row: Student) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedStudent(row);
              setIsEditModalOpen(true);
            }}
            className="text-accent hover:underline"
            disabled={!effectiveSchoolId}
          >
            Edit
          </button>
          <button
            onClick={() => {
              Swal.fire({
                title: 'Are you sure?',
                text: `You are about to delete student ${row.name}. This action cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, delete',
                cancelButtonText: 'Cancel',
              }).then((result) => {
                if (result.isConfirmed && effectiveSchoolId) {
                  deleteMutation.mutate({ schoolId: effectiveSchoolId, rfid: row.rfid });
                }
              });
            }}
            className="text-red-500 hover:underline"
            disabled={!effectiveSchoolId}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-primary mb-6">Student Management</h1>
      {isSuperadmin && (
        <div className="mb-4">
          <label htmlFor="schoolSelect" className="mr-2">
            Select School:
          </label>
          <select
            id="schoolSelect"
            value={selectedSchoolId}
            onChange={(e) => {
              console.log('Selected school ID:', e.target.value);
              setSelectedSchoolId(e.target.value);
            }}
            className="p-2 border rounded"
            disabled={isSchoolsLoading}
          >
            <option value="">-- Select a School --</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
          {isSchoolsLoading && (
            <span className="ml-2">
              <Spinner />
            </span>
          )}
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2 items-center">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleSelectAll}
              disabled={!effectiveSchoolId || paginatedStudents.length === 0}
            />
            <span>Select All</span>
          </label>
          {selectedStudents.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete Selected (${selectedStudents.size})`}
            </button>
          )}
          {isSuperadmin && effectiveSchoolId && (
            <button
              onClick={handleDeleteAll}
              className="bg-red-700 text-white p-2 rounded hover:bg-red-800"
              disabled={deleteAllMutation.isPending || !effectiveSchoolId}
            >
              {deleteAllMutation.isPending ? 'Deleting...' : 'Delete All Students'}
            </button>
          )}
        </div>
        <div className="flex gap-5.5 items-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white p-2 rounded hover:bg-secondary disabled:bg-gray-400"
            disabled={isSuperadmin && !selectedSchoolId}
          >
            Add Student
          </button>
          <div className="flex items-center">
            <button
              onClick={handleImportClick}
              className="bg-primary text-white p-2 rounded hover:bg-secondary disabled:bg-gray-400"
              disabled={(isSuperadmin && !selectedSchoolId) || importMutation.isPending}
            >
              {importMutation.isPending ? 'Uploading...' : 'Import Students'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".csv,.xlsx"
            />
          </div>
        </div>
      </div>
      <div className="mb-4">
        <label htmlFor="searchInput" className="mr-2">
          Search Students:
        </label>
        <input
          id="searchInput"
          type="text"
          placeholder="Search by name, RFID, or admission number"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="p-2 border rounded w-full max-w-sm"
        />
      </div>
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <div className="text-red-500">Error loading students: {error.message}</div>
      ) : !effectiveSchoolId ? (
        <div>Please select a school to view students.</div>
      ) : filteredStudents.length === 0 ? (
        <div>
          <DataTable columns={columns} data={[]} />
          <div className="text-gray-500 text-center py-4">No students found</div>
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={paginatedStudents} />
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="bg-primary text-white p-2 rounded hover:bg-secondary disabled:bg-gray-400"
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <div className="flex space-x-2">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`p-2 rounded ${
                    currentPage === page
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              className="bg-primary text-white p-2 rounded hover:bg-secondary disabled:bg-gray-400"
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
          <div className="text-gray-500 text-sm mt-2">
            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} students
          </div>
        </>
      )}
      {/* Create Student Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Student">
        <Formik
          initialValues={{
            rfid: '',
            name: '',
            admissionNumber: '',
            parentPhone: '',
            parentPhone2: '',
            schoolId: effectiveSchoolId,
          }}
          validationSchema={StudentSchema}
          onSubmit={(values) => {
            if (effectiveSchoolId) {
              console.log('Submitting student form with values:', values);
              const { schoolId, ...studentData } = values;
              createMutation.mutate({ schoolId: effectiveSchoolId, data: studentData });
            }
          }}
          validateOnChange={true}
          validateOnBlur={true}
        >
          {({ isSubmitting, isValid, touched, errors }) => (
            <Form className="space-y-4">
              <div>
                <Field
                  name="rfid"
                  placeholder="RFID"
                  className={`w-full p-2 border rounded ${
                    touched.rfid && errors.rfid ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                />
                <ErrorMessage name="rfid" component="div" className="text-red-500 text-sm mt-1" />
              </div>
              <div>
                <Field
                  name="name"
                  placeholder="Name"
                  className={`w-full p-2 border rounded ${
                    touched.name && errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                />
                <ErrorMessage name="name" component="div" className="text-red-500 text-sm mt-1" />
              </div>
              <div>
                <Field
                  name="admissionNumber"
                  placeholder="Admission Number"
                  className={`w-full p-2 border rounded ${
                    touched.admissionNumber && errors.admissionNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                />
                <ErrorMessage name="admissionNumber" component="div" className="text-red-500 text-sm mt-1" />
              </div>
              <div>
                <Field
                  name="parentPhone"
                  placeholder="Parent Phone"
                  className={`w-full p-2 border rounded ${
                    touched.parentPhone && errors.parentPhone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                />
                <ErrorMessage name="parentPhone" component="div" className="text-red-500 text-sm mt-1" />
              </div>
              <div>
                <Field
                  name="parentPhone2"
                  placeholder="Parent Phone 2 (Optional)"
                  className={`w-full p-2 border rounded ${
                    touched.parentPhone2 && errors.parentPhone2 ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                />
                <ErrorMessage name="parentPhone2" component="div" className="text-red-500 text-sm mt-1" />
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-white p-2 rounded hover:bg-secondary disabled:bg-gray-400"
                disabled={!effectiveSchoolId || isSubmitting || createMutation.isPending || !isValid}
              >
                {createMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </Form>
          )}
        </Formik>
      </Modal>
      {/* Edit Student Modal */}
      {selectedStudent && (
        <Modal isOpen={isEditModalOpen} onClose={() => {
          setIsEditModalOpen(false);
          setSelectedStudent(null);
        }} title="Edit Student">
          <Formik
            initialValues={{
              rfid: selectedStudent.rfid,
              name: selectedStudent.name,
              admissionNumber: selectedStudent.admissionNumber,
              parentPhone: selectedStudent.parentPhone,
              parentPhone2: selectedStudent.parentPhone2 || '',
              schoolId: effectiveSchoolId,
            }}
            validationSchema={StudentSchema}
            onSubmit={(values) => {
              if (effectiveSchoolId && selectedStudent) {
                console.log('Submitting edit student form with values:', values);
                const { schoolId, ...studentData } = values;
                updateMutation.mutate({ schoolId: effectiveSchoolId, rfid: selectedStudent.rfid, data: studentData });
              }
            }}
            validateOnChange={true}
            validateOnBlur={true}
          >
            {({ isSubmitting, isValid, touched, errors }) => (
              <Form className="space-y-4">
                <div>
                  <Field
                    name="rfid"
                    placeholder="RFID"
                    className={`w-full p-2 border rounded ${
                      touched.rfid && errors.rfid ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting}
                  />
                  <ErrorMessage name="rfid" component="div" className="text-red-500 text-sm mt-1" />
                </div>
                <div>
                  <Field
                    name="name"
                    placeholder="Name"
                    className={`w-full p-2 border rounded ${
                      touched.name && errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting}
                  />
                  <ErrorMessage name="name" component="div" className="text-red-500 text-sm mt-1" />
                </div>
                <div>
                  <Field
                    name="admissionNumber"
                    placeholder="Admission Number"
                    className={`w-full p-2 border rounded ${
                      touched.admissionNumber && errors.admissionNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting}
                  />
                  <ErrorMessage name="admissionNumber" component="div" className="text-red-500 text-sm mt-1" />
                </div>
                <div>
                  <Field
                    name="parentPhone"
                    placeholder="Parent Phone"
                    className={`w-full p-2 border rounded ${
                      touched.parentPhone && errors.parentPhone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting}
                  />
                  <ErrorMessage name="parentPhone" component="div" className="text-red-500 text-sm mt-1" />
                </div>
                <div>
                  <Field
                    name="parentPhone2"
                    placeholder="Parent Phone 2 (Optional)"
                    className={`w-full p-2 border rounded ${
                      touched.parentPhone2 && errors.parentPhone2 ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting}
                  />
                  <ErrorMessage name="parentPhone2" component="div" className="text-red-500 text-sm mt-1" />
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary text-white p-2 rounded hover:bg-secondary disabled:bg-gray-400"
                  disabled={!effectiveSchoolId || isSubmitting || updateMutation.isPending || !isValid}
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