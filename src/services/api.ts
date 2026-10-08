import axios from 'axios';
import type {
  User,
  School,
  Student,
  Analytics,
  StandardApiResponse,
  AuthLoginResponseData,
  AuthRefreshResponseData,
  GetMeResponseData,
} from '../types';

const api = axios.create({
  baseURL: 'https://gocard-api.gobokin.com/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('API request - token:', token, 'URL:', config.url);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post<StandardApiResponse<AuthRefreshResponseData>>(
            'https://gocard-api.gobokin.com/api/v1/auth/refresh',
            { refresh_token: refreshToken }
          );
          const newAccessToken = res.data.data.access_token;
          const newRefreshToken = res.data.data.refresh_token || refreshToken;

          localStorage.setItem('token', newAccessToken);
          localStorage.setItem('refresh_token', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error('Refresh token failed:', refreshError);
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const login = async (
  email: string,
  password: string
): Promise<{ token: string; refreshToken: string; user: User }> => {
  const response = await api.post<StandardApiResponse<AuthLoginResponseData>>('/auth/login', {
    email,
    password,
  });

  const { access_token, refresh_token, user: apiUser } = response.data.data;

  const displayName = `${apiUser.first_name || ''} ${apiUser.last_name || ''}`.trim();

  const user: User = {
    id: apiUser.id,
    first_name: apiUser.first_name,
    last_name: apiUser.last_name,
    username: displayName || apiUser.email,
    email: apiUser.email,
    role: apiUser.role,
    role_name: apiUser.role_name,
    schoolId: apiUser.school_id,
    token: access_token,
    refresh_token: refresh_token,
  };

  return { token: access_token, refreshToken: refresh_token, user };
};

export const logoutApi = async (refreshToken: string): Promise<void> => {
  try {
    await api.post('/auth/logout', { refresh_token: refreshToken });
  } catch (error) {
    console.error('Logout request failed:', error);
  }
};

export const getMe = async (): Promise<User> => {
  const response = await api.get<StandardApiResponse<GetMeResponseData>>('/me');
  const apiUser = response.data.data;
  const displayName = `${apiUser.first_name || ''} ${apiUser.last_name || ''}`.trim();

  return {
    id: apiUser.id,
    first_name: apiUser.first_name,
    last_name: apiUser.last_name,
    username: displayName || apiUser.email,
    email: apiUser.email,
    role: apiUser.role,
    role_name: apiUser.role_name,
    schoolId: apiUser.school_id,
  };
};

export const getSchools = async (): Promise<School[]> => {
  try {
    const response = await api.get<{ schools: School[] }>('/schools');
    console.log('API response for /schools:', response.data);
    const schools = response.data.schools || [];
    if (!Array.isArray(schools)) {
      console.error('Expected an array of schools, received:', schools);
      return [];
    }
    return schools.map((school) => ({
      ...school,
      _id: school._id,
      id: school.id,
      name: school.name,
      address: school.address || '',
      admin: school.admin,
      logoUrl: school.logoUrl || '',
      createdAt: school.createdAt || new Date().toISOString(),
      updatedAt: school.updatedAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching schools:', error);
    return [];
  }
};

export const getUsersBySchool = async (schoolId: string): Promise<User[]> => {
  try {
    if (!schoolId) {
      // If no schoolId is provided, fetch all users
      const response = await api.get<{ users: User[] }>('/users/');
      console.log('API response for /users/:', response.data);
      const users = response.data.users || [];
      if (!Array.isArray(users)) {
        console.error('Expected an array of users, received:', users);
        return [];
      }
      return users.map((user) => ({
        ...user,
        id: user.id,
        username: user.username,
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        role: user.role,
        schoolId: user.schoolId || '',
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: user.updatedAt || new Date().toISOString(),
      }));
    }

    if (schoolId === 'undefined') {
      throw new Error('Invalid school ID provided');
    }

    const response = await api.get<{ users: User[] }>(`/users/${schoolId}`);
    console.log(`API response for /users/${schoolId}:`, response.data);
    const users = response.data.users || [];
    if (!Array.isArray(users)) {
      console.error('Expected an array of users, received:', users);
      return [];
    }
    return users.map((user) => ({
      ...user,
      id: user.id,
      username: user.username,
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      role: user.role,
      schoolId: user.schoolId || '',
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const createSchool = async (data: Omit<School, 'id' | '_id' | 'createdAt' | 'updatedAt' | 'admin'>): Promise<School> =>
  api.post<School>('/schools', data).then((res) => ({
    ...res.data,
    _id: res.data._id,
    id: res.data.id,
    name: res.data.name,
    address: res.data.address || '',
    admin: res.data.admin,
    logoUrl: res.data.logoUrl || '',
    createdAt: res.data.createdAt || new Date().toISOString(),
    updatedAt: res.data.updatedAt || new Date().toISOString(),
  }));

export const updateSchool = async (id: string, data: Partial<School>): Promise<School> =>
  api.put<School>(`/schools/${id}`, data).then((res) => ({
    ...res.data,
    _id: res.data._id,
    id: res.data.id,
    name: res.data.name,
    address: res.data.address || '',
    admin: res.data.admin,
    logoUrl: res.data.logoUrl || '',
    createdAt: res.data.createdAt || new Date().toISOString(),
    updatedAt: res.data.updatedAt || new Date().toISOString(),
  }));

export const getStudents = async (schoolId: string): Promise<Student[]> => {
  try {
    if (!schoolId) {
      throw new Error('School ID is required');
    }
    const response = await api.get<{ total: number; students: Student[] }>(`/students/${schoolId}`);
    console.log('API response for /students:', response.data);
    const students = response.data.students || [];
    if (!Array.isArray(students)) {
      console.error('Expected an array of students, received:', students);
      return [];
    }
    return students.map((student) => ({
      ...student,
      _id: student._id,
      schoolId: student.schoolId,
      rfid: student.rfid,
      name: student.name,
      admissionNumber: student.admissionNumber,
      parentPhone: student.parentPhone,
      parentPhone2: student.parentPhone2 || '',
      lastEvent: student.lastEvent,
      createdAt: student.createdAt || new Date().toISOString(),
      updatedAt: student.updatedAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching students:', error);
    throw error;
  }
};

export const createStudent = async (
  schoolId: string,
  data: Omit<Student, '_id' | 'createdAt' | 'updatedAt' | 'schoolId'>
): Promise<Student> =>
  api.post<Student>(`/students/${schoolId}`, data).then((res) => ({
    ...res.data,
    _id: res.data._id,
    schoolId: res.data.schoolId,
    rfid: res.data.rfid,
    name: res.data.name,
    admissionNumber: res.data.admissionNumber,
    parentPhone: res.data.parentPhone,
    parentPhone2: res.data.parentPhone2 || '',
    lastEvent: res.data.lastEvent,
    createdAt: res.data.createdAt || new Date().toISOString(),
    updatedAt: res.data.updatedAt || new Date().toISOString(),
  }));

export const updateStudent = async (schoolId: string, rfid: string, data: Partial<Student>): Promise<Student> =>
  api.put<Student>(`/students/${schoolId}/${rfid}`, data).then((res) => ({
    ...res.data,
    _id: res.data._id,
    schoolId: res.data.schoolId,
    rfid: res.data.rfid,
    name: res.data.name,
    admissionNumber: res.data.admissionNumber,
    parentPhone: res.data.parentPhone,
    parentPhone2: res.data.parentPhone2 || '',
    lastEvent: res.data.lastEvent,
    createdAt: res.data.createdAt || new Date().toISOString(),
    updatedAt: res.data.updatedAt || new Date().toISOString(),
  }));

export const deleteStudent = async (schoolId: string, rfid: string): Promise<void> =>
  api.delete(`/students/${schoolId}/${rfid}`).then((res) => res.data);

export const importStudents = async (schoolId: string, file: File): Promise<void> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    console.log('Importing students to URL:', `/students/${schoolId}/import`);
    const response = await api.post(`/students/${schoolId}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    console.log('Import students response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error importing students:', error);
    throw error;
  }
};

export const deleteAllStudents = async (schoolId: string): Promise<void> =>
  api.delete(`/students/${schoolId}`).then((res) => res.data);

export const createUser = async (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> =>
  api.post<User>('/users', data).then((res) => res.data);

export const updateUser = async (id: string, data: Partial<User>): Promise<User> =>
  api.put<User>(`/users/${id}`, data).then((res) => res.data);

export const deleteUser = async (id: string): Promise<void> =>
  api.delete(`/users/${id}`).then((res) => res.data);

export const getAnalytics = async (schoolId: string): Promise<Analytics> => {
  try {
    if (!schoolId) {
      // If no schoolId is provided, fetch analytics for all schools
      console.log('Fetching analytics for all schools');
      const response = await api.get<Analytics>('/analytics/superadmin/all');
      console.log('API response for /analytics/superadmin/all:', response.data);
      return response.data;
    }

    if (schoolId === 'undefined') {
      console.error('Invalid schoolId: undefined');
      throw new Error('Invalid school ID provided');
    }

    console.log(`Fetching analytics for schoolId: ${schoolId}`);
    const response = await api.get<{
      totalStudents: number;
      attendanceToday: number;
      lastWeekAttendance: number;
      inCount: number;
      outCount: number;
      totalMessages: number;
      messagesToday: number;
      lastWeekMessages: number;
      sentCount: number;
      failedCount: number;
      lastUpdate: string;
    }>(`/analytics/${schoolId}`);
    console.log(`API response for /analytics/${schoolId}:`, response.data);

    const data = response.data;
    if (typeof data === 'string') {
      console.error(`Received string data for school ${schoolId}:`, data);
      throw new Error('Invalid response: Expected JSON, received string');
    }

    return { ...data, schoolId };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw error;
  }
};