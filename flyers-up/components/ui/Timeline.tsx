'use client';

import { useTheme } from '@/contexts/ThemeContext';

interface TimelineStep {
  id: string;
  label: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface TimelineProps {
  steps: TimelineStep[];
}

/**
 * Vertical timeline component for job status
 * Integrates with left rail/stripe concept
 */
export function Timeline({ steps }: TimelineProps) {
  const { primaryColor } = useTheme();

  return (
    <div className="relative pl-8">
      {/* Vertical line */}
      <div 
        className="absolute left-3 top-0 bottom-0 w-0.5"
        style={{ backgroundColor: primaryColor }}
      />
      
      {steps.map((step, index) => (
        <div key={step.id} className="relative mb-8 last:mb-0">
          {/* Circle indicator */}
          <div
            className="absolute left-0 transform -translate-x-1/2 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center"
            style={{
              borderColor: step.status === 'completed' || step.status === 'current' 
                ? primaryColor 
                : '#EAEAEA',
              backgroundColor: step.status === 'completed' ? primaryColor : 'white',
            }}
          >
            {step.status === 'completed' && (
              <span className="text-white text-xs">✓</span>
            )}
            {step.status === 'current' && (
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
            )}
          </div>
          
          {/* Step content */}
          <div className="ml-6">
            <div 
              className={`text-sm font-semibold ${
                step.status === 'completed' || step.status === 'current'
                  ? 'text-gray-900'
                  : 'text-gray-400'
              }`}
            >
              {step.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}









