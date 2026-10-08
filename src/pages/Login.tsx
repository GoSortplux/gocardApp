import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../services/auth';
import { login } from '../services/api';
import { useMutation } from '@tanstack/react-query';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import type { User } from '../types';


interface LoginFormValues {
  email: string;
  password: string;
}

const LoginSchema = Yup.object().shape({
  email: Yup.string().email('Please enter a valid email address').required('Email is required'),
  password: Yup.string().required('Password is required'),
});

export default function Login() {
  const { login: setLogin, user } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState('');

  const mutation = useMutation<
    { token: string; refreshToken: string; user: User },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any,
    { email: string; password: string }
  >({
    mutationFn: ({ email, password }) => login(email, password),
    onSuccess: (data) => {
      setLogin(data.user, data.token, data.refreshToken);
      setErrorMessage(''); // Clear error on success
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Login failed';
      setErrorMessage(message);
    },
  });

  useEffect(() => {
    if (user) {
      const isSuper = user.role === 'superadmin' || user.role === 'super_admin';
      navigate(isSuper ? '/schools' : '/dashboard');
    }
  }, [user, navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: 'url(/bgImage.jpg)' }}
    >
      <div className="absolute inset-0 bg-black/80"></div>
      <div className="bg-white p-8 rounded-md shadow-lg w-full max-w-md relative z-10">
        <img src="/GoLogo.svg" alt="GoLogo" className="h-12 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-blue-700 mb-2 text-center">Login</h2>

        {errorMessage && (
          <div className="text-red-500 text-center text-sm mb-4">
            {errorMessage}
          </div>
        )}

        <Formik<LoginFormValues>
          initialValues={{ email: '', password: '' }}
          validationSchema={LoginSchema}
          onSubmit={(values) => mutation.mutate(values)}
        >
          <Form className="space-y-4">
            <div>
              <Field
                name="email"
                type="email"
                placeholder="Email Address"
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
              <ErrorMessage name="email" component="div" className="text-red-500 text-sm mt-1" />
            </div>
            <div>
              <Field
                name="password"
                type="password"
                placeholder="Password"
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
              <ErrorMessage name="password" component="div" className="text-red-500 text-sm mt-1" />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-700 text-white p-2 rounded hover:bg-blue-600"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Logging in...' : 'Login'}
            </button>
          </Form>
        </Formik>
     </div>
    </div>
  );
}