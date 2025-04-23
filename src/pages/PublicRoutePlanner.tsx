
import React, { useState } from 'react';
import Layout from '../components/Layout';
import SafetyMap from '../components/SafetyMap';
import { useToast } from "@/hooks/use-toast";
import FloatingLabelInput from '../components/FloatingLabelInput';

const PublicRoutePlanner = () => {
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
    if (routePlanned) setRoutePlanned(false);
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
    <Layout>
      <div className="serenova-container py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-serenova-700">Find the Safest Route</h1>
          <p className="text-gray-600">Plan your journey with safety in mind.</p>
        </div>
        
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
      </div>
    </Layout>
  );
};

export default PublicRoutePlanner;
