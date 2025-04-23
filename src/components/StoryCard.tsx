
interface StoryProps {
  title: string;
  content: string;
  author: string;
  date: string;
  likes: number;
}

const StoryCard = ({ title, content, author, date, likes }: StoryProps) => {
  return (
    <div className="card mb-4 animate-fade-in">
      <h3 className="text-lg font-semibold text-serenova-700 mb-2">{title}</h3>
      <p className="text-gray-600 mb-3 line-clamp-3">{content}</p>
      <div className="flex justify-between items-center text-sm text-gray-500">
        <div>
          <span>{author} • {date}</span>
        </div>
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-serenova-500 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
              clipRule="evenodd"
            />
          </svg>
          <span>{likes}</span>
        </div>
      </div>
    </div>
  );
};

export default StoryCard;
