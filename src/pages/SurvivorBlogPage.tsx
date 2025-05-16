"use client"; // Directive for Next.js App Router

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, AlertCircle, PlusCircle, Heart, Edit, Trash2 } from 'lucide-react';
import axios from 'axios'; // Using Axios for API calls

// Adjust these import paths based on your project structure
import Layout from '../components/Layout';
import FloatingLabelInput from '../components/FloatingLabelInput';
import FloatingLabelTextarea from '../components/FloatingLabelTextarea';
import StoryCard from '../components/StoryCard';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from "@/pages/config"; // Ensure this path is correct

// --- Interface for Blog Post data ---
// Exporting allows StoryCard to import it
export interface BlogPost {
    id: number;
    user_id: number;
    author_name: string;
    title: string;
    content: string;
    created_at: string; // Assuming backend sends pre-formatted string
    likes: number;
}

const SurvivorBlogPage = () => {
    const { toast } = useToast(); // Hook for showing notifications
    const [filter, setFilter] = useState('latest'); // Filter state: 'latest' or 'popular'
    const [showForm, setShowForm] = useState(false); // Whether the create/edit form is visible

    // State for the create/edit form fields
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        anonymous: true, // Default to posting anonymously
    });

    // State for managing the list of blog posts
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true); // Loading state for fetching posts
    const [isSubmittingPost, setIsSubmittingPost] = useState(false); // Loading state for form submission
    const [error, setError] = useState<string | null>(null); // Error messages (fetch or submit)

    // State to track which post is being edited (null if creating)
    const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

    // State for the currently logged-in user's ID
    const [loggedInUserId, setLoggedInUserId] = useState<number | null>(null);

    // --- Effect to get logged-in user ID from localStorage on component mount ---
    useEffect(() => {
        // !!! WARNING: Using localStorage for userId is insecure for production.
        // Implement proper authentication (e.g., context API with JWT/Sessions).
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
            const parsedUserId = parseInt(storedUserId, 10);
            if (!isNaN(parsedUserId)) {
                setLoggedInUserId(parsedUserId);
                console.log("Blog: Logged in user ID set:", parsedUserId);
            } else {
                console.error("Blog: Invalid stored userId in localStorage:", storedUserId);
                localStorage.removeItem('userId'); // Clear invalid entry
            }
        } else {
            console.log("Blog: No logged in user ID found in localStorage.");
        }
    }, []); // Empty dependency array ensures this runs only once on mount

    // --- Function to Fetch Posts ---
    const fetchPosts = useCallback(async () => {
        console.log("Attempting to fetch blog posts from:", `${API_BASE_URL}/api/blog/posts`);
        setIsLoadingPosts(true);
        setError(null); // Clear previous errors
        try {
            // Use Axios to make a GET request
            const response = await axios.get<BlogPost[]>(`${API_BASE_URL}/api/blog/posts`);
            setPosts(response.data); // Update state with fetched posts
            console.log("Successfully fetched posts:", response.data.length);
        } catch (err: any) {
            console.error("Failed to fetch posts:", err);
            // Extract a user-friendly error message
            const errorMsg = err.response?.data?.error || err.message || "Could not load stories.";
            setError(errorMsg);
            toast({ title: "Loading Failed", description: errorMsg, variant: "destructive" });
        } finally {
            setIsLoadingPosts(false); // Ensure loading state is turned off
        }
    }, []); // No dependencies, relies on API_BASE_URL being stable

    // --- Effect to fetch posts when the component mounts ---
    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]); // fetchPosts is stable due to useCallback

    // --- Handle Form Input Changes (Title, Content, Anonymous Checkbox) ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const target = e.target;
        const name = target.name;
        let value: string | boolean;

        // Handle checkbox differently
        if (target instanceof HTMLInputElement && target.type === 'checkbox') {
            value = target.checked;
        } else {
            value = target.value;
        }

        // Update form data state
        setFormData(prev => ({ ...prev, [name]: value }));

        // Clear previous submission errors when user types
        if (error) setError(null);
    };

    // --- Handle Liking a Post ---
    const handleLikePost = useCallback(async (postId: number) => {
        console.log(`Attempting to like post ${postId}`);
        // Optimistic UI Update: Increase like count immediately
        setPosts(currentPosts => currentPosts.map(p =>
            p.id === postId ? { ...p, likes: p.likes + 1 } : p
        ));

        try {
            // Send POST request to the like endpoint
            const response = await axios.post(`${API_BASE_URL}/api/blog/posts/${postId}/like`);
            const updatedLikes = response.data.newLikes; // Get the confirmed like count from backend

            // Update UI with confirmed count from backend
            setPosts(currentPosts => currentPosts.map(p =>
                p.id === postId ? { ...p, likes: updatedLikes } : p
            ));
        } catch (error: any) {
            console.error(`Failed to like post ${postId}:`, error);
            // Revert Optimistic Update on error
            setPosts(currentPosts => currentPosts.map(p =>
                p.id === postId ? { ...p, likes: p.likes - 1 } : p // Decrease count back
            ));
            // Show error toast
            toast({
                title: "Like Failed",
                description: error.response?.data?.description || error.response?.data?.error || "Could not like post.",
                variant: "destructive"
            });
        }
    }, [API_BASE_URL, toast]); // Dependency on API_BASE_URL and toast

    // --- Handle Setting Up the Form for Editing ---
    const handleEditPost = useCallback((postToEdit: BlogPost) => {
        // Authorization check (client-side)
        if (loggedInUserId !== postToEdit.user_id) {
            toast({ title: "Not Allowed", description: "You can only edit your own posts.", variant: "destructive"});
            return;
        }
        console.log("Setting up edit for post:", postToEdit);
        setEditingPost(postToEdit); // Mark which post is being edited
        // Pre-fill form data
        setFormData({
            title: postToEdit.title,
            content: postToEdit.content,
            // 'anonymous' checkbox state isn't directly stored, infer it
            // Note: Backend doesn't allow changing anonymity on edit
            anonymous: postToEdit.author_name === 'Anonymous'
        });
        setError(null); // Clear previous errors
        setShowForm(true); // Show the form
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top
    }, [loggedInUserId, toast]); // Dependency on loggedInUserId and toast

    // --- Handle Deleting a Post ---
    const handleDeletePost = useCallback(async (postId: number) => {
        // Check login status
        if (!loggedInUserId) {
            toast({ title: "Not Allowed", description: "Login required to delete posts.", variant: "destructive"});
            return;
        }

        // Confirmation dialog
        if (window.confirm('Are you sure you want to delete this story permanently? This cannot be undone.')) {
            console.log(`Attempting to delete post ${postId}`);
            setIsSubmittingPost(true); // Use submitting state for visual feedback if needed
            try {
                // Send DELETE request with userId in the body (for backend placeholder auth)
                // !!! WARNING: Insecure. Backend should use verified token/session ID. !!!
                await axios.delete(`${API_BASE_URL}/api/blog/posts/${postId}`, {
                    data: { userId: loggedInUserId } // Axios requires 'data' for DELETE body
                });
                toast({ title: "Post Deleted", description: "Your story has been removed." });
                // Update UI by removing the post from the list
                setPosts(currentPosts => currentPosts.filter(p => p.id !== postId));
            } catch (error: any) {
                console.error(`Failed to delete post ${postId}:`, error);
                toast({
                    title: "Delete Failed",
                    description: error.response?.data?.description || error.response?.data?.error || "Could not delete post.",
                    variant: "destructive"
                });
            } finally {
                setIsSubmittingPost(false);
            }
        }
    }, [loggedInUserId, API_BASE_URL, toast]); // Dependencies

    // --- Handle Form Submission (Handles BOTH Create and Update) ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent default HTML form submission
        setError(null); // Clear previous submission errors

        // Basic validation
        if (!formData.title.trim() || !formData.content.trim()) {
            toast({ title: "Missing information", description: "Please provide both title and content.", variant: "destructive" });
            return;
        }
        // Check login status
        if (!loggedInUserId) {
            toast({ title: "Not Logged In", description: "You must be logged in to post or update stories.", variant: "destructive" });
            return;
        }

        setIsSubmittingPost(true); // Show loading indicator on button

        const isUpdating = editingPost !== null; // Check if we are updating an existing post
        const url = isUpdating ? `${API_BASE_URL}/api/blog/posts/${editingPost.id}` : `${API_BASE_URL}/api/blog/posts`;
        const method = isUpdating ? 'PUT' : 'POST';

        // Prepare payload - include 'anonymous' only when creating
        const payload: any = {
            title: formData.title.trim(),
            content: formData.content.trim(),
            userId: loggedInUserId // Send userId for placeholder auth
        };
        if (!isUpdating) {
            payload.anonymous = formData.anonymous;
        }

        console.log(`Submitting post (${method}) to ${url} with payload:`, payload);

        try {
            // Send request using Axios
            const response = await axios({ method, url, data: payload });

            toast({
                title: isUpdating ? "Story Updated" : "Story Posted",
                description: response.data.message || "Your story has been saved.",
            });

            // Reset form, hide it, and clear editing state
            setFormData({ title: '', content: '', anonymous: true });
            setShowForm(false);
            setEditingPost(null);

            fetchPosts(); // Refresh the list of posts to show the new/updated one

        } catch (error: any) {
            console.error(`Failed to ${isUpdating ? 'update' : 'submit'} post:`, error);
            const errorMsg = error.response?.data?.description || error.response?.data?.error || error.message || `Could not ${isUpdating ? 'update' : 'post'} story.`;
            setError(errorMsg); // Display error near the form
            toast({ title: `Submission Failed`, description: errorMsg, variant: "destructive" });
        } finally {
            setIsSubmittingPost(false); // Hide loading indicator
        }
    };

    // --- Handle Canceling Edit/Create ---
    const handleCancel = () => {
        setShowForm(false); // Hide form
        setEditingPost(null); // Clear editing state
        setFormData({ title: '', content: '', anonymous: true }); // Reset form fields
        setError(null); // Clear any errors
    };

    // --- Sorting Logic for Display ---
    // Use slice() or spread operator [...] to create a copy before sorting
    const sortedPosts = [...posts].sort((a, b) => {
        if (filter === 'latest') {
            // Sort by date, newest first
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        } else if (filter === 'popular') {
            // Sort by likes, most popular first
            return b.likes - a.likes;
        }
        return 0; // Should not happen with current filters
    });

    // --- Render JSX ---
    return (
        <Layout showNavbar={true}>
            <div className="serenova-container py-8"> {/* Ensure serenova-container provides adequate padding/max-width */}
                <h1 className="page-header text-3xl font-bold text-center mb-8 text-serenova-700">Survivor Stories</h1>

                {/* Controls Area: Filter and Share/Cancel Buttons */}
                <div className="flex flex-col md:flex-row md:justify-between items-center mb-6 gap-4 px-2">
                    {/* Filter Buttons */}
                    <div className="inline-flex rounded-md shadow-sm" role="group">
                        <button
                            type="button"
                            onClick={() => setFilter('latest')}
                            className={`px-4 py-2 text-sm font-medium rounded-l-lg transition-colors duration-150 ${
                                filter === 'latest'
                                ? 'bg-serenova-600 text-white ring-1 ring-serenova-600 z-10'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                            }`}
                        >
                             Latest
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilter('popular')}
                            className={`px-4 py-2 text-sm font-medium rounded-r-lg transition-colors duration-150 ${
                                filter === 'popular'
                                ? 'bg-serenova-600 text-white ring-1 ring-serenova-600 z-10'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-l-0 border-gray-200'
                            }`}
                        >
                             Popular
                        </button>
                    </div>
                    {/* Share / Cancel Buttons */}
                    <div className="flex gap-2">
                        {/* Cancel button (only visible when form is shown) */}
                        <button
                            onClick={handleCancel}
                            className={`btn btn-secondary px-5 py-2 ${!showForm ? 'hidden' : ''}`}
                        >
                            Cancel
                        </button>
                        {/* Share button (hidden when form is shown) */}
                        <button
                            onClick={() => { handleCancel(); setShowForm(true); }} // Ensure form is reset before showing
                            className={`btn btn-primary px-5 py-2 flex items-center gap-2 ${showForm ? 'hidden' : ''}`}
                            disabled={!loggedInUserId} // Disable if not logged in
                            title={!loggedInUserId ? "Log in to share your story" : "Share your story"}
                        >
                            <PlusCircle size={18}/> Share Your Story
                        </button>
                    </div>
                </div>

                {/* Form Section (Conditionally Rendered) */}
                {showForm && (
                    <div className="card mb-8 animate-fade-in p-6 border rounded-lg shadow-md bg-white mx-2">
                        <h2 className="text-xl font-semibold mb-4 text-serenova-700">
                            {editingPost ? 'Edit Your Story' : 'Share Your Experience'}
                        </h2>
                        {/* Display Submission Errors Here */}
                        {error && (
                            <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200 flex items-center gap-2">
                                <AlertCircle size={16}/> {error}
                            </div>
                        )}
                        {/* Form for Creating/Editing */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <FloatingLabelInput
                                id="title"
                                name="title"
                                type="text"
                                label="Story Title"
                                value={formData.title}
                                onChange={handleChange}
                                disabled={isSubmittingPost}
                                required
                            />
                            <FloatingLabelTextarea
                                id="content"
                                name="content"
                                label="Your Story"
                                value={formData.content}
                                onChange={handleChange}
                                disabled={isSubmittingPost}
                                rows={5}
                                required
                            />
                            {/* Anonymous Checkbox (only show when CREATING) */}
                            {!editingPost && (
                                <div className="pt-2">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="anonymous"
                                            checked={formData.anonymous}
                                            onChange={handleChange}
                                            disabled={isSubmittingPost}
                                            className="rounded text-serenova-500 focus:ring-serenova-400 h-4 w-4 border-gray-300"
                                        />
                                        <span className="ml-2 text-sm text-gray-600">
                                            Post anonymously (Your name won't be shown)
                                        </span>
                                    </label>
                                </div>
                            )}
                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="btn-primary w-full flex items-center justify-center"
                                disabled={isSubmittingPost} // Disable while submitting
                            >
                                {isSubmittingPost && <Loader2 className="h-5 w-5 animate-spin mr-2"/>}
                                {isSubmittingPost ? (editingPost ? 'Updating...' : 'Posting...') : (editingPost ? 'Update Story' : 'Post Story')}
                            </button>
                        </form>
                    </div>
                )}

                {/* Display Posts Section */}
                <div className="px-2"> {/* Add padding if needed */}
                    {/* Loading State */}
                    {isLoadingPosts && (
                        <div className="text-center py-10 text-gray-500">
                            <Loader2 className="h-8 w-8 animate-spin inline-block mb-2"/>
                            <p>Loading stories...</p>
                        </div>
                    )}
                    {/* Error State */}
                    {!isLoadingPosts && error && (
                        <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded-md border border-red-200">
                            <AlertCircle size={20} className="inline-block mr-2"/> Failed to load stories: {error}
                        </div>
                    )}
                    {/* Empty State */}
                    {!isLoadingPosts && !error && posts.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            <p>No stories have been shared yet.</p>
                            <p className="mt-1">Be the first to share your experience!</p>
                        </div>
                    )}
                    {/* Posts List */}
                    {!isLoadingPosts && !error && posts.length > 0 && (
                        <div className="space-y-6">
                            {sortedPosts.map((post) => (
                                <StoryCard
                                    key={post.id} // Use unique post ID as key
                                    post={post}
                                    loggedInUserId={loggedInUserId}
                                    onLikePost={handleLikePost}
                                    onEditPost={handleEditPost}
                                    onDeletePost={handleDeletePost}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default SurvivorBlogPage;
