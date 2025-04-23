
import { useState } from 'react';
import Layout from '../components/Layout';
import FloatingLabelInput from '../components/FloatingLabelInput';
import SafetyMap from '../components/SafetyMap';
import { useToast } from '@/hooks/use-toast';

const RoutePlannerPage = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    startLocation: '',
    endLocation: '',
  });
  const [routePlanned, setRoutePlanned] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Reset the map when inputs change
    if (routePlanned) {
      setRoutePlanned(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.startLocation || !formData.endLocation) {
      toast({
        title: "Missing information",
        description: "Please provide both start and end locations.",
        variant: "destructive"
      });
      return;
    }
    
    setRoutePlanned(true);
    toast({
      title: "Route calculated!",
      description: "We've found the safest path for your journey.",
    });
  };

  return (
    <Layout showNavbar={true}>
      <div className="serenova-container py-8">
        <h1 className="page-header">Find the Safest Route</h1>
        
        <div className="card mb-6">
          <form onSubmit={handleSubmit}>
            <FloatingLabelInput
              id="startLocation"
              name="startLocation"
              type="text"
              label="Start Location"
              value={formData.startLocation}
              onChange={handleChange}
            />
            
            <FloatingLabelInput
              id="endLocation"
              name="endLocation"
              type="text"
              label="End Location"
              value={formData.endLocation}
              onChange={handleChange}
            />
            
            <button type="submit" className="btn-primary w-full mt-2">
              Plan Route
            </button>
          </form>
        </div>
        
        <SafetyMap 
          startLocation={routePlanned ? formData.startLocation : undefined} 
          endLocation={routePlanned ? formData.endLocation : undefined} 
        />
        
        {routePlanned && (
          <div className="mt-6 bg-serenova-50 rounded-lg p-4 border border-serenova-100">
            <h3 className="text-lg font-semibold mb-2 text-serenova-700">Route Information</h3>
            <div className="space-y-2 text-gray-600">
              <p><span className="font-medium">Distance:</span> 2.3 miles</p>
              <p><span className="font-medium">Estimated Time:</span> 42 minutes walking</p>
              <p><span className="font-medium">Safety Rating:</span> <span className="text-green-600 font-medium">Safe</span></p>
              <p><span className="font-medium">Reported Incidents:</span> None in the past month</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RoutePlannerPage;
