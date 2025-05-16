import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { MapPin, Calendar, BarChart, Loader2, AlertCircle, ShieldAlert, Building, Map } from 'lucide-react';

// --- NEW: Import Layout ---
import Layout from '../components/Layout'; // <--- Adjust path if needed
// --- Remove Navbar import if Layout handles it ---
// import Navbar from '@/components/Navbar'; // <-- REMOVE THIS LINE

import { API_BASE_URL } from './config'; // Adjust path as needed
import { useToast } from '@/hooks/use-toast'; // Adjust path as needed
import CrimeDisplay, { CrimeData } from '@/components/CrimeDisplay'; // Adjust path

interface LocationItem {
    name: string;
}

const CrimeDataPage = () => {
    // Existing state... (keep all state variables as they were)
    const [states, setStates] = useState<LocationItem[]>([]);
    const [districts, setDistricts] = useState<LocationItem[]>([]);
    const [selectedState, setSelectedState] = useState<string>('');
    const [selectedDistrict, setSelectedDistrict] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [isFetchingYears, setIsFetchingYears] = useState<boolean>(false);
    const [crimeData, setCrimeData] = useState<CrimeData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isFetchingLocations, setIsFetchingLocations] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    // All functions (fetchStates, fetchDistricts, fetchAvailableYears, handlers, useEffect)
    // remain exactly the same as before...
    // ... (fetchStates logic) ...
    const fetchStates = useCallback(async () => {
        setIsFetchingLocations(true);
        setError(null);
        try {
            const response = await axios.get<{ states: LocationItem[] }>(`${API_BASE_URL}/api/locations/states`);
            setStates(response.data.states || []);
        } catch (err) {
            console.error("Failed to fetch states:", err);
            setError("Could not load states. Please try refreshing.");
            toast({ title: "Error", description: "Could not load states.", variant: "destructive" });
            setStates([]);
        } finally {
            setIsFetchingLocations(false);
        }
    }, [toast]);

    // ... (fetchDistricts logic) ...
     const fetchDistricts = useCallback(async (stateName: string) => {
        if (!stateName) {
            setDistricts([]);
            setSelectedDistrict('');
            setAvailableYears([]);
            setSelectedYear('');
            setCrimeData(null);
            return;
        }
        setIsFetchingLocations(true);
        setError(null);
        setDistricts([]);
        setSelectedDistrict('');
        setAvailableYears([]);
        setSelectedYear('');
        setCrimeData(null);
        try {
            const response = await axios.get<{ districts: LocationItem[] }>(`${API_BASE_URL}/api/locations/districts?state=${encodeURIComponent(stateName)}`);
            setDistricts(response.data.districts || []);
        } catch (err) {
            console.error("Failed to fetch districts:", err);
            setError(`Could not load districts for ${stateName}.`);
            toast({ title: "Error", description: `Could not load districts for ${stateName}.`, variant: "destructive" });
            setDistricts([]);
        } finally {
            setIsFetchingLocations(false);
        }
    }, [toast]);

    // ... (fetchAvailableYears logic) ...
     const fetchAvailableYears = useCallback(async (stateName: string, districtName: string) => {
        if (!stateName || !districtName) {
             setAvailableYears([]);
             setSelectedYear('');
             return;
        }
        setIsFetchingYears(true);
        setError(null);
        setAvailableYears([]);
        setSelectedYear('');
        setCrimeData(null);
        try {
            const response = await axios.get<{ years: number[] }>(`${API_BASE_URL}/api/locations/years-for-location`, {
                params: { state: stateName, district: districtName }
            });
            const fetchedYears = response.data.years || [];
            setAvailableYears(fetchedYears);
        } catch (err: any) {
            console.error("Failed to fetch available years:", err);
            const errMsg = err.response?.data?.message || err.message || `Could not load years for ${districtName}, ${stateName}.`;
            setError(errMsg);
            toast({ title: "Error Fetching Years", description: errMsg, variant: "destructive" });
            setAvailableYears([]);
        } finally {
            setIsFetchingYears(false);
        }
    }, [toast]);

    // ... (useEffect logic) ...
     useEffect(() => {
        fetchStates();
    }, [fetchStates]);

    // ... (handleStateChange logic) ...
     const handleStateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newState = event.target.value;
        setSelectedState(newState);
        fetchDistricts(newState);
    };

    // ... (handleDistrictChange logic) ...
     const handleDistrictChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newDistrict = event.target.value;
        setSelectedDistrict(newDistrict);
        if (selectedState) {
            fetchAvailableYears(selectedState, newDistrict);
        } else {
            setAvailableYears([]);
            setSelectedYear('');
        }
    };

    // ... (handleFetchCrimeData logic) ...
     const handleFetchCrimeData = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedState || !selectedDistrict || !selectedYear) {
            toast({ title: "Selection Missing", description: "Please select State, District, and Year.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        setError(null);
        setCrimeData(null);
        try {
            const response = await axios.get<CrimeData>(`${API_BASE_URL}/api/crime-data`, {
                params: { state: selectedState, district: selectedDistrict, year: selectedYear }
            });
            console.log("Crime Data Received:", response.data);
            if (response.data) {
                setCrimeData(response.data);
            } else {
                throw new Error("Received empty data from server.");
            }
        } catch (err: any) {
            console.error("Failed to fetch crime data:", err);
            const errMsg = err.response?.data?.message || err.message || `Could not load crime data for ${selectedDistrict}, ${selectedYear}.`;
            if (err.response?.status === 404 && err.config?.url?.includes('/api/crime-data')) {
                const specificMsg = err.response?.data?.message || `No crime data found for ${selectedDistrict}, ${selectedState} in ${selectedYear}.`;
                setError(specificMsg);
                toast({ title: "Data Not Found", description: specificMsg, variant: "default" });
            } else {
                setError(errMsg);
                toast({ title: "Error Fetching Data", description: errMsg, variant: "destructive" });
            }
            setCrimeData(null);
        } finally {
            setIsLoading(false);
        }
    };

    // --- UPDATED JSX Rendering ---
    return (
        // Use Layout component to wrap the page content
        <Layout showNavbar={true}> {/* <-- Use Layout wrapper */}
            {/* The main container for page content */}
            <div className="serenova-container py-8 px-4 md:px-6 lg:px-8">
                {/* Title and intro text */}
                 <div className="flex items-center mb-6">
                     <BarChart className="w-8 h-8 text-serenova-600 mr-3" />
                     <h1 className="text-3xl font-bold text-serenova-700">Crime Data Explorer</h1>
                 </div>
                 <p className="text-gray-600 mb-8">
                     Select a State/UT and District to see available years, then choose a year to view reported crime statistics.
                     <br />
                     <small className="text-gray-500">*Data availability may vary. Source: NCRB (Illustrative based on provided headers).</small>
                 </p>

                {/* Selection Form */}
                <form onSubmit={handleFetchCrimeData} className="bg-white p-6 rounded-lg shadow-md border border-serenova-100 mb-8">
                   {/* ... (Keep the entire form structure with State/District/Year selects and button) ... */}
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        {/* State Dropdown */}
                        <div className="col-span-1">
                            <label htmlFor="state-select" className="block text-sm font-medium text-gray-700 mb-1">
                                <MapPin className="w-4 h-4 inline-block mr-1" /> State/UT
                            </label>
                            <select
                                id="state-select"
                                value={selectedState}
                                onChange={handleStateChange}
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-serenova-500 focus:border-serenova-500 disabled:bg-gray-100"
                                disabled={isFetchingLocations}
                                required
                            >
                                <option value="" disabled>-- Select State --</option>
                                {states.map((state) => (
                                    <option key={state.name} value={state.name}>{state.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* District Dropdown */}
                        <div className="col-span-1">
                            <label htmlFor="district-select" className="block text-sm font-medium text-gray-700 mb-1">
                               <Building className="w-4 h-4 inline-block mr-1" /> District
                            </label>
                            <select
                                id="district-select"
                                value={selectedDistrict}
                                onChange={handleDistrictChange}
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-serenova-500 focus:border-serenova-500 disabled:bg-gray-100"
                                disabled={!selectedState || isFetchingLocations || districts.length === 0}
                                required
                            >
                                <option value="" disabled>-- Select District --</option>
                                {districts.map((district) => (
                                    <option key={district.name} value={district.name}>{district.name}</option>
                                ))}
                                {!isFetchingLocations && selectedState && districts.length === 0 && (
                                    <option disabled>No districts found</option>
                                )}
                            </select>
                        </div>

                         {/* Year Dropdown */}
                         <div className="col-span-1">
                             <label htmlFor="year-select" className="block text-sm font-medium text-gray-700 mb-1">
                                 <Calendar className="w-4 h-4 inline-block mr-1" /> Year {isFetchingYears && <Loader2 className="w-3 h-3 inline-block ml-1 animate-spin" />}
                             </label>
                             <select
                                 id="year-select"
                                 value={selectedYear}
                                 onChange={(e) => setSelectedYear(e.target.value)}
                                 className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-serenova-500 focus:border-serenova-500 disabled:bg-gray-100"
                                 disabled={!selectedState || !selectedDistrict || isFetchingYears || availableYears.length === 0}
                                 required
                             >
                                 <option value="" disabled>
                                     {!selectedState || !selectedDistrict ? "-- Select State & District --" :
                                      isFetchingYears ? "Loading Years..." :
                                      availableYears.length === 0 ? "-- No Data Years Found --" :
                                      "-- Select Year --"}
                                 </option>
                                 {availableYears.map((year) => (
                                     <option key={year} value={year}>{year}</option>
                                 ))}
                             </select>
                         </div>

                        {/* Submit Button */}
                        <div className="col-span-1">
                            <button
                                type="submit"
                                className="w-full flex justify-center items-center px-4 py-2 bg-serenova-600 text-white rounded-md hover:bg-serenova-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-serenova-500 disabled:opacity-50"
                                disabled={isLoading || !selectedState || !selectedDistrict || !selectedYear}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin w-5 h-5 mr-2" /> Loading...
                                    </>
                                ) : (
                                    "Get Crime Data"
                                )}
                            </button>
                        </div>
                    </div>
                     {/* Error & Loading Displays */}
                     {error && !isLoading && !isFetchingYears && (
                         <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md flex items-center">
                             <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                             <span>{error}</span>
                         </div>
                     )}
                     {(isFetchingLocations || isFetchingYears) && (
                          <div className="mt-4 flex items-center text-gray-500 text-sm">
                              <Loader2 className="animate-spin w-4 h-4 mr-2" />
                              {isFetchingLocations ? "Fetching locations..." : "Fetching available years..."}
                          </div>
                      )}
                </form>

                 {/* Display Area */}
                 <div className="mt-8">
                    {/* ... (Keep the existing display logic: isLoading, crimeData, placeholders) ... */}
                     {isLoading && (
                         <div className="flex justify-center items-center p-10 text-serenova-600">
                             <Loader2 className="animate-spin w-8 h-8 mr-3" />
                             <span className="text-lg">Loading Crime Data...</span>
                         </div>
                     )}

                    {!isLoading && crimeData && (
                        <CrimeDisplay data={crimeData} />
                    )}

                     {/* Initial placeholder */}
                     {!isLoading && !crimeData && !error && (
                         <div className="text-center text-gray-500 py-10 border-2 border-dashed border-gray-300 rounded-lg">
                             <Map className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                             <p className="text-lg font-medium">Select a location and year to view crime data.</p>
                         </div>
                     )}
                      {/* Error placeholder */}
                      {!isLoading && !crimeData && error && (
                         <div className="text-center text-red-600 py-10 border-2 border-dashed border-red-300 rounded-lg bg-red-50">
                             <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-red-500" />
                             <p className="text-lg font-medium">Could not load data.</p>
                             <p className="text-sm">{error}</p>
                         </div>
                     )}
                </div>
            </div>
        </Layout> // <-- Close Layout wrapper
    );
};

export default CrimeDataPage;