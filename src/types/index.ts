import type { JSX } from "react";

export interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email: string;
  phoneNumber?: string;
  role: 'school_admin' | 'admin' | 'superadmin' | 'super_admin' | string;
  role_name?: string;
  schoolId?: string;
  schoolName?: string;
  schoolLogoUrl?: string;
  token?: string;
  refresh_token?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StandardApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  request_id?: string;
}

export interface AuthLoginResponseData {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    role_name: string;
    school_id: string;
  };
}

export interface AuthRefreshResponseData {
  access_token: string;
  refresh_token?: string;
}

export interface GetMeResponseData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  role_name: string;
  school_id: string;
}

export interface Column<T> {
  header: string | (() => JSX.Element);
  accessor: keyof T | ((row: T) => JSX.Element);
}



export interface School {
  _id: string;
  id: string; 
  address?: string;
   name: string;
  admin?: {
    id: string;
    username: string;
    email: string;
  };
  logoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SchoolsResponse {
  data?: School[];
  schools?: School[];
}

export interface Student {
  _id: string;
  schoolId: string;
  rfid: string;
  name: string;
  admissionNumber: string;
  parentPhone: string;
  parentPhone2?: string;
  lastEvent?: { event: 'in' | 'out'; timestamp: string };
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  schoolId: string;
  rfid: string;
  studentName: string;
  event: 'in' | 'out';
  manual: boolean;
  timestamp: string;
}

export interface Message {
  schoolId: string;
  rfid: string;
  studentName: string;
  phoneNumber: string;
  message: string;
  status: 'sent' | 'failed';
  timestamp: string;
}

export interface Analytics {
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
  schoolId: string;
  
}