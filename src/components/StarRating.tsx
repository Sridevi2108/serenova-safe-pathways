
import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
}

const StarRating = ({ value, onChange }: StarRatingProps) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(null)}
          className="focus:outline-none"
        >
          <Star 
            size={24}
            className={`
              ${(hoverValue !== null ? star <= hoverValue : star <= value)
                ? 'fill-serenova-500 text-serenova-500'
                : 'text-gray-300'}
              transition-colors
            `}
          />
        </button>
      ))}
    </div>
  );
};

export default StarRating;
