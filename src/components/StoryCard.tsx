// src/components/StoryCard.tsx
import React from 'react';
import { Heart, Edit, Trash2, UserCircle } from 'lucide-react'; // Import icons
import { BlogPost } from '../pages/SurvivorBlogPage'; // Adjust import path if needed

interface StoryCardProps {
    post: BlogPost;
    loggedInUserId: number | null; // ID of the currently logged-in user
    onLikePost: (postId: number) => void; // Function to handle like
    onEditPost: (post: BlogPost) => void; // Function to handle edit
    onDeletePost: (postId: number) => void; // Function to handle delete
}

// Helper to format date (optional)
const formatDate = (dateString: string) => {
    try {
        // Example: Format as "April 29, 2025" - requires browser support or a library like date-fns
        return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date(dateString));
    } catch (e) {
        return dateString; // Fallback to original string if formatting fails
    }
};


const StoryCard: React.FC<StoryCardProps> = ({
    post,
    loggedInUserId,
    onLikePost,
    onEditPost,
    onDeletePost
}) => {
    const isAuthor = loggedInUserId === post.user_id; // Check if logged-in user is the author

    return (
        <div className="card bg-white p-5 rounded-lg shadow border border-gray-100">
            <h3 className="text-xl font-semibold text-serenova-700 mb-2">{post.title}</h3>
            <div className="flex items-center text-xs text-gray-500 mb-3 space-x-2">
                 <UserCircle size={14} />
                 <span>By: {post.author_name}</span>
                 <span>&bull;</span>
                 <span>{formatDate(post.created_at)}</span> {/* Use formatted date */}
            </div>
            <p className="text-gray-700 text-sm leading-relaxed mb-4 whitespace-pre-wrap"> 
       {post.content}
   </p>
            <div className="flex justify-between items-center border-t pt-3">
                {/* Like Button */}
                <button
                    onClick={() => onLikePost(post.id)}
                    className="flex items-center space-x-1 text-gray-500 hover:text-red-500 transition-colors text-sm group"
                    aria-label={`Like post titled ${post.title}`}
                >
                     {/* You might want state here to show if *this* user liked it */}
                    <Heart size={16} className="group-hover:fill-red-500 group-hover:stroke-red-500 transition-colors" />
                    <span>{post.likes}</span>
                </button>

                 {/* Edit/Delete Buttons (Show only if author matches logged-in user) */}
                 {isAuthor && (
                     <div className="flex items-center space-x-3">
                         <button
                             onClick={() => onEditPost(post)}
                             className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800"
                             aria-label={`Edit post titled ${post.title}`}
                         >
                              <Edit size={14} />
                              <span>Edit</span>
                         </button>
                         <button
                             onClick={() => onDeletePost(post.id)}
                             className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-800"
                             aria-label={`Delete post titled ${post.title}`}
                         >
                              <Trash2 size={14} />
                              <span>Delete</span>
                         </button>
                     </div>
                 )}
            </div>
        </div>
    );
};

export default StoryCard;