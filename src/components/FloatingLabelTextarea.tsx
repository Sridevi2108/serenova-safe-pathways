
import { TextareaHTMLAttributes, forwardRef } from 'react';

interface FloatingLabelTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  id: string;
}

const FloatingLabelTextarea = forwardRef<HTMLTextAreaElement, FloatingLabelTextareaProps>(
  ({ label, error, id, ...props }, ref) => {
    return (
      <div className="input-field mb-4">
        <textarea
          id={id}
          ref={ref}
          placeholder=" "
          className={`${error ? 'border-red-500' : ''} min-h-[100px]`}
          {...props}
        />
        <label htmlFor={id}>{label}</label>
        {error && <p className="form-error">{error}</p>}
      </div>
    );
  }
);

FloatingLabelTextarea.displayName = 'FloatingLabelTextarea';

export default FloatingLabelTextarea;
