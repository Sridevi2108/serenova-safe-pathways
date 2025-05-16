import React from 'react';
import {
    Users, Home, ShieldAlert, Handshake, AlertTriangle, Car, Blocks, Banknote, HeartCrack, Skull, PersonStanding, EyeOff, EarOff, TrendingUp, MapPin // Added TrendingUp, MapPin
} from 'lucide-react';

// Define the expected structure of the crime data object coming from the API
// **IMPORTANT**: This structure MUST match what your backend API sends.
export interface CrimeData {
    state: string;
    district: string;
    year: number;
    total_ipc_crimes: number | null;
    // Violent Crimes
    murder: number | null;
    attempt_to_murder: number | null;
    culpable_homicide: number | null;
    rape: number | null;
    kidnapping_abduction: number | null;
    riots: number | null;
    // Property Crimes
    dacoity: number | null;
    robbery: number | null;
    burglary: number | null;
    theft: number | null;
    auto_theft?: number | null;
    other_theft?: number | null;
    // Crimes Against Women (Specific)
    dowry_deaths: number | null;
    assault_on_women: number | null;
    sexual_harassment?: number | null;
    stalking?: number | null;
    cruelty_by_husband: number | null;
    // Other Key Crimes (Optional)
    cheating: number | null;
    hurt_grievous_hurt: number | null;
    // Fields retrieved from CSV / Backend
    latitude?: number | null;
    longitude?: number | null;
    crime_rate?: number | null;       // Field for Crime Rate
    safety?: string | null;           // Field for Safety Level ('unsafe', 'moderate', 'safe', etc.)
    distance_metric?: number | null;  // Field for Distance Metric (e.g., distance_t from CSV)
}

interface CrimeDisplayProps {
    data: CrimeData;
}

// Helper to format numbers or show N/A
const formatNumber = (num: number | null | undefined): string => {
    if (num === null || typeof num === 'undefined') return 'N/A';
    // Handle potential floating point inaccuracies if needed before formatting
    return num.toLocaleString('en-IN'); // Format with commas for India
};

// Helper component for individual crime stats
const CrimeStat = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
        <div className="flex items-center text-sm text-gray-600">
            {icon}
            <span className="ml-2">{label}</span>
        </div>
        <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
);


const CrimeDisplay: React.FC<CrimeDisplayProps> = ({ data }) => {

    if (!data) {
        return <p className="text-center text-gray-500">No data to display.</p>;
    }

    // Normalize safety string for comparison
    const safetyLevel = data.safety?.toLowerCase() || 'unknown';

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header Info */}
            <div className="p-4 bg-serenova-50 rounded-lg border border-serenova-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 {/* Left Side: Location & Year */}
                 <div>
                     <h2 className="text-2xl font-bold text-serenova-700">{data.district}, {data.state}</h2>
                     <p className="text-lg text-serenova-600">Crime Statistics for {data.year}</p>
                 </div>
                 {/* Right Side: Key Metrics */}
                 <div className="mt-2 md:mt-0 text-left md:text-right">
                      {/* Total Crimes */}
                      <div className='mb-2'>
                         <p className="text-xl font-bold text-red-600">{formatNumber(data.total_ipc_crimes)}</p>
                         <p className="text-sm text-gray-600">Total IPC Crimes Reported</p>
                      </div>

                      {/* Safety Level Badge */}
                      {data.safety && (
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 mb-1 ${
                              safetyLevel === 'unsafe' ? 'bg-red-100 text-red-700 border border-red-200' :
                              safetyLevel === 'moderate' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                              'bg-green-100 text-green-700 border border-green-200' // Default/safe/unknown
                          }`}>
                              <ShieldAlert className="w-3 h-3 inline-block mr-1" /> Safety: {data.safety}
                          </span>
                       )}

                      {/* Crime Rate */}
                      {(data.crime_rate !== null && typeof data.crime_rate !== 'undefined') && (
                           <span className="inline-flex items-center text-xs text-gray-600 mr-2 mb-1">
                              <TrendingUp className="w-3 h-3 inline-block mr-1 text-gray-500" /> Crime Rate: {data.crime_rate.toFixed(2)}
                           </span>
                       )}

                      {/* Distance Metric */}
                      {(data.distance_metric !== null && typeof data.distance_metric !== 'undefined') && (
                           <span className="inline-flex items-center text-xs text-gray-600 mb-1">
                               <MapPin className="w-3 h-3 inline-block mr-1 text-gray-500" /> Distance Metric: {formatNumber(data.distance_metric)}
                           </span>
                       )}
                 </div>
            </div>

            {/* Crime Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Violent Crimes Card */}
                <div className="bg-white p-5 rounded-lg shadow border border-red-100">
                    <h3 className="text-lg font-semibold text-red-700 mb-3 flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2" /> Violent Crimes
                    </h3>
                    <div className="space-y-1">
                         <CrimeStat icon={<Skull className="w-4 h-4 text-red-500"/>} label="Murder" value={formatNumber(data.murder)} />
                         <CrimeStat icon={<ShieldAlert className="w-4 h-4 text-red-500"/>} label="Attempt to Murder" value={formatNumber(data.attempt_to_murder)} />
                         <CrimeStat icon={<AlertTriangle className="w-4 h-4 text-orange-500"/>} label="Culpable Homicide" value={formatNumber(data.culpable_homicide)} />
                         <CrimeStat icon={<PersonStanding className="w-4 h-4 text-purple-500"/>} label="Rape" value={formatNumber(data.rape)} />
                         <CrimeStat icon={<Blocks className="w-4 h-4 text-blue-500"/>} label="Kidnapping & Abduction" value={formatNumber(data.kidnapping_abduction)} />
                         <CrimeStat icon={<Users className="w-4 h-4 text-yellow-600"/>} label="Riots" value={formatNumber(data.riots)} />
                         <CrimeStat icon={<HeartCrack className="w-4 h-4 text-pink-500"/>} label="Hurt / Grievous Hurt" value={formatNumber(data.hurt_grievous_hurt)} />
                    </div>
                </div>

                {/* Property Crimes Card */}
                <div className="bg-white p-5 rounded-lg shadow border border-yellow-100">
                    <h3 className="text-lg font-semibold text-yellow-700 mb-3 flex items-center">
                        <Home className="w-5 h-5 mr-2" /> Property Crimes
                    </h3>
                     <div className="space-y-1">
                        <CrimeStat icon={<Blocks className="w-4 h-4 text-yellow-600"/>} label="Dacoity" value={formatNumber(data.dacoity)} />
                        <CrimeStat icon={<Banknote className="w-4 h-4 text-yellow-600"/>} label="Robbery" value={formatNumber(data.robbery)} />
                        <CrimeStat icon={<Home className="w-4 h-4 text-yellow-600"/>} label="Burglary" value={formatNumber(data.burglary)} />
                        <CrimeStat icon={<Car className="w-4 h-4 text-yellow-600"/>} label="Auto Theft" value={formatNumber(data.auto_theft)} />
                        <CrimeStat icon={<Handshake className="w-4 h-4 text-yellow-600"/>} label="Other Theft" value={formatNumber(data.other_theft)} />
                        <CrimeStat icon={<Handshake className="w-4 h-4 text-green-600"/>} label="Cheating" value={formatNumber(data.cheating)} />
                    </div>
                </div>

                 {/* Crimes Against Women Card */}
                 <div className="bg-white p-5 rounded-lg shadow border border-pink-100">
                    <h3 className="text-lg font-semibold text-pink-700 mb-3 flex items-center">
                         <PersonStanding className="w-5 h-5 mr-2" /> Crimes Against Women
                     </h3>
                     <div className="space-y-1">
                         <CrimeStat icon={<HeartCrack className="w-4 h-4 text-pink-500"/>} label="Dowry Deaths" value={formatNumber(data.dowry_deaths)} />
                         <CrimeStat icon={<PersonStanding className="w-4 h-4 text-pink-500"/>} label="Assault to Outrage Modesty" value={formatNumber(data.assault_on_women)} />
                         <CrimeStat icon={<EarOff className="w-4 h-4 text-pink-500"/>} label="Sexual Harassment" value={formatNumber(data.sexual_harassment)} />
                         <CrimeStat icon={<EyeOff className="w-4 h-4 text-pink-500"/>} label="Stalking" value={formatNumber(data.stalking)} />
                         <CrimeStat icon={<Home className="w-4 h-4 text-pink-500"/>} label="Cruelty by Husband/Relatives" value={formatNumber(data.cruelty_by_husband)} />
                     </div>
                </div>

            </div>

            {/* Optional: Disclaimer */}
             <p className="text-xs text-center text-gray-500 mt-8">
                 Disclaimer: Data shown is based on reported cases from assumed sources (e.g., NCRB) for the selected year and location. Actual crime levels may differ. This information is for awareness purposes only.
             </p>
        </div>
    );
};

export default CrimeDisplay;