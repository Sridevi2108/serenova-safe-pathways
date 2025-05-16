// src/pages/profile.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, AlertCircle, Loader2, PlusCircle, Trash2 } from "lucide-react";

import Layout from "../components/Layout"; // Adjust path if needed
import FloatingLabelInput from "../components/FloatingLabelInput"; // Adjust path if needed
import { useToast } from "@/hooks/use-toast"; // Adjust path if needed
import { API_BASE_URL } from "@/pages/config"; // Adjust path if needed

// --- Interfaces ---
interface EmergencyContact {
    id?: number;
    name: string;
    number: string;
}

interface UserProfile {
    id?: number;
    full_name: string;
    email: string;
    phone_number: string | null;
    emergency_contacts: EmergencyContact[];
}

interface FormErrors {
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    emergencyContactsError?: string;
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    general?: string;
}

const ProfilePage = () => {
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Start loading immediately
    const [isSaving, setIsSaving] = useState(false);

    // --- State for User ID (Initialize as null) ---
    const [userId, setUserId] = useState<number | null>(null);

    const [userData, setUserData] = useState<UserProfile>({
        full_name: "",
        email: "",
        phone_number: "",
        emergency_contacts: [],
    });
    const [originalUserData, setOriginalUserData] = useState<UserProfile | null>(null);
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState<FormErrors>({});

    // --- Effect to retrieve User ID on component mount ---
    useEffect(() => {
        console.log("ProfilePage mounting: attempting to get userId...");
        // Retrieve the userId stored by the LoginPage
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
            const parsedUserId = parseInt(storedUserId, 10);
            if (!isNaN(parsedUserId)) {
                console.log("ProfilePage: Found valid userId in storage:", parsedUserId);
                setUserId(parsedUserId); // Set the valid ID from storage
            } else {
                // Handle case where stored value isn't a valid number
                console.error("ProfilePage: Stored userId is not a number:", storedUserId);
                setErrors({ general: "Invalid user session. Please log in again." });
                setIsLoading(false); // Stop loading, we can't fetch profile
            }
        } else {
            // Handle case where no userId is found (user likely not logged in)
            console.error("ProfilePage: No userId found in storage.");
            setErrors({ general: "Cannot load profile. Please log in." });
            setIsLoading(false); // Stop loading
        }
    }, []); // Empty dependency array means this runs only once on mount

    // --- Fetch User Profile Data (depends on userId state) ---
    const fetchProfile = useCallback(async () => {
        // This guard is essential. It prevents fetching if userId is still null.
        if (userId === null) {
            console.log("fetchProfile skipped: userId is null.");
            return;
        }

        console.log(`Workspaceing profile for actual user ID: ${userId}`);
        setIsLoading(true); // Ensure loading is true before this specific fetch
        setErrors(prev => ({ ...prev, general: '' })); // Clear general errors before fetch

        try {
            const response = await fetch(`${API_BASE_URL}/api/profile/${userId}`, {
                method: "GET",
                headers: { Accept: "application/json" },
                 // Add Authorization header if your backend requires it
                 // 'Authorization': `Bearer ${your_auth_token}`
            });
            const data = await response.json();

            if (!response.ok) {
                // Use error message from backend (like "User not found")
                throw new Error(data.message || data.error || `Failed to fetch profile: ${response.statusText}`);
            }

            const profileData: UserProfile = {
                id: data.id,
                full_name: data.full_name ?? "",
                email: data.email ?? "",
                phone_number: data.phone_number ?? "",
                emergency_contacts: data.emergency_contacts ?? [],
            };
            setUserData(profileData);
            setOriginalUserData(profileData); // Keep backup for cancel functionality

        } catch (error) {
            console.error("Error fetching profile:", error);
            const errorMsg = error instanceof Error ? error.message : "Could not load profile data.";
            setErrors(prev => ({ ...prev, general: errorMsg }));
            // Avoid redundant toast if error message is already shown via setErrors
            // toast({ title: "Error Loading Profile", description: errorMsg, variant: "destructive" });
        } finally {
            setIsLoading(false); // Set loading to false *after* the fetch attempt completes
        }
    }, [userId, toast]); // useCallback dependencies

    // --- Effect to trigger fetch *after* userId state is set ---
    useEffect(() => {
        // Only call fetchProfile if userId has been successfully set (is not null)
        if (userId !== null) {
            fetchProfile();
        }
    }, [userId, fetchProfile]); // This effect runs when userId changes or fetchProfile definition changes


    // --- Validation Functions (Keep as before) ---
    const validateContactForm = () => {
        let valid = true;
        const newErrors: Partial<FormErrors> = {};
        // ... (validation logic as in your previous correct version) ...
         if (!userData.full_name?.trim()) {newErrors.fullName = "Full Name is required"; valid = false;}
         if (userData.phone_number && userData.phone_number.trim()) { const digitsOnly = userData.phone_number.replace(/\D/g, ""); if (digitsOnly.length < 7 || digitsOnly.length > 15) {newErrors.phoneNumber = "Phone number format seems incorrect"; valid = false;}}
         if (!userData.emergency_contacts || userData.emergency_contacts.length === 0) { newErrors.emergencyContactsError = "At least one emergency contact is required"; valid = false; }
         else { let contactErrorFound = false; userData.emergency_contacts.forEach((contact) => { if (!contact.name?.trim() || !contact.number?.trim()) { contactErrorFound = true; } else { const digitsOnly = contact.number.replace(/\D/g, ""); if (digitsOnly.length < 7 || digitsOnly.length > 15) { contactErrorFound = true; } } }); if (contactErrorFound) { newErrors.emergencyContactsError = "All contacts must have valid name & number (7-15 digits)."; valid = false; } }
         setErrors(prev => ({ ...prev, fullName: newErrors.fullName, phoneNumber: newErrors.phoneNumber, emergencyContactsError: newErrors.emergencyContactsError, general: "" }));
        return valid;
    };

    const validatePasswordForm = () => {
        // ... (validation logic as before) ...
        let valid = true; const newErrors: Partial<FormErrors> = {};
        if (!passwordData.currentPassword) { newErrors.currentPassword = "Current password is required"; valid = false; }
        if (!passwordData.newPassword || passwordData.newPassword.length < 6) { newErrors.newPassword = "New password must be at least 6 characters long"; valid = false; }
        if (passwordData.newPassword !== passwordData.confirmPassword) { newErrors.confirmPassword = "Passwords do not match"; valid = false; }
        setErrors(prev => ({ ...prev, currentPassword: newErrors.currentPassword, newPassword: newErrors.newPassword, confirmPassword: newErrors.confirmPassword }));
        return valid;
    };

    // --- Input Handlers (Keep as before) ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target; setUserData(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof FormErrors]) { setErrors(prev => ({ ...prev, [name]: undefined })); }
    };
    const handleEmergencyContactChange = (index: number, field: "name" | "number", value: string) => {
        setUserData(prev => { const updatedContacts = [...prev.emergency_contacts]; updatedContacts[index] = { ...updatedContacts[index], [field]: value }; return { ...prev, emergency_contacts: updatedContacts }; });
        if (errors.emergencyContactsError) { setErrors(prev => ({ ...prev, emergencyContactsError: undefined })); }
    };
    const handleAddContact = () => {
        setUserData(prev => ({ ...prev, emergency_contacts: [...prev.emergency_contacts, { name: "", number: "" }], }));
    };
    const handleRemoveContact = (index: number) => {
        setUserData(prev => ({ ...prev, emergency_contacts: prev.emergency_contacts.filter((_, i) => i !== index), }));
    };
     const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => { // Add this if missing
         const { name, value } = e.target;
         setPasswordData(prev => ({ ...prev, [name]: value }));
         if (errors[name as keyof FormErrors]) {
              setErrors(prev => ({ ...prev, [name]: undefined }));
          }
     };

    // --- Submit Handlers (Keep as before) ---
    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setErrors(prev => ({ ...prev, general: "" }));
        if (!validateContactForm()) return;
        if (!userId) { setErrors(prev => ({ ...prev, general: "Cannot update profile: User not identified." })); return; }
        setIsSaving(true);
        const payload = { fullName: userData.full_name, phoneNumber: userData.phone_number, emergencyContacts: userData.emergency_contacts.map(c => ({ name: c.name, number: c.number })), };
        console.log("Submitting payload:", payload);
        try {
            const response = await fetch(`${API_BASE_URL}/api/profile/${userId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), });
            const responseData = await response.json();
            if (!response.ok) { throw new Error(responseData.description || responseData.error || `Update failed: ${response.statusText}`); }
            toast({ title: "Profile Updated", description: responseData.message || "Information updated successfully." });
            if (responseData.user) {
                const updatedProfile: UserProfile = { id: responseData.user.id, full_name: responseData.user.full_name ?? "", email: responseData.user.email ?? "", phone_number: responseData.user.phone_number ?? "", emergency_contacts: responseData.user.emergency_contacts ?? [], };
                setUserData(updatedProfile); setOriginalUserData(updatedProfile);
            }
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile:", error); const errorMsg = error instanceof Error ? error.message : "An unknown error occurred."; setErrors(prev => ({ ...prev, general: errorMsg })); toast({ title: "Update Failed", description: errorMsg, variant: "destructive" });
        } finally { setIsSaving(false); }
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
      e.preventDefault(); if (!validatePasswordForm()) return;
      // --- TODO: Implement actual API call for password change ---
      console.log("Password change submitted (API call not implemented):", passwordData);
      toast({
          title: "Password Change (Not Implemented)",
          description: "Backend endpoint needed.",
          // 👇👇👇 THIS LINE IS STILL WRONG 👇👇👇
          variant: "default"
      });
      // Optionally clear fields and hide form on mock success
      // setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      // setShowChangePassword(false);
  };
    // --- Cancel Handler (Keep as before) ---
    const handleCancelEdit = () => {
        if (originalUserData) { setUserData(originalUserData); }
        setIsEditing(false); setErrors({}); setShowChangePassword(false); // Also hide password form on cancel
    };

    // --- JSX ---
    return (
        <Layout showNavbar={true}>
            <div className="max-w-2xl mx-auto py-8 px-4">
                <h1 className="text-3xl font-bold mb-6 text-gray-800">Your Profile</h1>

                {/* Combined Loading/Error Display */}
                {isLoading && <div className="text-center p-10 text-gray-500">Loading profile...</div>}

                {!isLoading && errors.general && (
                    <div className="mb-4 flex items-start p-3 bg-red-100 text-red-700 border border-red-300 rounded-lg text-sm">
                        <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                        <span>{errors.general}</span>
                        {/* Optionally add a button to navigate to login if error indicates not logged in */}
                    </div>
                )}

                {/* Render profile content only if: Not Loading AND No General Error AND userId is Valid */}
                {!isLoading && !errors.general && userId !== null && (
                    <>
                        {/* Personal Information Card */}
                        <div className="bg-white shadow overflow-hidden rounded-lg p-6 mb-6 border border-gray-200">
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-800">Personal Information</h2>
                                {!isEditing && (
                                    <button onClick={() => setIsEditing(true)} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"> Edit </button>
                                )}
                            </div>

                            {isEditing ? (
                                // --- EDITING FORM ---
                                <form onSubmit={handleContactSubmit} className="space-y-4">
                                    <FloatingLabelInput id="full_name" name="full_name" type="text" label="Full Name" value={userData.full_name} onChange={handleInputChange} error={errors.fullName} disabled={isSaving}/>
                                    <FloatingLabelInput id="email" name="email" type="email" label="Email Address" value={userData.email} disabled /> {/* Email usually not editable */}
                                    <FloatingLabelInput id="phone_number" name="phone_number" type="tel" label="Phone Number (Optional)" value={userData.phone_number || ""} onChange={handleInputChange} error={errors.phoneNumber} disabled={isSaving}/>

                                    <h3 className="text-md font-semibold pt-4 text-gray-800 border-t border-gray-200 mt-4">Emergency Contacts</h3>
                                    {errors.emergencyContactsError && <p className="text-sm text-red-600 mt-1">{errors.emergencyContactsError}</p>}

                                    {userData.emergency_contacts.map((contact, index) => (
                                        <div key={contact.id ?? `new-${index}`} className="flex items-center space-x-2 border p-3 rounded-md bg-gray-50 relative group">
                                            <div className="flex-grow space-y-2">
                                                <FloatingLabelInput id={`ec_name_${index}`} name={`ec_name_${index}`} type="text" label={`Contact ${index + 1} Name`} value={contact.name} onChange={(e) => handleEmergencyContactChange(index, "name", e.target.value)} disabled={isSaving}/>
                                                <FloatingLabelInput id={`ec_num_${index}`} name={`ec_num_${index}`} type="tel" label={`Contact ${index + 1} Number`} value={contact.number} onChange={(e) => handleEmergencyContactChange(index, "number", e.target.value)} disabled={isSaving}/>
                                            </div>
                                            <button type="button" onClick={() => handleRemoveContact(index)} className="p-1 text-red-500 hover:text-red-700 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Remove contact ${index + 1}`} disabled={isSaving}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}

                                    <button type="button" onClick={handleAddContact} className="flex items-center justify-center w-full px-4 py-2 border border-dashed border-gray-400 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 mt-2" disabled={isSaving}>
                                        <PlusCircle size={16} className="mr-2" /> Add Emergency Contact
                                    </button>

                                    {/* Form Action Buttons */}
                                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-6">
                                        <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50" disabled={isSaving}> Cancel </button>
                                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-75 flex items-center justify-center" disabled={isSaving}>
                                            {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : null}
                                            {isSaving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                // --- DISPLAY MODE ---
                                <div className="space-y-4">
                                    <ProfileDisplayItem label="Full Name" value={userData.full_name} />
                                    <ProfileDisplayItem label="Email Address" value={userData.email} />
                                    <ProfileDisplayItem label="Phone Number" value={userData.phone_number} />

                                    <h3 className="text-md font-semibold pt-4 text-gray-800 border-t border-gray-200 mt-4">Emergency Contacts</h3>
                                    {userData.emergency_contacts.length > 0 ? (
                                        userData.emergency_contacts.map((contact, index) => (
                                             <div key={contact.id ?? index} className="pl-2 border-l-2 border-gray-200 mb-2">
                                                 <p className="text-sm"><strong className="text-gray-600">{contact.name}:</strong> <span className="text-gray-800">{contact.number}</span></p>
                                             </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 italic mt-2">No emergency contacts added.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Security Card */}
                        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Security</h2>
                            {showChangePassword ? (
                                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                    <FloatingLabelInput id="currentPassword" name="currentPassword" type="password" label="Current Password" value={passwordData.currentPassword} onChange={handlePasswordChange} error={errors.currentPassword} />
                                    <FloatingLabelInput id="newPassword" name="newPassword" type="password" label="New Password" value={passwordData.newPassword} onChange={handlePasswordChange} error={errors.newPassword} />
                                    <FloatingLabelInput id="confirmPassword" name="confirmPassword" type="password" label="Confirm New Password" value={passwordData.confirmPassword} onChange={handlePasswordChange} error={errors.confirmPassword} />
                                    <div className="flex justify-end space-x-3 pt-4">
                                        <button type="button" onClick={() => { setShowChangePassword(false); setErrors({}); /* Clear password errors */ }} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Update Password</button>
                                    </div>
                                </form>
                            ) : (
                                <button onClick={() => setShowChangePassword(true)} className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-indigo-600 hover:bg-indigo-50">
                                    Change Password
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
};

// Helper Component (Keep as is or integrate into display logic)
const ProfileDisplayItem = ({ label, value }: { label: string; value: string | null | undefined }) => (
     <div className="mb-2"> {/* Add some margin */}
         <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
         <p className="font-medium text-gray-900 mt-0.5">{value || <span className="text-gray-400 italic">Not set</span>}</p>
     </div>
);


export default ProfilePage;