import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Route, AlertTriangle, BookOpen, Star, User, LogOut, Menu, X,
    Siren,
    Shield // <-- Import Shield icon
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/pages/config';

// Define interface for the structure coming from /api/profile/:id
interface UserProfileData {
    id: number;
    full_name: string;
    email: string;
    phone_number: string | null;
    emergency_contacts: { id: number; name: string; number: string; }[];
}

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [emergencyContacts, setEmergencyContacts] = useState<{ name: string; number: string; }[]>([]);
    const location = useLocation();
    const { toast } = useToast();

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    // --- Updated navItems ---
    const navItems = [
        { name: "Route Planner", path: "/route-planner", icon: <Route className="w-5 h-5" /> },
        { name: "Report Incident", path: "/report-incident", icon: <AlertTriangle className="w-5 h-5" /> },
        { name: "Survivor Blog", path: "/survivor-blog", icon: <BookOpen className="w-5 h-5" /> },
        { name: "Rate a Route", path: "/rate-route", icon: <Star className="w-5 h-5" /> },
        { name: "Crime Data", path: "/crime-data", icon: <Shield className="w-5 h-5" /> }, // <-- Added Crime Data link
        { name: "Profile", path: "/profile", icon: <User className="w-5 h-5" /> },
    ];
    // --- End Updated navItems ---


    const isActive = (path: string) => {
        return location.pathname === path ? "bg-serenova-100 text-serenova-700" : "text-gray-600 hover:bg-serenova-50";
    };

    const fetchProfileData = useCallback(async () => {
        const userId = localStorage.getItem('userId');
        console.log("Navbar: Checking userId from localStorage:", userId);

        if (!userId) {
            console.log("Navbar: No userId found, cannot fetch profile for contacts.");
            setEmergencyContacts([]);
            return;
        }

        try {
            const response = await axios.get<UserProfileData>(`${API_BASE_URL}/api/profile/${userId}`);
            console.log("Navbar: Profile API response:", response.data);

            if (response.data && Array.isArray(response.data.emergency_contacts)) {
                const contacts = response.data.emergency_contacts.map(c => ({ name: c.name, number: c.number }));
                setEmergencyContacts(contacts);
                console.log("Navbar: Emergency contacts set:", contacts);
            } else {
                console.log("Navbar: No emergency contacts array found in profile data.");
                setEmergencyContacts([]);
            }
        } catch (error) {
            console.error("Navbar: Failed to fetch profile data for emergency contacts", error);
            setEmergencyContacts([]);
        }
    }, []);

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]);

    const sendEmergencyAlert = () => {
        const currentUserId = localStorage.getItem('userId');
        if (!currentUserId) {
            toast({
                title: "Not Logged In",
                description: "Cannot send alert. Please log in.",
                variant: "destructive",
            });
            return;
        }
        const userIdNum = parseInt(currentUserId, 10);

        if (navigator.geolocation) {
            toast({ title: "Getting location...", description: "Please wait." });
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    const locationData = { latitude, longitude };
                    console.log("Location obtained:", locationData);

                    try {
                        toast({ title: "Sending Alert...", description: "Contacting emergency services." });
                        const response = await axios.post(`${API_BASE_URL}/api/emergency/trigger`, {
                            userId: userIdNum,
                            location: locationData
                        });

                        console.log("Backend alert response:", response.data);
                        toast({
                            title: "Alert Sent",
                            description: response.data.message || "Alert trigger processed by server.",
                            variant: response.status === 207 ? "destructive" : "default",
                        });

                    } catch (error: any) {
                        console.error("Error calling backend emergency trigger:", error);
                        const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to trigger alert.";
                        toast({
                            title: "Alert Failed",
                            description: errMsg,
                            variant: "destructive",
                        });
                    }
                },
                (error) => {
                    console.error("Error getting location", error);
                    toast({
                        title: "Location Error",
                        description: `Could not get location: ${error.message}. Please allow location access.`,
                        variant: "destructive",
                    });
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            toast({
                title: "Geolocation Error",
                description: "Geolocation is not supported by your browser.",
                variant: "destructive",
            });
        }
    };

    return (
        <nav className="bg-white border-b border-serenova-100 sticky top-0 z-30">
            <div className="serenova-container py-2"> {/* Assuming serenova-container handles max-width and padding */}
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/dashboard" className="flex items-center space-x-2 flex-shrink-0">
                        <div className="bg-serenova-500 h-8 w-8 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-lg">S</span>
                        </div>
                        <span className="font-bold text-xl text-serenova-700">Serenova</span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center space-x-2">
                        {navItems.map((item) => (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive(item.path)}`}
                            >
                                <span className="mr-1.5">{item.icon}</span>
                                {item.name}
                            </Link>
                        ))}
                        {/* Desktop Emergency Button */}
                        <button
                            onClick={sendEmergencyAlert}
                            className="flex items-center px-3 py-2 rounded-md text-sm font-medium bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ml-2"
                            aria-label="Emergency Alert"
                        >
                            <Siren className="w-5 h-5 mr-1.5" /> SOS
                        </button>
                        <Link
                            to="/" // Assuming '/' logs out or goes to landing page
                            className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-serenova-50"
                            onClick={() => localStorage.clear()} // Example basic logout
                        >
                            <LogOut className="w-5 h-5 mr-1.5" /> Logout
                        </Link>
                    </div>

                    {/* Mobile Toggles */}
                    <div className="flex items-center md:hidden">
                        {/* Mobile Emergency Button */}
                        <button
                            onClick={sendEmergencyAlert}
                            className="p-2 rounded-md text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500 mr-2"
                            aria-label="Emergency Alert"
                        >
                            <Siren className="h-6 w-6" />
                        </button>
                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={toggleMenu}
                            className="p-2 rounded-md text-gray-600 hover:text-serenova-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-serenova-500"
                        >
                            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>

                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden animate-fade-in border-t border-gray-100">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center px-3 py-2.5 rounded-md text-base font-medium ${isActive(item.path)}`}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <span className="mr-3">{item.icon}</span>
                                {item.name}
                            </Link>
                        ))}
                        <Link
                            to="/"
                            className="flex items-center px-3 py-2.5 rounded-md text-base font-medium text-gray-600 hover:bg-serenova-50"
                            onClick={() => {
                                localStorage.clear(); // Example basic logout
                                setIsMenuOpen(false);
                            }}
                        >
                            <LogOut className="w-5 h-5 mr-3" /> Logout
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;