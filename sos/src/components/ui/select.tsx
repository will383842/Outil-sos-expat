import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

// Context for controlled select
interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined);

function useSelectContext() {
  const context = React.useContext(SelectContext);
  return context;
}

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

const Select: React.FC<SelectProps> = ({
  value: controlledValue,
  onValueChange,
  children,
  disabled,
  className,
}) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;
  const handleValueChange = (newValue: string) => {
    if (onValueChange) {
      onValueChange(newValue);
    } else {
      setUncontrolledValue(newValue);
    }
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={cn('relative', className)}>
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child;

          if (child.type === SelectTrigger) {
            return React.cloneElement(child as React.ReactElement<SelectTriggerProps>, {
              onClick: () => !disabled && setOpen(!open),
              disabled,
            });
          }

          if (child.type === SelectContent && open) {
            return React.cloneElement(child as React.ReactElement, {
              onClose: () => setOpen(false),
            });
          }

          return null;
        })}
      </div>
    </SelectContext.Provider>
  );
};
Select.displayName = 'Select';

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
);
SelectTrigger.displayName = 'SelectTrigger';

interface SelectValueProps {
  placeholder?: string;
}

const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => {
  const context = useSelectContext();
  return <span>{context?.value || placeholder}</span>;
};
SelectValue.displayName = 'SelectValue';

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void;
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, onClose, ...props }, ref) => {
    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (ref && typeof ref !== 'function' && ref.current && !ref.current.contains(e.target as Node)) {
          onClose?.();
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose, ref]);

    return (
      <div
        ref={ref}
        className={cn(
          'absolute top-full left-0 z-50 mt-1 min-w-full overflow-hidden rounded-md border bg-white shadow-lg',
          className
        )}
        {...props}
      >
        <div className="p-1">{children}</div>
      </div>
    );
  }
);
SelectContent.displayName = 'SelectContent';

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, disabled, ...props }, ref) => {
    const context = useSelectContext();
    const isSelected = context?.value === value;

    return (
      <div
        ref={ref}
        onClick={() => !disabled && context?.onValueChange(value)}
        className={cn(
          'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm',
          'hover:bg-gray-100',
          isSelected && 'bg-gray-100 font-medium',
          disabled && 'pointer-events-none opacity-50',
          className
        )}
        {...props}
      >
        {isSelected && (
          <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
        {children}
      </div>
    );
  }
);
SelectItem.displayName = 'SelectItem';

const SelectGroup: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div className={cn('p-1', className)} {...props} />
);
SelectGroup.displayName = 'SelectGroup';

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem };
