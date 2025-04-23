
import { useState } from 'react';
import Layout from '../components/Layout';
import FloatingLabelInput from '../components/FloatingLabelInput';
import FloatingLabelTextarea from '../components/FloatingLabelTextarea';
import StoryCard from '../components/StoryCard';
import { useToast } from '@/hooks/use-toast';

const SurvivorBlogPage = () => {
  const { toast } = useToast();
  const [filter, setFilter] = useState('latest');
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    anonymous: true,
  });

  const sampleStories = [
    {
      id: 1,
      title: 'How I Found Strength After My Experience',
      content: 'I never thought I would find myself in such a situation, but here I am, months later, sharing my story. It happened on a quiet street near downtown...',
      author: 'Anonymous',
      date: '3 days ago',
      likes: 24,
    },
    {
      id: 2,
      title: 'My Community Rallied Around Me',
      content: 'After the incident, I was afraid to go out alone. But then something amazing happened. My neighbors, friends, and even strangers from this app...',
      author: 'Sarah J.',
      date: '1 week ago',
      likes: 42,
    },
    {
      id: 3,
      title: 'The Power of Speaking Up',
      content: 'For months I kept quiet about what happened. I blamed myself and felt ashamed. But when I finally spoke up, I realized I wasn\'t alone...',
      author: 'Rebecca T.',
      date: '2 weeks ago',
      likes: 38,
    },
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const isCheckbox = type === 'checkbox';
    
    setFormData({
      ...formData,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content) {
      toast({
        title: "Missing information",
        description: "Please provide both a title and content for your story.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Story posted",
      description: "Thank you for sharing your experience with our community.",
    });
    
    // Reset form and hide it
    setFormData({
      title: '',
      content: '',
      anonymous: true,
    });
    setShowForm(false);
  };

  return (
    <Layout showNavbar={true}>
      <div className="serenova-container py-8">
        <h1 className="page-header">Survivor Blog</h1>
        
        <div className="flex flex-col md:flex-row md:justify-between items-center mb-6">
          <div className="mb-3 md:mb-0">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                onClick={() => setFilter('latest')}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                  filter === 'latest'
                    ? 'bg-serenova-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } border border-serenova-200`}
              >
                Latest
              </button>
              <button
                type="button"
                onClick={() => setFilter('popular')}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                  filter === 'popular'
                    ? 'bg-serenova-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } border border-serenova-200 border-l-0`}
              >
                Popular
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? 'Cancel' : 'Share Your Story'}
          </button>
        </div>
        
        {showForm && (
          <div className="card mb-8 animate-fade-in">
            <h2 className="text-lg font-semibold mb-4 text-serenova-700">Share Your Story</h2>
            <form onSubmit={handleSubmit}>
              <FloatingLabelInput
                id="title"
                name="title"
                type="text"
                label="Story Title"
                value={formData.title}
                onChange={handleChange}
              />
              
              <FloatingLabelTextarea
                id="content"
                name="content"
                label="Your Story"
                value={formData.content}
                onChange={handleChange}
              />
              
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="anonymous"
                    checked={formData.anonymous}
                    onChange={handleChange}
                    className="rounded text-serenova-500 focus:ring-serenova-500 h-4 w-4"
                  />
                  <span className="ml-2 text-gray-600">
                    Post anonymously
                  </span>
                </label>
              </div>
              
              <button type="submit" className="btn-primary w-full">
                Post Story
              </button>
            </form>
          </div>
        )}
        
        <div>
          {sampleStories
            .sort((a, b) => 
              filter === 'latest' 
                ? a.id - b.id 
                : b.likes - a.likes
            )
            .map((story) => (
              <StoryCard
                key={story.id}
                title={story.title}
                content={story.content}
                author={story.author}
                date={story.date}
                likes={story.likes}
              />
            ))}
        </div>
      </div>
    </Layout>
  );
};

export default SurvivorBlogPage;
