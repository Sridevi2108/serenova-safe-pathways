import { useState } from 'react';
import Layout from '../components/Layout';
import FloatingLabelInput from '../components/FloatingLabelInput';
import { useToast } from '@/hooks/use-toast';

const ProfilePage = () => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  const [userData, setUserData] = useState({
    fullName: 'Jessica Smith',
    email: 'jessica@example.com',
    phoneNumber: '555-123-4567',
    emergencyContactName: 'David Smith',
    emergencyContactNumber: '555-987-6543',
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const validateContactForm = () => {
    let valid = true;
    const newErrors = {
      ...errors,
      fullName: '',
      email: '',
      phoneNumber: '',
      emergencyContactName: '',
      emergencyContactNumber: '',
    };

    if (!userData.fullName) {
      newErrors.fullName = 'Full Name is required';
      valid = false;
    }

    if (!userData.email) {
      newErrors.email = 'Email is required';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(userData.email)) {
      newErrors.email = 'Email is invalid';
      valid = false;
    }

    if (userData.phoneNumber && userData.phoneNumber.trim() !== '') {
      const digitsOnly = userData.phoneNumber.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        newErrors.phoneNumber = 'Phone number must have 10-15 digits';
        valid = false;
      }
    }

    if (!userData.emergencyContactName) {
      newErrors.emergencyContactName = 'Emergency Contact Name is required';
      valid = false;
    }

    if (!userData.emergencyContactNumber) {
      newErrors.emergencyContactNumber = 'Emergency Contact Number is required';
      valid = false;
    } else {
      const digitsOnly = userData.emergencyContactNumber.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        newErrors.emergencyContactNumber = 'Contact number must have 10-15 digits';
        valid = false;
      }
    }

    setErrors(newErrors);
    return valid;
  };

  const validatePasswordForm = () => {
    let valid = true;
    const newErrors = {
      ...errors,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
      valid = false;
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
      valid = false;
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
      valid = false;
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
      valid = false;
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData({
      ...userData,
      [name]: value,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value,
    });
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateContactForm()) {
      toast({
        title: "Profile updated",
        description: "Your contact information has been updated successfully.",
      });
      setIsEditing(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validatePasswordForm()) {
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      setShowChangePassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  };

  return (
    <Layout showNavbar={true}>
      <div className="serenova-container py-8">
        <h1 className="page-header">Your Profile</h1>
        
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-serenova-700">Personal Information</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-serenova-600 hover:text-serenova-500"
              >
                Edit
              </button>
            )}
          </div>
          
          {isEditing ? (
            <form onSubmit={handleContactSubmit}>
              <FloatingLabelInput
                id="fullName"
                name="fullName"
                type="text"
                label="Full Name"
                value={userData.fullName}
                onChange={handleContactChange}
                error={errors.fullName}
              />
              
              <FloatingLabelInput
                id="email"
                name="email"
                type="email"
                label="Email Address"
                value={userData.email}
                onChange={handleContactChange}
                error={errors.email}
              />
              
              <FloatingLabelInput
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                label="Phone Number"
                value={userData.phoneNumber}
                onChange={handleContactChange}
                error={errors.phoneNumber}
              />
              
              <h3 className="text-md font-semibold mt-6 mb-3 text-serenova-700">Emergency Contact</h3>
              
              <FloatingLabelInput
                id="emergencyContactName"
                name="emergencyContactName"
                type="text"
                label="Emergency Contact Name"
                value={userData.emergencyContactName}
                onChange={handleContactChange}
                error={errors.emergencyContactName}
              />
              
              <FloatingLabelInput
                id="emergencyContactNumber"
                name="emergencyContactNumber"
                type="tel"
                label="Emergency Contact Number"
                value={userData.emergencyContactNumber}
                onChange={handleContactChange}
                error={errors.emergencyContactNumber}
              />
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium">{userData.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="font-medium">{userData.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="font-medium">{userData.phoneNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Emergency Contact</p>
                <p className="font-medium">
                  {userData.emergencyContactName} ({userData.emergencyContactNumber})
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="card">
          <h2 className="text-lg font-semibold text-serenova-700 mb-4">Security</h2>
          
          {showChangePassword ? (
            <form onSubmit={handlePasswordSubmit}>
              <FloatingLabelInput
                id="currentPassword"
                name="currentPassword"
                type="password"
                label="Current Password"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                error={errors.currentPassword}
              />
              
              <FloatingLabelInput
                id="newPassword"
                name="newPassword"
                type="password"
                label="New Password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                error={errors.newPassword}
              />
              
              <FloatingLabelInput
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                label="Confirm New Password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                error={errors.confirmPassword}
              />
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowChangePassword(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Password
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowChangePassword(true)}
              className="btn-outline w-full"
            >
              Change Password
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;
