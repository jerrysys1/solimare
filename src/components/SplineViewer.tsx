import React from 'react';

interface SplineViewerProps {
  url: string;
  className?: string;
}

export const SplineViewer: React.FC<SplineViewerProps> = ({ url, className }) => {
  return React.createElement(
    'spline-viewer',
    { url, className, style: { width: '100%', height: '100%', pointerEvents: 'auto' }, ['events-target']: 'document' } as any
  );
};
