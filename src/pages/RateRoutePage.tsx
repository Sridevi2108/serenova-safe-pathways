import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import FloatingLabelInput from '../components/FloatingLabelInput';
import FloatingLabelTextarea from '../components/FloatingLabelTextarea';
import StarRating from '../components/StarRating';
import { useToast } from '@/hooks/use-toast';
// Assuming you have a way to get the logged-in user's info, e.g., from context or props
// import { useAuth } from '@/context/AuthContext'; // Example auth context

// --- MODIFIED Interface ---
interface FeedbackItem {
  id: number;
  route_name: string;
  rating: number;
  comments: string | null;
  created_at: string;
  user_name: string; // <<< ADDED user_name field
}
// --- END MODIFICATION ---

const RateRoutePage = () => {
  const { toast } = useToast();
  // Example: Get user info from context/state management
  // const { user } = useAuth(); // Replace with your actual auth state logic
  // --- Placeholder for logged-in user ID (REPLACE THIS) ---
  const loggedInUserId = localStorage.getItem('userId'); // Example: getting from local storage (ensure it's set after login)
  // --- End Placeholder ---


  const [formData, setFormData] = useState({
    routeName: '',
    rating: 0,
    comments: '',
  });
  const [recentFeedback, setRecentFeedback] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => { /* ... (no change needed) ... */
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleRatingChange = (rating: number) => { /* ... (no change needed) ... */
     setFormData({
      ...formData,
      rating,
    });
  };

  // Fetch function (no change needed in fetch itself, assuming GET /api/feedback now returns user_name)
  const fetchFeedback = async () => {
      setIsLoading(true);
      try {
          const response = await fetch('http://localhost:5000/api/feedback');
          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || 'Failed to fetch feedback');
          }
          const data: FeedbackItem[] = await response.json();
          setRecentFeedback(data);
      } catch (error: any) {
          console.error("Error fetching feedback:", error);
          toast({ title: "Error", description: error.message || "Could not load recent feedback.", variant: "destructive" });
          setRecentFeedback([]);
      } finally {
          setIsLoading(false);
      }
  };

  // useEffect (no change needed)
  useEffect(() => {
    fetchFeedback();
  }, []);

  // Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

     // --- Check if user is logged in (using the placeholder) ---
     if (!loggedInUserId) {
         toast({ title: "Error", description: "You must be logged in to submit feedback.", variant: "destructive" });
         // Optional: Redirect to login page
         return;
     }
     // --- End Check ---


    if (!formData.routeName || formData.rating === 0) { /* ... (validation) ... */
        toast({
            title: "Missing information",
            description: "Please provide a route name and star rating.",
            variant: "destructive"
        });
        return;
    }

    try {
        // --- MODIFIED fetch body to include userId ---
        const bodyData = {
            ...formData,
            userId: loggedInUserId // <<< ADDED userId (from placeholder)
        };
        // --- END MODIFICATION ---

      const response = await fetch('http://localhost:5000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
           // If using JWT, add Authorization header:
           // 'Authorization': `Bearer ${your_jwt_token}`
        },
        body: JSON.stringify(bodyData), // Send the data including userId
      });

      if (!response.ok) { /* ... (error handling) ... */
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.error || 'Failed to save feedback');
      }

       /* ... (success toast, form reset) ... */
       toast({
        title: "Rating submitted",
        description: "Thank you for rating this route for the community.",
       });
        setFormData({
            routeName: '',
            rating: 0,
            comments: '',
        });
      fetchFeedback(); // Re-fetch

    } catch (error: any) { /* ... (error toast) ... */
        console.error("Submit Error:", error);
        toast({
            title: "Submission failed",
            description: error.message || "Could not save your feedback. Try again later.",
            variant: "destructive"
        });
    }
  };

  return (
    <Layout showNavbar={true}>
      <div className="serenova-container py-8">
        {/* ... (Form section remains the same) ... */}
         <h1 className="page-header">Rate a Route</h1>

        {/* Form Card */}
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


        {/* Recently Rated Routes Section */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 text-serenova-700">Recently Rated Routes</h3>
          <div className="space-y-4">
            {isLoading ? (
                <p className="text-gray-500">Loading feedback...</p>
            ) : recentFeedback.length > 0 ? (
              recentFeedback.map((feedback) => (
                <div key={feedback.id} className="card">
                  <h4 className="font-medium text-serenova-700">{feedback.route_name}</h4>
                  <div className="flex items-center mt-1">
                    {/* Stars rendering */}
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className={`h-4 w-4 ${i < feedback.rating ? 'text-serenova-500' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    {/* --- MODIFIED to show user name --- */}
                    <span className="ml-2 text-sm text-gray-500">by {feedback.user_name}</span>
                    {/* --- END MODIFICATION --- */}
                     <span className="ml-2 text-sm text-gray-400">({new Date(feedback.created_at).toLocaleDateString()})</span> {/* Added date */}
                  </div>
                  {feedback.comments && (
                    <p className="text-gray-600 text-sm mt-2">{feedback.comments}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500">No recent feedback has been submitted yet.</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RateRoutePage;