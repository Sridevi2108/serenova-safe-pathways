
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import FloatingLabelInput from '../components/FloatingLabelInput';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
  });
  
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
  });

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phoneNumber: '',
      emergencyContactName: '',
      emergencyContactNumber: '',
    };

    if (!formData.fullName) {
      newErrors.fullName = 'Full Name is required';
      valid = false;
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
      valid = false;
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
      valid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      valid = false;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      valid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      valid = false;
    }

    if (formData.phoneNumber && !/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
      newErrors.phoneNumber = 'Phone number must be valid';
      valid = false;
    }

    if (!formData.emergencyContactName) {
      newErrors.emergencyContactName = 'Emergency Contact Name is required';
      valid = false;
    }

    if (!formData.emergencyContactNumber) {
      newErrors.emergencyContactNumber = 'Emergency Contact Number is required';
      valid = false;
    } else if (!/^\d{10}$/.test(formData.emergencyContactNumber.replace(/\D/g, ''))) {
      newErrors.emergencyContactNumber = 'Contact number must be valid';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      toast({
        title: "Registration successful!",
        description: "Your account has been created.",
      });
      navigate('/dashboard');
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex flex-col py-10 px-4">
        <div className="w-full max-w-md mx-auto">
          <Link to="/" className="flex items-center mb-6 text-serenova-600">
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back to Home
          </Link>
          
          <h1 className="page-header">Create your account</h1>
          
          <div className="card">
            <form onSubmit={handleSubmit}>
              <FloatingLabelInput
                id="fullName"
                name="fullName"
                type="text"
                label="Full Name"
                value={formData.fullName}
                onChange={handleChange}
                error={errors.fullName}
                autoComplete="name"
              />

              <FloatingLabelInput
                id="email"
                name="email"
                type="email"
                label="Email Address"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                autoComplete="email"
              />

              <FloatingLabelInput
                id="password"
                name="password"
                type="password"
                label="Password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                autoComplete="new-password"
              />

              <FloatingLabelInput
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                label="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                autoComplete="new-password"
              />

              <FloatingLabelInput
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                label="Phone Number (Optional)"
                value={formData.phoneNumber}
                onChange={handleChange}
                error={errors.phoneNumber}
                autoComplete="tel"
              />

              <h3 className="text-md font-semibold mt-6 mb-3 text-serenova-700">Emergency Contact</h3>

              <FloatingLabelInput
                id="emergencyContactName"
                name="emergencyContactName"
                type="text"
                label="Emergency Contact Name"
                value={formData.emergencyContactName}
                onChange={handleChange}
                error={errors.emergencyContactName}
              />

              <FloatingLabelInput
                id="emergencyContactNumber"
                name="emergencyContactNumber"
                type="tel"
                label="Emergency Contact Number"
                value={formData.emergencyContactNumber}
                onChange={handleChange}
                error={errors.emergencyContactNumber}
              />

              <div className="mt-6">
                <button type="submit" className="btn-primary w-full">
                  Register
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-serenova-600 hover:text-serenova-500">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RegisterPage;
