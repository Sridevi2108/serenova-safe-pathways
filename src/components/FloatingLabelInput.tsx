
import { InputHTMLAttributes, forwardRef } from 'react';

interface FloatingLabelInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  id: string;
}

const FloatingLabelInput = forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ label, error, id, ...props }, ref) => {
    return (
      <div className="input-field mb-4">
        <input
          id={id}
          ref={ref}
          placeholder=" "
          className={`${error ? 'border-red-500' : ''}`}
          {...props}
        />
        <label htmlFor={id}>{label}</label>
        {error && <p className="form-error">{error}</p>}
      </div>
    );
  }
);

FloatingLabelInput.displayName = 'FloatingLabelInput';

export default FloatingLabelInput;
