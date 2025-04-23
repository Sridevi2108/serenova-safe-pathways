
import { useState } from 'react';
import Layout from '../components/Layout';
import FloatingLabelInput from '../components/FloatingLabelInput';
import FloatingLabelTextarea from '../components/FloatingLabelTextarea';
import { useToast } from '@/hooks/use-toast';

const ReportIncidentPage = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    location: '',
    type: '',
    description: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.location || !formData.type || !formData.description) {
      toast({
        title: "Missing information",
        description: "Please complete all required fields.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Report submitted",
      description: "Thank you for contributing to community safety.",
    });
    
    // Reset form after submission
    setFormData({
      location: '',
      type: '',
      description: '',
    });
  };

  const incidentTypes = [
    { value: "", label: "Select an incident type" },
    { value: "harassment", label: "Harassment" },
    { value: "theft", label: "Theft" },
    { value: "assault", label: "Assault" },
    { value: "suspicious", label: "Suspicious Activity" },
    { value: "other", label: "Other" },
  ];

  return (
    <Layout showNavbar={true}>
      <div className="serenova-container py-8">
        <h1 className="page-header">Report an Incident Anonymously</h1>
        
        <div className="card">
          <form onSubmit={handleSubmit}>
            <FloatingLabelInput
              id="location"
              name="location"
              type="text"
              label="Location (street address or landmark)"
              value={formData.location}
              onChange={handleChange}
            />
            
            <div className="input-field mb-4">
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-serenova-200"
              >
                {incidentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <label htmlFor="type" className={formData.type ? "-top-2 text-xs bg-white text-serenova-600" : ""}>
                Incident Type
              </label>
            </div>
            
            <FloatingLabelTextarea
              id="description"
              name="description"
              label="Description (what happened?)"
              value={formData.description}
              onChange={handleChange}
            />
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload an Image (Optional)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-serenova-200 rounded-md">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md bg-white font-medium text-serenova-600 hover:text-serenova-500"
                    >
                      <span>Upload a file</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded text-serenova-500 focus:ring-serenova-500 h-4 w-4"
                />
                <span className="ml-2 text-sm text-gray-600">
                  I understand that this report will be anonymous and may be used to alert other users.
                </span>
              </label>
            </div>
            
            <button type="submit" className="btn-primary w-full">
              Submit Report
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default ReportIncidentPage;
