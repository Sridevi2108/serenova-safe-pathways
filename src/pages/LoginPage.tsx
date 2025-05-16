import React, { useState } from 'react'; // Import React
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import FloatingLabelInput from '../components/FloatingLabelInput';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react'; // Import Loader2
import { API_BASE_URL } from '@/pages/config'; // Import API Base URL

const LoginPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [errors, setErrors] = useState({
        email: '',
        password: '',
        general: '', // Add general error field
    });
    const [isSubmitting, setIsSubmitting] = useState(false); // Add loading state

    // --- Validation (Keep as is) ---
    const validateForm = () => {
        let valid = true;
        const newErrors = { email: '', password: '', general: '' };

        if (!formData.email) { newErrors.email = 'Email is required'; valid = false; }
        else if (!/\S+@\S+\.\S+/.test(formData.email)) { newErrors.email = 'Email is invalid'; valid = false; }
        if (!formData.password) { newErrors.password = 'Password is required'; valid = false; }

        setErrors(newErrors);
        return valid;
    };

    // --- HandleChange (Keep as is) ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value, });
        // Clear specific error on change
        if (errors[name as keyof typeof errors]) {
             setErrors(prev => ({ ...prev, [name]: '' }));
         }
    };


    // --- HandleSubmit (MODIFIED) ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({ email: '', password: '', general: '' }); // Clear previous errors

        if (validateForm()) {
            setIsSubmitting(true); // Set loading state

            try {
                // Use API_BASE_URL
                const response = await axios.post(`${API_BASE_URL}/api/login`, formData);

                // --- Store User Info on Success ---
                // Check if response.data and user info exist
                if (response.data && response.data.user && response.data.user.id) {
                    const userId = response.data.user.id;
                    const userName = response.data.user.full_name;

                    // Store user ID and name in localStorage
                    localStorage.setItem('userId', userId.toString());
                    localStorage.setItem('userName', userName || ''); // Store name, fallback to empty string

                    console.log('Login successful, stored userId:', userId); // For debugging

                    toast({
                        title: "Login successful!",
                        description: `Welcome back, ${userName || 'User'}!`,
                    });
                    navigate('/dashboard'); // Navigate AFTER storing data

                } else {
                    // Handle cases where the success response might be missing data
                    console.error("Login response missing expected user data:", response.data);
                    setErrors({ ...errors, general: "Login failed: Invalid response from server." });
                    toast({
                        title: "Login Failed",
                        description: "Received invalid data after login.",
                        variant: "destructive",
                    });
                }

            } catch (error: any) {
                console.error("Login Axios Error:", error); // Log the full error object

                // Extract error message from backend response if available
                const errorMessage = error.response?.data?.error // Use '.error' which backend sends
                                   || error.message // Fallback to Axios error message
                                   || "An unknown error occurred during login.";

                setErrors({ ...errors, general: errorMessage }); // Display general error
                toast({
                    title: "Login failed",
                    description: errorMessage,
                    variant: "destructive",
                });
            } finally {
                setIsSubmitting(false); // Clear loading state
            }
        }
    };

    return (
        <Layout showNavbar={false}> {/* Assuming no navbar on login page */}
            <div className="min-h-screen flex flex-col py-10 px-4 bg-gradient-to-br from-serenova-50 via-white to-serenova-100">
                 <div className="w-full max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg border border-serenova-100 mt-10"> {/* Added margin-top */}
                    <Link to="/" className="flex items-center mb-6 text-sm text-serenova-600 hover:text-serenova-800 transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Home
                    </Link>

                    <h1 className="text-2xl font-bold text-center text-serenova-700 mb-6">Log in to Serenova</h1>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* General Error Display */}
                        {errors.general && (
                             <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                                 {errors.general}
                            </div>
                        )}

                        <FloatingLabelInput
                            id="email" name="email" type="email" label="Email Address"
                            value={formData.email} onChange={handleChange} error={errors.email}
                            autoComplete="email" disabled={isSubmitting}
                        />
                        <FloatingLabelInput
                            id="password" name="password" type="password" label="Password"
                            value={formData.password} onChange={handleChange} error={errors.password}
                            autoComplete="current-password" disabled={isSubmitting}
                        />
                        <div className="pt-4">
                            <button type="submit" className="btn-primary w-full flex items-center justify-center" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2"/> : null}
                                {isSubmitting ? 'Logging in...' : 'Login'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link to="/register" className="font-medium text-serenova-600 hover:text-serenova-500">
                                Create one
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default LoginPage;