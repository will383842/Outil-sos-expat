// src/components/ui/tabs.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

// Context for controlled tabs
interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

// Legacy API Types
type LegacyTabProps = {
  value: string;
  label: string;
  children?: React.ReactNode;
};

// New API Props
export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

// Legacy Tab component
export const Tab: React.FC<LegacyTabProps> = () => null;

// Modern Tabs with controlled/uncontrolled support
export const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children,
  ...props
}) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || '');

  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;
  const handleValueChange = onValueChange || setUncontrolledValue;

  // Check if using legacy API (Tab children)
  const childrenArray = React.Children.toArray(children);
  const isLegacyAPI = childrenArray.some(
    (child) => React.isValidElement(child) && child.type === Tab
  );

  if (isLegacyAPI) {
    // Legacy API support
    const tabs = childrenArray as React.ReactElement<LegacyTabProps>[];
    return (
      <div className={className} {...props}>
        <div className="flex flex-wrap gap-2 border-b">
          {tabs.map((t) => (
            <button
              key={t.props.value}
              onClick={() => handleValueChange(t.props.value)}
              className={`px-3 py-2 rounded-t-md text-sm ${
                value === t.props.value ? 'border border-b-0 font-medium' : 'opacity-70'
              }`}
              aria-selected={value === t.props.value}
              role="tab"
            >
              {t.props.label}
            </button>
          ))}
        </div>
        <div className="pt-4" role="tabpanel">
          {tabs.find((t) => t.props.value === value)?.props.children}
        </div>
      </div>
    );
  }

  // Modern API
  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1',
        className
      )}
      role="tablist"
      {...props}
    />
  )
);
TabsList.displayName = 'TabsList';

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useTabsContext();
    const isSelected = selectedValue === value;

    return (
      <button
        ref={ref}
        role="tab"
        aria-selected={isSelected}
        onClick={() => onValueChange(value)}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          isSelected
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900',
          className
        )}
        {...props}
      />
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const { value: selectedValue } = useTabsContext();

    if (selectedValue !== value) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        className={cn('mt-2', className)}
        {...props}
      />
    );
  }
);
TabsContent.displayName = 'TabsContent';

export default Tabs;
