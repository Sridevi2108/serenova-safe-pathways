
import { useState } from 'react';
import Layout from '../components/Layout';
import FloatingLabelInput from '../components/FloatingLabelInput';
import FloatingLabelTextarea from '../components/FloatingLabelTextarea';
import StarRating from '../components/StarRating';
import { useToast } from '@/hooks/use-toast';

const RateRoutePage = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    routeName: '',
    rating: 0,
    comments: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleRatingChange = (rating: number) => {
    setFormData({
      ...formData,
      rating,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.routeName || formData.rating === 0) {
      toast({
        title: "Missing information",
        description: "Please provide a route name and star rating.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Rating submitted",
      description: "Thank you for rating this route for the community.",
    });
    
    // Reset form after submission
    setFormData({
      routeName: '',
      rating: 0,
      comments: '',
    });
  };

  return (
    <Layout showNavbar={true}>
      <div className="serenova-container py-8">
        <h1 className="page-header">Rate a Route</h1>
        
        <div className="card">
          <form onSubmit={handleSubmit}>
            <FloatingLabelInput
              id="routeName"
              name="routeName"
              type="text"
              label="Route Name or Area"
              value={formData.routeName}
              onChange={handleChange}
            />
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Safety Rating
              </label>
              <StarRating value={formData.rating} onChange={handleRatingChange} />
              {formData.rating > 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  {formData.rating === 5 ? 'Very Safe' :
                   formData.rating === 4 ? 'Safe' :
                   formData.rating === 3 ? 'Moderate' :
                   formData.rating === 2 ? 'Somewhat Unsafe' :
                                          'Unsafe'}
                </p>
              )}
            </div>
            
            <FloatingLabelTextarea
              id="comments"
              name="comments"
              label="Comments (Optional)"
              value={formData.comments}
              onChange={handleChange}
            />
            
            <button type="submit" className="btn-primary w-full">
              Submit Rating
            </button>
          </form>
        </div>
        
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 text-serenova-700">Recently Rated Routes</h3>
          
          <div className="space-y-4">
            {[
              { name: 'Downtown Main St to Central Park', rating: 4, comments: 'Well-lit and usually busy with people. Felt safe even at night.', user: 'Marie L.' },
              { name: 'Westside Shopping Center Area', rating: 2, comments: 'Poor lighting in the parking area. Would avoid at night.', user: 'Jessica T.' },
              { name: 'University Campus Walkway', rating: 5, comments: 'Security guards present, emergency phones available, excellent lighting.', user: 'Amanda K.' },
            ].map((route, index) => (
              <div key={index} className="card">
                <h4 className="font-medium text-serenova-700">{route.name}</h4>
                <div className="flex items-center mt-1">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`h-4 w-4 ${i < route.rating ? 'text-serenova-500' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                      />
                    </svg>
                  ))}
                  <span className="ml-2 text-sm text-gray-500">by {route.user}</span>
                </div>
                <p className="text-gray-600 text-sm mt-2">{route.comments}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RateRoutePage;
