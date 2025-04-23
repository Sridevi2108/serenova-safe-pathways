
import { useEffect } from 'react';

interface SafetyMapProps {
  startLocation?: string;
  endLocation?: string;
}

const SafetyMap = ({ startLocation, endLocation }: SafetyMapProps) => {
  useEffect(() => {
    console.log(`Planning route from ${startLocation} to ${endLocation}`);
  }, [startLocation, endLocation]);

  return (
    <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden bg-gray-100 border border-serenova-200">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-gray-500 mb-2">Map Placeholder</p>
          {startLocation && endLocation && (
            <p className="text-sm text-serenova-600">
              Route from {startLocation} to {endLocation}
            </p>
          )}
        </div>
      </div>
      
      {/* Safety Legend */}
      <div className="absolute bottom-3 right-3 bg-white p-2 rounded-md shadow-md border border-serenova-100">
        <div className="text-xs font-medium mb-1">Safety Level:</div>
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
            <span className="text-xs">Safe</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
            <span className="text-xs">Moderate</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
            <span className="text-xs">Risky</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyMap;
