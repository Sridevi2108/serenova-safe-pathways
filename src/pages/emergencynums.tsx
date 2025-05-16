import React from 'react';
import {
  Phone, Shield, Heart, Ambulance, Truck, Airplay, Activity, Bell, Cloud, Users, AlertCircle, UserCheck, CheckCircle, Copy, PhoneCall
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// --- MODIFIED Props Interface ---
interface EmergencyNumsProps {
  nums: [string, number][];
  onInitiateCall: (number: number) => void; // Function passed from parent to start dummy call
}
// --- End Modification ---

// getIcon function remains the same...
const getIcon = (name: string) => {
  switch (name.toLowerCase()) {
    case 'women helpline': return <Users className="h-6 w-6 text-serenova-500" />;
    case 'senior citizen helpline': return <UserCheck className="h-6 w-6 text-serenova-500" />;
    case 'child abuse helpline': return <Bell className="h-6 w-6 text-serenova-500" />;
    case 'police': return <Shield className="h-6 w-6 text-serenova-500" />;
    case 'fire': return <Activity className="h-6 w-6 text-serenova-500" />;
    case 'ambulance': return <Ambulance className="h-6 w-6 text-serenova-500" />;
    case 'traffic police': return <Truck className="h-6 w-6 text-serenova-500" />;
    case 'health': return <Heart className="h-6 w-6 text-serenova-500" />;
    case 'disaster management': return <Cloud className="h-6 w-6 text-serenova-500" />;
    case 'railway': return <Airplay className="h-6 w-6 text-serenova-500" />;
    case 'domestic abuse': return <AlertCircle className="h-6 w-6 text-serenova-500" />;
    case 'anti-corruption': return <CheckCircle className="h-6 w-6 text-serenova-500" />;
    case 'road accident': return <Truck className="h-6 w-6 text-serenova-500" />;
    case 'anti-terror': return <Shield className="h-6 w-6 text-serenova-500" />;
    default: return <Phone className="h-6 w-6 text-serenova-500" />;
  }
};

// --- MODIFIED Component Definition ---
const EmergencyNums: React.FC<EmergencyNumsProps> = ({ nums, onInitiateCall }) => {
// --- End Modification ---
  const { toast } = useToast();

  const copyToClipboard = (number: number) => {
    navigator.clipboard.writeText(number.toString())
      .then(() => {
        toast({ title: "Copied!", description: `Number ${number} copied to clipboard.` });
      })
      .catch(err => {
        console.error('Failed to copy number: ', err);
        toast({ title: "Copy Failed", description: "Could not copy number.", variant: "destructive" });
      });
  };

  // --- REMOVED handleCall function - no longer needed here ---

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
      {nums.map(([name, number], index) => (
        <div
          key={index}
          className="bg-white p-4 rounded-lg shadow-lg flex justify-between items-center transition-shadow hover:shadow-xl"
        >
          {/* Left side: Icon and Text */}
          <div className="flex items-center overflow-hidden mr-2">
            <div className="mr-3 flex-shrink-0">{getIcon(name)}</div>
            <div className="flex-grow min-w-0">
              <h3 className="text-md sm:text-lg font-semibold text-serenova-700 truncate">{name}</h3>
              <p className="text-gray-600 text-sm sm:text-base">{number}</p>
            </div>
          </div>

          {/* Right side: Buttons */}
          <div className="flex space-x-2 flex-shrink-0">
            {/* Call Button */}
            <button
              // --- MODIFIED onClick ---
              onClick={() => onInitiateCall(number)} // Call the function passed from the parent
              // --- End Modification ---
              className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 transition-colors"
              aria-label={`Call ${name} at ${number}`}
              title={`Call ${number}`}
            >
               <PhoneCall className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Copy Button */}
            <button
              onClick={() => copyToClipboard(number)}
              className="bg-serenova-500 text-white p-2 rounded-full hover:bg-serenova-600 focus:outline-none focus:ring-2 focus:ring-serenova-400 focus:ring-opacity-75 transition-colors"
              aria-label={`Copy number for ${name}`}
              title={`Copy ${number}`}
            >
              <Copy className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EmergencyNums;
