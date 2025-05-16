import React, { useState } from 'react'; // Import React
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import FloatingLabelInput from '../components/FloatingLabelInput';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react'; // Import Loader2 for loading state
import { API_BASE_URL } from '@/pages/config'; // Import API Base URL

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
        general: '', // Add general error field
    });

    const [isSubmitting, setIsSubmitting] = useState(false); // Add loading state

    // --- Validation Function (Keep as is) ---
    const validateForm = () => {
        let valid = true;
        const newErrors = { /* ... (validation logic as before) ... */
            fullName: '', email: '', password: '', confirmPassword: '',
            phoneNumber: '', emergencyContactName: '', emergencyContactNumber: '', general: ''
        };
        if (!formData.fullName) { newErrors.fullName = 'Full Name is required'; valid = false; }
        if (!formData.email) { newErrors.email = 'Email is required'; valid = false; }
        else if (!/\S+@\S+\.\S+/.test(formData.email)) { newErrors.email = 'Email is invalid'; valid = false; }
        if (!formData.password) { newErrors.password = 'Password is required'; valid = false; }
        else if (formData.password.length < 6) { newErrors.password = 'Password must be at least 6 characters'; valid = false; }
        if (!formData.confirmPassword) { newErrors.confirmPassword = 'Please confirm your password'; valid = false; }
        else if (formData.password !== formData.confirmPassword) { newErrors.confirmPassword = 'Passwords do not match'; valid = false; }
        if (formData.phoneNumber && formData.phoneNumber.trim() !== '') {
            const digitsOnly = formData.phoneNumber.replace(/\D/g, '');
            if (digitsOnly.length < 7 || digitsOnly.length > 15) { // Adjusted min length
                newErrors.phoneNumber = 'Phone number format seems incorrect'; valid = false; }
        }
        if (!formData.emergencyContactName) { newErrors.emergencyContactName = 'Emergency Contact Name is required'; valid = false; }
        if (!formData.emergencyContactNumber) { newErrors.emergencyContactNumber = 'Emergency Contact Number is required'; valid = false; }
        else { const digitsOnly = formData.emergencyContactNumber.replace(/\D/g, '');
            if (digitsOnly.length < 7 || digitsOnly.length > 15) { // Adjusted min length
                newErrors.emergencyContactNumber = 'Contact number format seems incorrect'; valid = false; }
        }
        setErrors(newErrors);
        return valid;
    };

    // --- Handle Change (Keep as is) ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value, });
        // Clear specific error on change
        if (errors[name as keyof typeof errors]) {
             setErrors(prev => ({ ...prev, [name]: '' }));
         }
    };

    // --- Handle Submit (Modified Payload) ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors(prev => ({ ...prev, general: '' })); // Clear general errors

        if (validateForm()) {
            setIsSubmitting(true); // Set loading state

            // --- Construct the correct payload ---
            const payload = {
                fullName: formData.fullName,
                email: formData.email,
                password: formData.password,
                phoneNumber: formData.phoneNumber || null, // Send null if empty
                // Create the emergencyContacts array structure
                emergencyContacts: [
                    {
                        name: formData.emergencyContactName,
                        number: formData.emergencyContactNumber
                    }
                ]
            };
            // Note: confirmPassword is not sent to the backend

            try {
                // Use API_BASE_URL
                const res = await fetch(`${API_BASE_URL}/api/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // Send the structured payload, not the raw formData
                    body: JSON.stringify(payload),
                });

                // Try to parse JSON response regardless of status code
                const data = await res.json();

                if (res.ok) {
                    toast({
                        title: "Registration successful!",
                        description: data.message || "Your account has been created.", // Use message from backend
                    });
                    navigate('/login'); // Go to login page after registration
                } else {
                    // Handle specific errors (like 409 Conflict) or general ones
                    console.error("Registration failed:", data);
                    const errorMessage = data.error || `Registration failed with status: ${res.status}`;
                    setErrors(prev => ({ ...prev, general: errorMessage })); // Show error near form
                    toast({
                        title: "Registration Failed",
                        description: errorMessage,
                        variant: "destructive" // Use destructive style for errors
                    });
                }
            } catch (error) {
                console.error("Registration Fetch Error:", error);
                const generalError = "Could not connect to server or an unexpected error occurred.";
                setErrors(prev => ({ ...prev, general: generalError }));
                toast({
                    title: "Network Error",
                    description: generalError,
                    variant: "destructive"
                });
            } finally {
                 setIsSubmitting(false); // Clear loading state
            }
        }
    };


    return (
        <Layout showNavbar={false}> {/* Assuming no navbar on register page */}
            <div className="min-h-screen flex flex-col py-10 px-4 bg-gradient-to-br from-serenova-50 via-white to-serenova-100">
                <div className="w-full max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg border border-serenova-100">
                    <Link to="/" className="flex items-center mb-6 text-sm text-serenova-600 hover:text-serenova-800 transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Home
                    </Link>

                    <h1 className="text-2xl font-bold text-center text-serenova-700 mb-6">Create your Serenova account</h1>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* General Error Display */}
                        {errors.general && (
                             <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                                 {errors.general}
                            </div>
                        )}

                        <FloatingLabelInput id="fullName" name="fullName" type="text" label="Full Name" value={formData.fullName} onChange={handleChange} error={errors.fullName} autoComplete="name" disabled={isSubmitting}/>
                        <FloatingLabelInput id="email" name="email" type="email" label="Email Address" value={formData.email} onChange={handleChange} error={errors.email} autoComplete="email" disabled={isSubmitting}/>
                        <FloatingLabelInput id="password" name="password" type="password" label="Password (min. 6 characters)" value={formData.password} onChange={handleChange} error={errors.password} autoComplete="new-password" disabled={isSubmitting}/>
                        <FloatingLabelInput id="confirmPassword" name="confirmPassword" type="password" label="Confirm Password" value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword} autoComplete="new-password" disabled={isSubmitting}/>
                        <FloatingLabelInput id="phoneNumber" name="phoneNumber" type="tel" label="Phone Number (Optional)" value={formData.phoneNumber} onChange={handleChange} error={errors.phoneNumber} autoComplete="tel" placeholder="e.g., 1234567890" disabled={isSubmitting}/>

                        <h3 className="text-md font-semibold pt-4 text-serenova-700 border-t mt-5">Emergency Contact (Required)</h3>
                        <FloatingLabelInput id="emergencyContactName" name="emergencyContactName" type="text" label="Contact Full Name" value={formData.emergencyContactName} onChange={handleChange} error={errors.emergencyContactName} disabled={isSubmitting}/>
                        <FloatingLabelInput id="emergencyContactNumber" name="emergencyContactNumber" type="tel" label="Contact Phone Number" value={formData.emergencyContactNumber} onChange={handleChange} error={errors.emergencyContactNumber} placeholder="e.g., 0987654321" disabled={isSubmitting}/>

                        <div className="pt-4">
                            <button type="submit" className="btn-primary w-full flex items-center justify-center" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2"/> : null}
                                {isSubmitting ? 'Registering...' : 'Create Account'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-serenova-600 hover:text-serenova-500">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default RegisterPage;