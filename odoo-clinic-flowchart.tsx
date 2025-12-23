import React, { useState, useEffect } from 'react';

interface StepData {
  deadline?: string;
  notes?: string;
}

interface SubRectangle {
  id: string;
  label: string;
  x: number;
  y: number;
  deadline?: string;
  notes?: string;
}

interface StepInfo {
  module: string;
  stepId: string;
  label: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

const FlowchartDiagram = () => {
  const [selectedModule, setSelectedModule] = useState('main');
  const [stepData, setStepData] = useState<Record<string, StepData>>({});
  const [subRectangles, setSubRectangles] = useState<Record<string, SubRectangle[]>>({});
  const [editingStep, setEditingStep] = useState<StepInfo | null>(null);
  const [deadlineInput, setDeadlineInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [editingSubRect, setEditingSubRect] = useState<{stepKey: string, subRect: SubRectangle | null} | null>(null);
  const [subRectLabel, setSubRectLabel] = useState('');
  const [subRectDeadline, setSubRectDeadline] = useState('');
  const [subRectNotes, setSubRectNotes] = useState('');
  const [draggingSubRect, setDraggingSubRect] = useState<{stepKey: string, id: string, offsetX: number, offsetY: number} | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('workflowStepData');
      if (saved) {
        const parsedData = JSON.parse(saved);
        if (parsedData && typeof parsedData === 'object' && Object.keys(parsedData).length > 0) {
          console.log('Loading data from localStorage:', parsedData);
          setStepData(parsedData);
        } else {
          console.log('No valid data found in localStorage');
        }
      } else {
        console.log('No saved data found in localStorage');
      }
      
      const savedSubRects = localStorage.getItem('workflowSubRectangles');
      if (savedSubRects) {
        const parsedSubRects = JSON.parse(savedSubRects);
        if (parsedSubRects && typeof parsedSubRects === 'object') {
          setSubRectangles(parsedSubRects);
        }
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }, []);

  // Save data to localStorage whenever stepData changes (automatic persistence)
  useEffect(() => {
    try {
      const dataToSave = JSON.stringify(stepData);
      localStorage.setItem('workflowStepData', dataToSave);
      console.log('Data automatically saved:', stepData);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, [stepData]);

  // Save sub-rectangles to localStorage
  useEffect(() => {
    try {
      const dataToSave = JSON.stringify(subRectangles);
      localStorage.setItem('workflowSubRectangles', dataToSave);
    } catch (error) {
      console.error('Failed to save sub-rectangles to localStorage:', error);
    }
  }, [subRectangles]);

  const getStepKey = (module: string, stepId: string) => `${module}-${stepId}`;

  const handleStepClick = (step: StepInfo) => {
    const key = getStepKey(step.module, step.stepId);
    const existing = stepData[key];
    setEditingStep(step);
    setDeadlineInput(existing?.deadline || '');
    setNotesInput(existing?.notes || '');
  };

  const handleSave = () => {
    if (!editingStep) return;
    const key = getStepKey(editingStep.module, editingStep.stepId);
    
    // Create new step data object
    const newStepData: StepData = {};
    if (deadlineInput && deadlineInput.trim() !== '') {
      newStepData.deadline = deadlineInput.trim();
    }
    if (notesInput && notesInput.trim() !== '') {
      newStepData.notes = notesInput.trim();
    }
    
    // Update state - use functional update to ensure we get the latest state
    setStepData(prev => {
      const updated = { ...prev };
      // If both fields are empty, remove the entry
      if (!newStepData.deadline && !newStepData.notes) {
        delete updated[key];
      } else {
        updated[key] = newStepData;
      }
      return updated;
    });
    
    // Close modal and reset inputs
    setEditingStep(null);
    setDeadlineInput('');
    setNotesInput('');
  };

  const handleDelete = () => {
    if (!editingStep) return;
    const key = getStepKey(editingStep.module, editingStep.stepId);
    setStepData(prev => {
      const newData = { ...prev };
      delete newData[key];
      return newData;
    });
    setEditingStep(null);
    setDeadlineInput('');
    setNotesInput('');
  };

  const handleAddSubRect = (stepKey: string, subRect?: SubRectangle) => {
    setEditingSubRect({ stepKey, subRect: subRect || null });
    setSubRectLabel(subRect?.label || '');
    setSubRectDeadline(subRect?.deadline || '');
    setSubRectNotes(subRect?.notes || '');
  };

  const getSubRectKey = (stepKey: string, subRectId: string) => `${stepKey}-sub-${subRectId}`;

  const getSubRectData = (stepKey: string, subRectId: string): StepData => {
    const key = getSubRectKey(stepKey, subRectId);
    return stepData[key] || {};
  };

  const handleSaveSubRect = () => {
    if (!editingSubRect || !subRectLabel.trim()) return;
    
    const stepKey = editingSubRect.stepKey;
    const existing = subRectangles[stepKey] || [];
    const subRectKey = editingSubRect.subRect 
      ? getSubRectKey(stepKey, editingSubRect.subRect.id)
      : null;
    
    // Save notes and deadline for sub-rectangle
    if (subRectKey) {
      const newSubRectData: StepData = {};
      if (subRectDeadline && subRectDeadline.trim() !== '') {
        newSubRectData.deadline = subRectDeadline.trim();
      }
      if (subRectNotes && subRectNotes.trim() !== '') {
        newSubRectData.notes = subRectNotes.trim();
      }
      
      setStepData(prev => {
        const updated = { ...prev };
        if (!newSubRectData.deadline && !newSubRectData.notes) {
          delete updated[subRectKey];
        } else {
          updated[subRectKey] = newSubRectData;
        }
        return updated;
      });
    }
    
    if (editingSubRect.subRect) {
      // Update existing
      setSubRectangles(prev => ({
        ...prev,
        [stepKey]: existing.map(sr => 
          sr.id === editingSubRect!.subRect!.id 
            ? { ...sr, label: subRectLabel.trim(), deadline: subRectDeadline.trim() || undefined, notes: subRectNotes.trim() || undefined }
            : sr
        )
      }));
    } else {
      // Add new - position next to main rectangle (default position, user can drag)
      const newSubRect: SubRectangle = {
        id: Date.now().toString(),
        label: subRectLabel.trim(),
        x: 600 + (existing.length * 200), // Default position, will be adjusted in component
        y: 400 + (existing.length * 80),
        deadline: subRectDeadline.trim() || undefined,
        notes: subRectNotes.trim() || undefined
      };
      
      // Save notes and deadline
      const newKey = getSubRectKey(stepKey, newSubRect.id);
      const newSubRectData: StepData = {};
      if (subRectDeadline && subRectDeadline.trim() !== '') {
        newSubRectData.deadline = subRectDeadline.trim();
      }
      if (subRectNotes && subRectNotes.trim() !== '') {
        newSubRectData.notes = subRectNotes.trim();
      }
      if (newSubRectData.deadline || newSubRectData.notes) {
        setStepData(prev => ({ ...prev, [newKey]: newSubRectData }));
      }
      
      setSubRectangles(prev => ({
        ...prev,
        [stepKey]: [...existing, newSubRect]
      }));
    }
    
    setEditingSubRect(null);
    setSubRectLabel('');
    setSubRectDeadline('');
    setSubRectNotes('');
  };

  const handleDeleteSubRect = (stepKey: string, subRectId: string) => {
    setSubRectangles(prev => {
      const existing = prev[stepKey] || [];
      const updated = existing.filter(sr => sr.id !== subRectId);
      if (updated.length === 0) {
        const newData = { ...prev };
        delete newData[stepKey];
        return newData;
      }
      return { ...prev, [stepKey]: updated };
    });
  };

  const getSubRectangles = (stepKey: string): SubRectangle[] => {
    return subRectangles[stepKey] || [];
  };

  const handleSubRectDragStart = (e: React.MouseEvent, stepKey: string, subRectId: string, currentX: number, currentY: number) => {
    e.stopPropagation();
    const svg = (e.currentTarget as SVGRectElement).ownerSVGElement;
    if (!svg) return;
    
    const svgRect = svg.getBoundingClientRect();
    const offsetX = e.clientX - svgRect.left - currentX;
    const offsetY = e.clientY - svgRect.top - currentY;
    
    setDraggingSubRect({ stepKey, id: subRectId, offsetX, offsetY });
  };

  const handleSubRectDrag = (e: React.MouseEvent) => {
    if (!draggingSubRect) return;
    
    const svg = (e.currentTarget as SVGSVGElement);
    const svgRect = svg.getBoundingClientRect();
    const newX = e.clientX - svgRect.left - draggingSubRect.offsetX;
    const newY = e.clientY - svgRect.top - draggingSubRect.offsetY;
    
    setSubRectangles(prev => {
      const existing = prev[draggingSubRect.stepKey] || [];
      return {
        ...prev,
        [draggingSubRect.stepKey]: existing.map(sr =>
          sr.id === draggingSubRect.id
            ? { ...sr, x: Math.max(0, newX), y: Math.max(0, newY) }
            : sr
        )
      };
    });
  };

  const handleSubRectDragEnd = () => {
    setDraggingSubRect(null);
  };


  const getStepData = (module: string, stepId: string): StepData => {
    const key = getStepKey(module, stepId);
    const data = stepData[key] || {};
    // Debug: log when data is retrieved
    if (data.deadline || data.notes) {
      console.log(`Getting data for ${key}:`, data);
    }
    return data;
  };

  const isOverdue = (deadline: string): boolean => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  };

  // Helper component for interactive step badges
  const StepBadge = ({ step, module }: { step: StepInfo; module: string }) => {
    const data = getStepData(module, step.stepId);
    const hasData = data.deadline || data.notes;
    const overdue = data.deadline && isOverdue(data.deadline);

    if (!hasData) return null;

    return (
      <foreignObject x={step.x - 15} y={step.y - 35} width="30" height="30">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStepClick(step);
            }}
            className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center cursor-pointer transition-all hover:scale-110 ${
              overdue
                ? 'bg-red-500 text-white animate-pulse'
                : data.deadline
                ? 'bg-yellow-400 text-gray-800'
                : 'bg-blue-400 text-white'
            }`}
            title={`${data.deadline ? `Deadline: ${new Date(data.deadline).toLocaleDateString()}` : ''}${data.notes ? `\nNotes: ${data.notes}` : ''}`}
          >
            {data.deadline ? '📅' : '📝'}
          </button>
        </div>
      </foreignObject>
    );
  };

  // Helper component to display notes on the workflow - NEXT TO the shape (right side)
  const NotesDisplay = ({ step, module }: { step: StepInfo; module: string }) => {
    const data = getStepData(module, step.stepId);
    
    if (!data.notes || !data.notes.trim()) return null;

    const stepWidth = step.width || 180;
    const stepHeight = step.height || 60;
    
    // Position notes to the RIGHT of the shape
    const noteBoxX = step.x + stepWidth / 2 + 15; // Right side of shape + spacing
    const noteBoxY = step.y - stepHeight / 2; // Align with top of shape
    const noteBoxWidth = 200; // Fixed width for professional look
    const maxLines = 4; // More lines for better readability
    const lineHeight = 14;
    const padding = 10;
    
    // Split notes into lines
    const lines: string[] = [];
    const words = data.notes.trim().split(/\s+/);
    let currentLine = '';
    const maxCharsPerLine = 35; // Characters per line
    
    words.forEach(word => {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word.length > maxCharsPerLine ? word.substring(0, maxCharsPerLine - 3) + '...' : word;
      }
    });
    if (currentLine) lines.push(currentLine);
    
    const displayLines = lines.slice(0, maxLines);
    const hasMore = lines.length > maxLines;
    const totalHeight = displayLines.length * lineHeight + padding * 2;

    return (
      <g>
        {/* Professional note card with shadow effect */}
        <defs>
          <filter id="noteShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="2" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background card */}
        <rect
          x={noteBoxX}
          y={noteBoxY}
          width={noteBoxWidth}
          height={totalHeight}
          fill="#ffffff"
          stroke="#e5e7eb"
          strokeWidth="1.5"
          rx="6"
          filter="url(#noteShadow)"
          className="cursor-pointer"
          onClick={() => handleStepClick(step)}
        />
        
        {/* Left border accent */}
        <rect
          x={noteBoxX}
          y={noteBoxY}
          width="4"
          height={totalHeight}
          fill="#3b82f6"
          rx="6"
        />
        
        {/* Header */}
        <text
          x={noteBoxX + padding + 20}
          y={noteBoxY + padding + 12}
          fill="#1f2937"
          fontSize="11"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          Notes
        </text>
        
        {/* Notes text */}
        {displayLines.map((line, index) => (
          <text
            key={index}
            x={noteBoxX + padding + 20}
            y={noteBoxY + padding + 28 + (index * lineHeight)}
            fill="#4b5563"
            fontSize="11"
            fontWeight="400"
            fontFamily="system-ui, -apple-system, sans-serif"
            className="cursor-pointer"
            onClick={() => handleStepClick(step)}
          >
            {line}
          </text>
        ))}
        
        {hasMore && (
          <text
            x={noteBoxX + padding + 20}
            y={noteBoxY + padding + 28 + displayLines.length * lineHeight}
            fill="#9ca3af"
            fontSize="10"
            fontStyle="italic"
            fontFamily="system-ui, -apple-system, sans-serif"
            className="cursor-pointer"
            onClick={() => handleStepClick(step)}
          >
            ... (click to see more)
          </text>
        )}
        
        {/* Connecting line to shape */}
        <line
          x1={step.x + stepWidth / 2}
          y1={step.y}
          x2={noteBoxX}
          y2={noteBoxY + totalHeight / 2}
          stroke="#d1d5db"
          strokeWidth="1.5"
          strokeDasharray="4,4"
        />
      </g>
    );
  };

  // Helper component to display deadline on the workflow - NEXT TO the shape (left side)
  const DeadlineDisplay = ({ step, module }: { step: StepInfo; module: string }) => {
    const data = getStepData(module, step.stepId);
    if (!data.deadline) return null;

    const overdue = isOverdue(data.deadline);
    const deadlineDate = new Date(data.deadline);
    const formattedDate = deadlineDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });

    const stepWidth = step.width || 180;
    const stepHeight = step.height || 60;
    
    // Position deadline to the LEFT of the shape
    const deadlineBoxWidth = 160;
    const deadlineBoxX = step.x - stepWidth / 2 - deadlineBoxWidth - 15; // Left side of shape - spacing
    const deadlineBoxY = step.y - stepHeight / 2; // Align with top of shape
    const deadlineBoxHeight = 50;
    const padding = 10;

    return (
      <g>
        {/* Professional deadline card with shadow effect */}
        <defs>
          <filter id="deadlineShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="2" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background card */}
        <rect
          x={deadlineBoxX}
          y={deadlineBoxY}
          width={deadlineBoxWidth}
          height={deadlineBoxHeight}
          fill="#ffffff"
          stroke={overdue ? "#ef4444" : "#e5e7eb"}
          strokeWidth="1.5"
          rx="6"
          filter="url(#deadlineShadow)"
          className="cursor-pointer"
          onClick={() => handleStepClick(step)}
        />
        
        {/* Left border accent - red if overdue, blue if normal */}
        <rect
          x={deadlineBoxX}
          y={deadlineBoxY}
          width="4"
          height={deadlineBoxHeight}
          fill={overdue ? "#ef4444" : "#3b82f6"}
          rx="6"
        />
        
        {/* Icon and label */}
        <text
          x={deadlineBoxX + padding + 8}
          y={deadlineBoxY + padding + 12}
          fill="#1f2937"
          fontSize="10"
          fontWeight="600"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {overdue ? '⚠️' : '📅'} Deadline
        </text>
        
        {/* Date */}
        <text
          x={deadlineBoxX + padding + 8}
          y={deadlineBoxY + padding + 26}
          fill={overdue ? "#dc2626" : "#059669"}
          fontSize="12"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
          className="cursor-pointer"
          onClick={() => handleStepClick(step)}
        >
          {formattedDate}
        </text>
        
        {/* Connecting line to shape */}
        <line
          x1={step.x - stepWidth / 2}
          y1={step.y}
          x2={deadlineBoxX + deadlineBoxWidth}
          y2={deadlineBoxY + deadlineBoxHeight / 2}
          stroke="#d1d5db"
          strokeWidth="1.5"
          strokeDasharray="4,4"
        />
      </g>
    );
  };

  // Helper component for clickable step
  const ClickableStep = ({ 
    children, 
    step, 
    module 
  }: { 
    children: React.ReactNode; 
    step: StepInfo; 
    module?: string;
  }) => {
    // Use module from prop or from step object
    const stepModule = module || step.module;
    return (
      <g>
        {children}
        <StepBadge step={step} module={stepModule} />
        <DeadlineDisplay step={step} module={stepModule} />
        <NotesDisplay step={step} module={stepModule} />
        <foreignObject 
          x={step.x - (step.width || 180) / 2} 
          y={step.y - (step.height || 60) / 2} 
          width={step.width || 180} 
          height={step.height || 60}
        >
          <div
            className="w-full h-full cursor-pointer opacity-0 hover:opacity-10 hover:bg-blue-500 transition-opacity"
            onClick={() => handleStepClick(step)}
            title="Click to add deadline or notes"
          />
        </foreignObject>
      </g>
    );
  };

  // Main workflow
  const MainFlow = () => {
    const module = 'main';
    // Access stepData to ensure component re-renders when it changes
    void stepData; // This ensures the component re-renders when stepData changes
    return (
      <svg width="1200" height="1100" className="mx-auto" viewBox="0 0 1200 1100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#1e40af" />
          </marker>
        </defs>
        
        {/* Start */}
        <ClickableStep step={{ module, stepId: 'start', label: 'Start Project', x: 400, y: 40, width: 160, height: 60 }}>
          <ellipse cx="400" cy="40" rx="80" ry="30" fill="#3b82f6" stroke="#1e40af" strokeWidth="2"/>
          <text x="400" y="47" textAnchor="middle" fill="white" fontWeight="bold">Start Project</text>
        </ClickableStep>
        
        {/* Arrow */}
        <line x1="400" y1="70" x2="400" y2="110" stroke="#1e40af" strokeWidth="2" markerEnd="url(#arrowhead)"/>
        
        {/* Base Module */}
        <ClickableStep step={{ module, stepId: 'base-module', label: 'Base Module Setup', x: 400, y: 140, width: 180, height: 60 }}>
          <rect x="310" y="110" width="180" height="60" fill="#dbeafe" stroke="#1e40af" strokeWidth="2" rx="5"/>
          <text x="400" y="145" textAnchor="middle" fill="#1e40af" fontWeight="bold">Base Module Setup</text>
        </ClickableStep>
        
        {/* Arrow */}
        <line x1="400" y1="170" x2="400" y2="210" stroke="#1e40af" strokeWidth="2" markerEnd="url(#arrowhead)"/>
        
        {/* Decision 1 */}
        <ClickableStep step={{ module, stepId: 'decision-1', label: 'Base Module Complete?', x: 400, y: 260, width: 160, height: 100 }}>
          <path d="M 400 210 L 480 260 L 400 310 L 320 260 Z" fill="white" stroke="#1e40af" strokeWidth="2"/>
          <text x="400" y="255" textAnchor="middle" fill="#1e40af" fontSize="13">Base Module</text>
          <text x="400" y="270" textAnchor="middle" fill="#1e40af" fontSize="13">Complete?</text>
        </ClickableStep>
        
        {/* No path */}
        <line x1="320" y1="260" x2="200" y2="260" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowhead)"/>
        <text x="280" y="250" fill="#ef4444" fontSize="12">No</text>
        <ellipse cx="120" cy="260" rx="70" ry="30" fill="#fca5a5" stroke="#ef4444" strokeWidth="2"/>
        <text x="120" y="260" textAnchor="middle" fill="#7f1d1d" fontSize="11">End / Fix</text>
        <text x="120" y="274" textAnchor="middle" fill="#7f1d1d" fontSize="11">Issues</text>
        
        {/* Yes path */}
        <line x1="400" y1="310" x2="400" y2="350" stroke="#1e40af" strokeWidth="2" markerEnd="url(#arrowhead)"/>
        <text x="420" y="330" fill="#22c55e" fontSize="12">Yes</text>
        
        {/* General Module */}
        <ClickableStep step={{ module, stepId: 'general-module', label: 'General Module', x: 400, y: 380, width: 180, height: 60 }}>
          <rect x="310" y="350" width="180" height="60" fill="#dbeafe" stroke="#1e40af" strokeWidth="2" rx="5"/>
          <text x="400" y="385" textAnchor="middle" fill="#1e40af" fontWeight="bold">General Module</text>
        </ClickableStep>
        
        {/* Arrow */}
        <line x1="400" y1="410" x2="400" y2="450" stroke="#1e40af" strokeWidth="2" markerEnd="url(#arrowhead)"/>
        
        {/* Decision 2 */}
        <ClickableStep step={{ module, stepId: 'decision-2', label: 'General Module Tested?', x: 400, y: 500, width: 160, height: 100 }}>
          <path d="M 400 450 L 480 500 L 400 550 L 320 500 Z" fill="white" stroke="#1e40af" strokeWidth="2"/>
          <text x="400" y="495" textAnchor="middle" fill="#1e40af" fontSize="13">General Module</text>
          <text x="400" y="510" textAnchor="middle" fill="#1e40af" fontSize="13">Tested?</text>
        </ClickableStep>
        
        {/* No path 2 */}
        <line x1="320" y1="500" x2="200" y2="500" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowhead)"/>
        <text x="280" y="490" fill="#ef4444" fontSize="12">No</text>
        <ellipse cx="120" cy="500" rx="70" ry="30" fill="#fca5a5" stroke="#ef4444" strokeWidth="2"/>
        <text x="120" y="500" textAnchor="middle" fill="#7f1d1d" fontSize="11">End / Fix</text>
        <text x="120" y="514" textAnchor="middle" fill="#7f1d1d" fontSize="11">Issues</text>
        
        {/* Yes path */}
        <line x1="400" y1="550" x2="400" y2="590" stroke="#1e40af" strokeWidth="2" markerEnd="url(#arrowhead)"/>
        <text x="420" y="570" fill="#22c55e" fontSize="12">Yes</text>
        
        {/* System Integrations */}
        <ClickableStep step={{ module, stepId: 'system-integrations', label: 'System Integrations', x: 400, y: 620, width: 220, height: 60 }}>
          <rect x="290" y="590" width="220" height="60" fill="#dbeafe" stroke="#1e40af" strokeWidth="2" rx="5"/>
          <text x="400" y="625" textAnchor="middle" fill="#1e40af" fontWeight="bold">System Integrations</text>
        </ClickableStep>
        
        {/* Arrow */}
        <line x1="400" y1="650" x2="400" y2="690" stroke="#1e40af" strokeWidth="2" markerEnd="url(#arrowhead)"/>
        
        {/* Decision 3 */}
        <ClickableStep step={{ module, stepId: 'decision-3', label: 'Integrations Verified?', x: 400, y: 740, width: 160, height: 100 }}>
          <path d="M 400 690 L 480 740 L 400 790 L 320 740 Z" fill="white" stroke="#1e40af" strokeWidth="2"/>
          <text x="400" y="735" textAnchor="middle" fill="#1e40af" fontSize="13">Integrations</text>
          <text x="400" y="750" textAnchor="middle" fill="#1e40af" fontSize="13">Verified?</text>
        </ClickableStep>
        
        {/* No path 3 */}
        <line x1="320" y1="740" x2="200" y2="740" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowhead)"/>
        <text x="280" y="730" fill="#ef4444" fontSize="12">No</text>
        <ellipse cx="120" cy="740" rx="70" ry="30" fill="#fca5a5" stroke="#ef4444" strokeWidth="2"/>
        <text x="120" y="740" textAnchor="middle" fill="#7f1d1d" fontSize="11">End / Fix</text>
        <text x="120" y="754" textAnchor="middle" fill="#7f1d1d" fontSize="11">Issues</text>
        
        {/* Yes path */}
        <line x1="400" y1="790" x2="400" y2="830" stroke="#1e40af" strokeWidth="2" markerEnd="url(#arrowhead)"/>
        <text x="420" y="810" fill="#22c55e" fontSize="12">Yes</text>
        
        {/* Medical Extensions */}
        <ClickableStep step={{ module, stepId: 'medical-extensions', label: 'Medical Extensions', x: 400, y: 860, width: 220, height: 60 }}>
          <rect x="290" y="830" width="220" height="60" fill="#dbeafe" stroke="#1e40af" strokeWidth="2" rx="5"/>
          <text x="400" y="865" textAnchor="middle" fill="#1e40af" fontWeight="bold">Medical Extensions</text>
        </ClickableStep>
        
        {/* Arrow */}
        <line x1="400" y1="890" x2="400" y2="930" stroke="#1e40af" strokeWidth="2" markerEnd="url(#arrowhead)"/>
        
        {/* Decision 4 */}
        <ClickableStep step={{ module, stepId: 'decision-4', label: 'Medical Modules Approved?', x: 400, y: 980, width: 160, height: 100 }}>
          <path d="M 400 930 L 480 980 L 400 1030 L 320 980 Z" fill="white" stroke="#1e40af" strokeWidth="2"/>
          <text x="400" y="975" textAnchor="middle" fill="#1e40af" fontSize="13">Medical Modules</text>
          <text x="400" y="990" textAnchor="middle" fill="#1e40af" fontSize="13">Approved?</text>
        </ClickableStep>
        
        {/* No path 4 */}
        <line x1="320" y1="980" x2="200" y2="980" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowhead)"/>
        <text x="280" y="970" fill="#ef4444" fontSize="12">No</text>
        <ellipse cx="120" cy="980" rx="70" ry="30" fill="#fca5a5" stroke="#ef4444" strokeWidth="2"/>
        <text x="120" y="980" textAnchor="middle" fill="#7f1d1d" fontSize="11">End / Fix</text>
        <text x="120" y="994" textAnchor="middle" fill="#7f1d1d" fontSize="11">Issues</text>
        
        {/* Yes path */}
        <line x1="480" y1="980" x2="600" y2="980" stroke="#1e40af" strokeWidth="2" markerEnd="url(#arrowhead)"/>
        <text x="520" y="970" fill="#22c55e" fontSize="12">Yes</text>
        
        {/* Chatbot */}
        <ClickableStep step={{ module, stepId: 'chatbot', label: 'Chatbot', x: 675, y: 975, width: 150, height: 50 }}>
          <rect x="600" y="950" width="150" height="50" fill="#dbeafe" stroke="#1e40af" strokeWidth="2" rx="5"/>
          <text x="675" y="980" textAnchor="middle" fill="#1e40af" fontWeight="bold">Chatbot</text>
        </ClickableStep>
        
        <line x1="675" y1="1000" x2="675" y2="1020" stroke="#1e40af" strokeWidth="2" markerEnd="url(#arrowhead)"/>
        
        {/* Customization */}
        <ClickableStep step={{ module, stepId: 'customization', label: 'Clinic Customization', x: 675, y: 1045, width: 150, height: 50 }}>
          <rect x="600" y="1020" width="150" height="50" fill="#dbeafe" stroke="#1e40af" strokeWidth="2" rx="5"/>
          <text x="675" y="1045" textAnchor="middle" fill="#1e40af" fontSize="12" fontWeight="bold">Clinic</text>
          <text x="675" y="1058" textAnchor="middle" fill="#1e40af" fontSize="12" fontWeight="bold">Customization</text>
        </ClickableStep>
        
        {/* Final arrow to Go Live */}
        <line x1="600" y1="1045" x2="520" y2="1045" stroke="#1e40af" strokeWidth="2" markerEnd="url(#arrowhead)"/>
        
        {/* Go Live */}
        <ClickableStep step={{ module, stepId: 'go-live', label: 'Go Live', x: 440, y: 1045, width: 140, height: 60 }}>
          <ellipse cx="440" cy="1045" rx="70" ry="30" fill="#22c55e" stroke="#16a34a" strokeWidth="2"/>
          <text x="440" y="1052" textAnchor="middle" fill="white" fontWeight="bold">Go Live</text>
        </ClickableStep>
      </svg>
    );
  };

  // Base Module detailed flow
  const BaseModuleFlow = () => {
    const module = 'base';
    const steps: StepInfo[] = [
      { module, stepId: 'start', label: 'Start', x: 200, y: 30, width: 100, height: 50 },
      { module, stepId: 'clinic-structure', label: 'Clinic Structure Setup', x: 200, y: 110, width: 200, height: 50 },
      { module, stepId: 'doctors-nurses', label: 'Doctors / Nurses / Staff', x: 200, y: 190, width: 230, height: 50 },
      { module, stepId: 'patients', label: 'Patients', x: 200, y: 270, width: 140, height: 50 },
      { module, stepId: 'departments', label: 'Departments', x: 200, y: 350, width: 160, height: 50 },
      { module, stepId: 'scheduling', label: 'Scheduling & Appointments', x: 200, y: 430, width: 260, height: 50 },
      { module, stepId: 'rooms-machines', label: 'Rooms & Machines', x: 200, y: 510, width: 230, height: 50 },
      { module, stepId: 'medicines', label: 'Medicines', x: 200, y: 590, width: 140, height: 50 },
      { module, stepId: 'verified', label: 'Verified?', x: 200, y: 685, width: 120, height: 80 },
    ];

    return (
      <svg width="400" height="900" className="mx-auto">
        <defs>
          <marker id="arrowhead2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#1e40af" />
          </marker>
        </defs>
        
        <ClickableStep step={steps[0]} module={module}>
          <ellipse cx="200" cy="30" rx="50" ry="25" fill="#3b82f6" stroke="#1e40af" strokeWidth="2"/>
          <text x="200" y="37" textAnchor="middle" fill="white" fontWeight="bold">Start</text>
        </ClickableStep>
        
        <line x1="200" y1="55" x2="200" y2="85" stroke="#1e40af" strokeWidth="2" markerEnd="url(#arrowhead2)"/>
        
        <ClickableStep step={steps[1]} module={module}>
          <rect x="100" y="85" width="200" height="50" fill="#dbeafe" stroke="#1e40af" strokeWidth="2" rx="5"/>
          <text x="200" y="115" textAnchor="middle" fill="#1e40af" fontSize="13">Clinic Structure Setup</text>
        </ClickableStep>
        
        <line x1="200" y1="135" x2="200" y2="165" stroke="#1e40af" strokeWidth="2" markerEnd="url(#arrowhead2)"/>
        
        <ClickableStep step={steps[2]} module={module}>
          <rect x="85" y="165" width="230" height="50" fill="#dbeafe" stroke="#1e40af" strokeWidth="2" rx="5"/>
          <text x="200" y="195" textAnchor="middle" fill="#1e40af" fontSize="13">Doctors / Nurses / Staff</text>
        </ClickableStep>
        
        <line x1="200" y1="215" x2="200" y2="245" stroke="#1e40af" strokeWidth="2" markerEnd="url(#arrowhead2)"/>
        
        <ClickableStep step={steps[3]} module={module}>
          <rect x="130" y="245" width="140" height="50" fill="#dbeafe" stroke="#1e40af" strokeWidth="2" rx="5"/>
          <text x="200" y="275" textAnchor="middle" fill="#1e40af" fontSize="13">Patients</text>
        </ClickableStep>
        
        <line x1="200" y1="295" x2="200" y2="325" stroke="#1e40af" strokeWidth="2" markerEnd="url(#arrowhead2)"/>
        
        <ClickableStep step={steps[4]} module={module}>
          <rect x="120" y="325" width="160" height="50" fill="#dbeafe" stroke="#1e40af" strokeWidth="2" rx="5"/>
          <text x="200" y="355" textAnchor="middle" fill="#1e40af" fontSize="13">Departments</text>
        </ClickableStep>
        
        <line x1="200" y1="375" x2="200" y2="405" stroke="#1e40af" strokeWidth="2" markerEnd="url(#arrowhead2)"/>
        
        <ClickableStep step={steps[5]} module={module}>
          <rect x="70" y="405" width="260" height="50" fill="#dbeafe" stroke="#1e40af" strokeWidth="2" rx="5"/>
          <text x="200" y="435" textAnchor="middle" fill="#1e40af" fontSize="13">Scheduling & Appointments</text>
        </ClickableStep>
        
        <line x1="200" y1="455" x2="200" y2="485" stroke="#1e40af" strokeWidth="2" markerEnd="url(#arrowhead2)"/>
        
        <ClickableStep step={steps[6]} module={module}>
          <rect x="85" y="485" width="230" height="50" fill="#dbeafe" stroke="#1e40af" strokeWidth="2" rx="5"/>
          <text x="200" y="515" textAnchor="middle" fill="#1e40af" fontSize="13">Rooms & Machines</text>
        </ClickableStep>
        
        <line x1="200" y1="535" x2="200" y2="565" stroke="#1e40af" strokeWidth="2" markerEnd="url(#arrowhead2)"/>
        
        <ClickableStep step={steps[7]} module={module}>
          <rect x="130" y="565" width="140" height="50" fill="#dbeafe" stroke="#1e40af" strokeWidth="2" rx="5"/>
          <text x="200" y="595" textAnchor="middle" fill="#1e40af" fontSize="13">Medicines</text>
        </ClickableStep>
        
        <line x1="200" y1="615" x2="200" y2="645" stroke="#1e40af" strokeWidth="2" markerEnd="url(#arrowhead2)"/>
        
        <ClickableStep step={steps[8]} module={module}>
          <path d="M 200 645 L 260 685 L 200 725 L 140 685 Z" fill="white" stroke="#1e40af" strokeWidth="2"/>
          <text x="200" y="692" textAnchor="middle" fill="#1e40af" fontSize="13">Verified?</text>
        </ClickableStep>
        
        <line x1="260" y1="685" x2="320" y2="685" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowhead2)"/>
        <text x="275" y="675" fill="#22c55e" fontSize="11">Yes</text>
        <ellipse cx="360" cy="685" rx="60" ry="28" fill="#22c55e" stroke="#16a34a" strokeWidth="2"/>
        <text x="360" y="685" textAnchor="middle" fill="white" fontSize="11">Base Module</text>
        <text x="360" y="698" textAnchor="middle" fill="white" fontSize="11">Complete</text>
        
        <line x1="140" y1="685" x2="80" y2="685" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowhead2)"/>
        <text x="120" y="675" fill="#ef4444" fontSize="11">No</text>
        <ellipse cx="40" cy="685" rx="35" ry="25" fill="#fca5a5" stroke="#ef4444" strokeWidth="2"/>
        <text x="40" y="692" textAnchor="middle" fill="#7f1d1d" fontSize="11">End</text>
      </svg>
    );
  };

  // General Module Flow
  const GeneralModuleFlow = () => {
    const module = 'general';
    const steps: StepInfo[] = [
      { module, stepId: 'start', label: 'Start', x: 225, y: 30, width: 100, height: 50 },
      { module, stepId: 'crm', label: 'CRM Call Center & Leads', x: 225, y: 110, width: 270, height: 50 },
      { module, stepId: 'walk-in', label: 'Walk-in Patient', x: 225, y: 190, width: 210, height: 50 },
      { module, stepId: 'reception', label: 'Reception Handling', x: 225, y: 270, width: 240, height: 50 },
      { module, stepId: 'nurse', label: 'Nurse Assessment', x: 225, y: 350, width: 240, height: 50 },
      { module, stepId: 'doctor', label: 'Doctor Assessment', x: 225, y: 430, width: 240, height: 50 },
      { module, stepId: 'payments', label: 'Payments', x: 225, y: 510, width: 170, height: 50 },
      { module, stepId: 'workflow-ok', label: 'Workflow OK?', x: 225, y: 610, width: 140, height: 90 },
    ];

    return (
      <svg width="450" height="850" className="mx-auto">
        <defs>
          <marker id="arrowhead3" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#059669" />
          </marker>
        </defs>
        
        <ClickableStep step={steps[0]} module={module}>
          <ellipse cx="225" cy="30" rx="50" ry="25" fill="#10b981" stroke="#059669" strokeWidth="2"/>
          <text x="225" y="37" textAnchor="middle" fill="white" fontWeight="bold">Start</text>
        </ClickableStep>
        
        <line x1="225" y1="55" x2="225" y2="85" stroke="#059669" strokeWidth="2" markerEnd="url(#arrowhead3)"/>
        
        <ClickableStep step={steps[1]} module={module}>
          <rect x="90" y="85" width="270" height="50" fill="#d1fae5" stroke="#059669" strokeWidth="2" rx="5"/>
          <text x="225" y="115" textAnchor="middle" fill="#059669" fontSize="13">CRM Call Center & Leads</text>
        </ClickableStep>
        
        <line x1="225" y1="135" x2="225" y2="165" stroke="#059669" strokeWidth="2" markerEnd="url(#arrowhead3)"/>
        
        <ClickableStep step={steps[2]} module={module}>
          <rect x="120" y="165" width="210" height="50" fill="#d1fae5" stroke="#059669" strokeWidth="2" rx="5"/>
          <text x="225" y="195" textAnchor="middle" fill="#059669" fontSize="13">Walk-in Patient</text>
        </ClickableStep>
        
        <line x1="225" y1="215" x2="225" y2="245" stroke="#059669" strokeWidth="2" markerEnd="url(#arrowhead3)"/>
        
        <ClickableStep step={steps[3]} module={module}>
          <rect x="105" y="245" width="240" height="50" fill="#d1fae5" stroke="#059669" strokeWidth="2" rx="5"/>
          <text x="225" y="275" textAnchor="middle" fill="#059669" fontSize="13">Reception Handling</text>
        </ClickableStep>
        
        <line x1="225" y1="295" x2="225" y2="325" stroke="#059669" strokeWidth="2" markerEnd="url(#arrowhead3)"/>
        
        <ClickableStep step={steps[4]} module={module}>
          <rect x="105" y="325" width="240" height="50" fill="#d1fae5" stroke="#059669" strokeWidth="2" rx="5"/>
          <text x="225" y="355" textAnchor="middle" fill="#059669" fontSize="13">Nurse Assessment</text>
        </ClickableStep>
        
        <line x1="225" y1="375" x2="225" y2="405" stroke="#059669" strokeWidth="2" markerEnd="url(#arrowhead3)"/>
        
        <ClickableStep step={steps[5]} module={module}>
          <rect x="105" y="405" width="240" height="50" fill="#d1fae5" stroke="#059669" strokeWidth="2" rx="5"/>
          <text x="225" y="435" textAnchor="middle" fill="#059669" fontSize="13">Doctor Assessment</text>
        </ClickableStep>
        
        <line x1="225" y1="455" x2="225" y2="485" stroke="#059669" strokeWidth="2" markerEnd="url(#arrowhead3)"/>
        
        <ClickableStep step={steps[6]} module={module}>
          <rect x="140" y="485" width="170" height="50" fill="#d1fae5" stroke="#059669" strokeWidth="2" rx="5"/>
          <text x="225" y="515" textAnchor="middle" fill="#059669" fontSize="13">Payments</text>
        </ClickableStep>
        
        <line x1="225" y1="535" x2="225" y2="565" stroke="#059669" strokeWidth="2" markerEnd="url(#arrowhead3)"/>
        
        <ClickableStep step={steps[7]} module={module}>
          <path d="M 225 565 L 295 610 L 225 655 L 155 610 Z" fill="white" stroke="#059669" strokeWidth="2"/>
          <text x="225" y="617" textAnchor="middle" fill="#059669" fontSize="13">Workflow OK?</text>
        </ClickableStep>
        
        <line x1="295" y1="610" x2="365" y2="610" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowhead3)"/>
        <text x="310" y="600" fill="#22c55e" fontSize="11">Yes</text>
        <ellipse cx="410" cy="610" rx="65" ry="28" fill="#22c55e" stroke="#16a34a" strokeWidth="2"/>
        <text x="410" y="610" textAnchor="middle" fill="white" fontSize="11">General Module</text>
        <text x="410" y="623" textAnchor="middle" fill="white" fontSize="11">Complete</text>
        
        <line x1="155" y1="610" x2="80" y2="610" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowhead3)"/>
        <text x="130" y="600" fill="#ef4444" fontSize="11">No</text>
        <ellipse cx="40" cy="610" rx="35" ry="25" fill="#fca5a5" stroke="#ef4444" strokeWidth="2"/>
        <text x="40" y="617" textAnchor="middle" fill="#7f1d1d" fontSize="11">End</text>
      </svg>
    );
  };

  // Integration Module Flow
  const IntegrationModuleFlow = () => {
    const module = 'integration';
    const steps: StepInfo[] = [
      { module, stepId: 'start', label: 'Start', x: 200, y: 30, width: 100, height: 50 },
      { module, stepId: 'sales-orders', label: 'Sales Orders', x: 200, y: 110, width: 170, height: 50 },
      { module, stepId: 'inventory', label: 'Inventory Update', x: 200, y: 190, width: 210, height: 50 },
      { module, stepId: 'purchase', label: 'Purchase Requests', x: 200, y: 270, width: 230, height: 50 },
      { module, stepId: 'accounting', label: 'Accounting Entries', x: 200, y: 350, width: 230, height: 50 },
      { module, stepId: 'integrated', label: 'Integrated?', x: 200, y: 445, width: 120, height: 80 },
    ];

    return (
      <svg width="400" height="650" className="mx-auto">
        <defs>
          <marker id="arrowhead4" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#ca8a04" />
          </marker>
        </defs>
        
        <ClickableStep step={steps[0]} module={module}>
          <ellipse cx="200" cy="30" rx="50" ry="25" fill="#eab308" stroke="#ca8a04" strokeWidth="2"/>
          <text x="200" y="37" textAnchor="middle" fill="white" fontWeight="bold">Start</text>
        </ClickableStep>
        
        <line x1="200" y1="55" x2="200" y2="85" stroke="#ca8a04" strokeWidth="2" markerEnd="url(#arrowhead4)"/>
        
        <ClickableStep step={steps[1]} module={module}>
          <rect x="115" y="85" width="170" height="50" fill="#fef3c7" stroke="#ca8a04" strokeWidth="2" rx="5"/>
          <text x="200" y="115" textAnchor="middle" fill="#ca8a04" fontSize="13">Sales Orders</text>
        </ClickableStep>
        
        <line x1="200" y1="135" x2="200" y2="165" stroke="#ca8a04" strokeWidth="2" markerEnd="url(#arrowhead4)"/>
        
        <ClickableStep step={steps[2]} module={module}>
          <rect x="95" y="165" width="210" height="50" fill="#fef3c7" stroke="#ca8a04" strokeWidth="2" rx="5"/>
          <text x="200" y="195" textAnchor="middle" fill="#ca8a04" fontSize="13">Inventory Update</text>
        </ClickableStep>
        
        <line x1="200" y1="215" x2="200" y2="245" stroke="#ca8a04" strokeWidth="2" markerEnd="url(#arrowhead4)"/>
        
        <ClickableStep step={steps[3]} module={module}>
          <rect x="85" y="245" width="230" height="50" fill="#fef3c7" stroke="#ca8a04" strokeWidth="2" rx="5"/>
          <text x="200" y="275" textAnchor="middle" fill="#ca8a04" fontSize="13">Purchase Requests</text>
        </ClickableStep>
        
        <line x1="200" y1="295" x2="200" y2="325" stroke="#ca8a04" strokeWidth="2" markerEnd="url(#arrowhead4)"/>
        
        <ClickableStep step={steps[4]} module={module}>
          <rect x="85" y="325" width="230" height="50" fill="#fef3c7" stroke="#ca8a04" strokeWidth="2" rx="5"/>
          <text x="200" y="355" textAnchor="middle" fill="#ca8a04" fontSize="13">Accounting Entries</text>
        </ClickableStep>
        
        <line x1="200" y1="375" x2="200" y2="405" stroke="#ca8a04" strokeWidth="2" markerEnd="url(#arrowhead4)"/>
        
        <ClickableStep step={steps[5]} module={module}>
          <path d="M 200 405 L 260 445 L 200 485 L 140 445 Z" fill="white" stroke="#ca8a04" strokeWidth="2"/>
          <text x="200" y="452" textAnchor="middle" fill="#ca8a04" fontSize="13">Integrated?</text>
        </ClickableStep>
        
        <line x1="260" y1="445" x2="330" y2="445" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowhead4)"/>
        <text x="275" y="435" fill="#22c55e" fontSize="11">Yes</text>
        <ellipse cx="375" cy="445" rx="60" ry="28" fill="#22c55e" stroke="#16a34a" strokeWidth="2"/>
        <text x="375" y="445" textAnchor="middle" fill="white" fontSize="11">Integration</text>
        <text x="375" y="458" textAnchor="middle" fill="white" fontSize="11">Complete</text>
        
        <line x1="140" y1="445" x2="70" y2="445" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowhead4)"/>
        <text x="115" y="435" fill="#ef4444" fontSize="11">No</text>
        <ellipse cx="35" cy="445" rx="35" ry="25" fill="#fca5a5" stroke="#ef4444" strokeWidth="2"/>
        <text x="35" y="452" textAnchor="middle" fill="#7f1d1d" fontSize="11">End</text>
      </svg>
    );
  };

  // Medical Extensions Flow
  const MedicalModuleFlow = () => {
    const module = 'medical';
    const steps: StepInfo[] = [
      { module, stepId: 'start', label: 'Start', x: 200, y: 30, width: 100, height: 50 },
      { module, stepId: 'pharmacy', label: 'Pharmacy Module', x: 200, y: 110, width: 210, height: 50 },
      { module, stepId: 'laboratory', label: 'Laboratory Module', x: 200, y: 190, width: 230, height: 50 },
      { module, stepId: 'radiation', label: 'Radiation Module', x: 200, y: 270, width: 230, height: 50 },
      { module, stepId: 'hr', label: 'HR Module', x: 200, y: 350, width: 170, height: 50 },
      { module, stepId: 'insurance', label: 'Medical Insurance', x: 200, y: 430, width: 240, height: 50 },
      { module, stepId: 'approved', label: 'Approved?', x: 200, y: 525, width: 120, height: 80 },
    ];

    return (
      <svg width="400" height="750" className="mx-auto">
        <defs>
          <marker id="arrowhead5" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#ea580c" />
          </marker>
        </defs>
        
        <ClickableStep step={steps[0]} module={module}>
          <ellipse cx="200" cy="30" rx="50" ry="25" fill="#f97316" stroke="#ea580c" strokeWidth="2"/>
          <text x="200" y="37" textAnchor="middle" fill="white" fontWeight="bold">Start</text>
        </ClickableStep>
        
        <line x1="200" y1="55" x2="200" y2="85" stroke="#ea580c" strokeWidth="2" markerEnd="url(#arrowhead5)"/>
        
        <ClickableStep step={steps[1]} module={module}>
          <rect x="95" y="85" width="210" height="50" fill="#fed7aa" stroke="#ea580c" strokeWidth="2" rx="5"/>
          <text x="200" y="115" textAnchor="middle" fill="#ea580c" fontSize="13">Pharmacy Module</text>
        </ClickableStep>
        
        <line x1="200" y1="135" x2="200" y2="165" stroke="#ea580c" strokeWidth="2" markerEnd="url(#arrowhead5)"/>
        
        <ClickableStep step={steps[2]} module={module}>
          <rect x="85" y="165" width="230" height="50" fill="#fed7aa" stroke="#ea580c" strokeWidth="2" rx="5"/>
          <text x="200" y="195" textAnchor="middle" fill="#ea580c" fontSize="13">Laboratory Module</text>
        </ClickableStep>
        
        <line x1="200" y1="215" x2="200" y2="245" stroke="#ea580c" strokeWidth="2" markerEnd="url(#arrowhead5)"/>
        
        <ClickableStep step={steps[3]} module={module}>
          <rect x="85" y="245" width="230" height="50" fill="#fed7aa" stroke="#ea580c" strokeWidth="2" rx="5"/>
          <text x="200" y="275" textAnchor="middle" fill="#ea580c" fontSize="13">Radiation Module</text>
        </ClickableStep>
        
        <line x1="200" y1="295" x2="200" y2="325" stroke="#ea580c" strokeWidth="2" markerEnd="url(#arrowhead5)"/>
        
        <ClickableStep step={steps[4]} module={module}>
          <rect x="115" y="325" width="170" height="50" fill="#fed7aa" stroke="#ea580c" strokeWidth="2" rx="5"/>
          <text x="200" y="355" textAnchor="middle" fill="#ea580c" fontSize="13">HR Module</text>
        </ClickableStep>
        
        <line x1="200" y1="375" x2="200" y2="405" stroke="#ea580c" strokeWidth="2" markerEnd="url(#arrowhead5)"/>
        
        <ClickableStep step={steps[5]} module={module}>
          <rect x="80" y="405" width="240" height="50" fill="#fed7aa" stroke="#ea580c" strokeWidth="2" rx="5"/>
          <text x="200" y="435" textAnchor="middle" fill="#ea580c" fontSize="13">Medical Insurance</text>
        </ClickableStep>
        
        <line x1="200" y1="455" x2="200" y2="485" stroke="#ea580c" strokeWidth="2" markerEnd="url(#arrowhead5)"/>
        
        <ClickableStep step={steps[6]} module={module}>
          <path d="M 200 485 L 260 525 L 200 565 L 140 525 Z" fill="white" stroke="#ea580c" strokeWidth="2"/>
          <text x="200" y="532" textAnchor="middle" fill="#ea580c" fontSize="13">Approved?</text>
        </ClickableStep>
        
        <line x1="260" y1="525" x2="320" y2="525" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowhead5)"/>
        <text x="275" y="515" fill="#22c55e" fontSize="11">Yes</text>
        <ellipse cx="365" cy="525" rx="60" ry="28" fill="#22c55e" stroke="#16a34a" strokeWidth="2"/>
        <text x="365" y="525" textAnchor="middle" fill="white" fontSize="10">Medical Modules</text>
        <text x="365" y="538" textAnchor="middle" fill="white" fontSize="10">Complete</text>
        
        <line x1="140" y1="525" x2="70" y2="525" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowhead5)"/>
        <text x="115" y="515" fill="#ef4444" fontSize="11">No</text>
        <ellipse cx="35" cy="525" rx="35" ry="25" fill="#fca5a5" stroke="#ef4444" strokeWidth="2"/>
        <text x="35" y="532" textAnchor="middle" fill="#7f1d1d" fontSize="11">End</text>
      </svg>
    );
  };

  // Chatbot Flow
  const ChatbotFlow = () => {
    const module = 'chatbot';
    const steps: StepInfo[] = [
      { module, stepId: 'start', label: 'Start', x: 200, y: 30, width: 100, height: 50 },
      { module, stepId: 'appointment-booking', label: 'Appointment Booking', x: 200, y: 110, width: 260, height: 50 },
      { module, stepId: 'patient-faq', label: 'Patient FAQ', x: 200, y: 190, width: 190, height: 50 },
      { module, stepId: 'payment-assistance', label: 'Payment Assistance', x: 200, y: 270, width: 260, height: 50 },
      { module, stepId: 'admin-notifications', label: 'Admin Notifications', x: 200, y: 350, width: 260, height: 50 },
      { module, stepId: 'chatbot-live', label: 'Chatbot Live', x: 200, y: 435, width: 140, height: 60 },
    ];

    return (
      <svg width="400" height="550" className="mx-auto">
        <defs>
          <marker id="arrowhead6" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#7c3aed" />
          </marker>
        </defs>
        
        <ClickableStep step={steps[0]} module={module}>
          <ellipse cx="200" cy="30" rx="50" ry="25" fill="#a855f7" stroke="#7c3aed" strokeWidth="2"/>
          <text x="200" y="37" textAnchor="middle" fill="white" fontWeight="bold">Start</text>
        </ClickableStep>
        
        <line x1="200" y1="55" x2="200" y2="85" stroke="#7c3aed" strokeWidth="2" markerEnd="url(#arrowhead6)"/>
        
        <ClickableStep step={steps[1]} module={module}>
          <rect x="70" y="85" width="260" height="50" fill="#e9d5ff" stroke="#7c3aed" strokeWidth="2" rx="5"/>
          <text x="200" y="115" textAnchor="middle" fill="#7c3aed" fontSize="13">Appointment Booking</text>
        </ClickableStep>
        
        <line x1="200" y1="135" x2="200" y2="165" stroke="#7c3aed" strokeWidth="2" markerEnd="url(#arrowhead6)"/>
        
        <ClickableStep step={steps[2]} module={module}>
          <rect x="105" y="165" width="190" height="50" fill="#e9d5ff" stroke="#7c3aed" strokeWidth="2" rx="5"/>
          <text x="200" y="195" textAnchor="middle" fill="#7c3aed" fontSize="13">Patient FAQ</text>
        </ClickableStep>
        
        <line x1="200" y1="215" x2="200" y2="245" stroke="#7c3aed" strokeWidth="2" markerEnd="url(#arrowhead6)"/>
        
        <ClickableStep step={steps[3]} module={module}>
          <rect x="70" y="245" width="260" height="50" fill="#e9d5ff" stroke="#7c3aed" strokeWidth="2" rx="5"/>
          <text x="200" y="275" textAnchor="middle" fill="#7c3aed" fontSize="13">Payment Assistance</text>
        </ClickableStep>
        
        <line x1="200" y1="295" x2="200" y2="325" stroke="#7c3aed" strokeWidth="2" markerEnd="url(#arrowhead6)"/>
        
        <ClickableStep step={steps[4]} module={module}>
          <rect x="70" y="325" width="260" height="50" fill="#e9d5ff" stroke="#7c3aed" strokeWidth="2" rx="5"/>
          <text x="200" y="355" textAnchor="middle" fill="#7c3aed" fontSize="13">Admin Notifications</text>
        </ClickableStep>
        
        <line x1="200" y1="375" x2="200" y2="405" stroke="#7c3aed" strokeWidth="2" markerEnd="url(#arrowhead6)"/>
        
        <ClickableStep step={steps[5]} module={module}>
          <ellipse cx="200" cy="435" rx="70" ry="30" fill="#22c55e" stroke="#16a34a" strokeWidth="2"/>
          <text x="200" y="442" textAnchor="middle" fill="white" fontWeight="bold">Chatbot Live</text>
        </ClickableStep>
      </svg>
    );
  };

  // Customization Flow
  const CustomizationFlow = () => {
    const module = 'customization';
    const steps: StepInfo[] = [
      { module, stepId: 'start', label: 'Start', x: 225, y: 30, width: 100, height: 50 },
      { module, stepId: 'branding', label: 'Branding', x: 225, y: 110, width: 160, height: 50 },
      { module, stepId: 'custom-reports', label: 'Custom Reports', x: 225, y: 190, width: 220, height: 50 },
      { module, stepId: 'workflow-adjustments', label: 'Workflow Adjustments', x: 225, y: 270, width: 280, height: 50 },
      { module, stepId: 'client-approved', label: 'Client Approved?', x: 225, y: 370, width: 140, height: 90 },
    ];

    return (
      <svg width="450" height="550" className="mx-auto">
        <defs>
          <marker id="arrowhead7" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#dc2626" />
          </marker>
        </defs>
        
        <ClickableStep step={steps[0]} module={module}>
          <ellipse cx="225" cy="30" rx="50" ry="25" fill="#ef4444" stroke="#dc2626" strokeWidth="2"/>
          <text x="225" y="37" textAnchor="middle" fill="white" fontWeight="bold">Start</text>
        </ClickableStep>
        
        <line x1="225" y1="55" x2="225" y2="85" stroke="#dc2626" strokeWidth="2" markerEnd="url(#arrowhead7)"/>
        
        <ClickableStep step={steps[1]} module={module}>
          <rect x="145" y="85" width="160" height="50" fill="#fecaca" stroke="#dc2626" strokeWidth="2" rx="5"/>
          <text x="225" y="115" textAnchor="middle" fill="#dc2626" fontSize="13">Branding</text>
        </ClickableStep>
        
        <line x1="225" y1="135" x2="225" y2="165" stroke="#dc2626" strokeWidth="2" markerEnd="url(#arrowhead7)"/>
        
        <ClickableStep step={steps[2]} module={module}>
          <rect x="115" y="165" width="220" height="50" fill="#fecaca" stroke="#dc2626" strokeWidth="2" rx="5"/>
          <text x="225" y="195" textAnchor="middle" fill="#dc2626" fontSize="13">Custom Reports</text>
        </ClickableStep>
        
        <line x1="225" y1="215" x2="225" y2="245" stroke="#dc2626" strokeWidth="2" markerEnd="url(#arrowhead7)"/>
        
        <ClickableStep step={steps[3]} module={module}>
          <rect x="85" y="245" width="280" height="50" fill="#fecaca" stroke="#dc2626" strokeWidth="2" rx="5"/>
          <text x="225" y="275" textAnchor="middle" fill="#dc2626" fontSize="13">Workflow Adjustments</text>
        </ClickableStep>
        
        <line x1="225" y1="295" x2="225" y2="325" stroke="#dc2626" strokeWidth="2" markerEnd="url(#arrowhead7)"/>
        
        <ClickableStep step={steps[4]} module={module}>
          <path d="M 225 325 L 295 370 L 225 415 L 155 370 Z" fill="white" stroke="#dc2626" strokeWidth="2"/>
          <text x="225" y="375" textAnchor="middle" fill="#dc2626" fontSize="13">Client</text>
          <text x="225" y="390" textAnchor="middle" fill="#dc2626" fontSize="13">Approved?</text>
        </ClickableStep>
        
        <line x1="295" y1="370" x2="355" y2="370" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowhead7)"/>
        <text x="310" y="360" fill="#22c55e" fontSize="11">Yes</text>
        <ellipse cx="400" cy="370" rx="50" ry="28" fill="#22c55e" stroke="#16a34a" strokeWidth="2"/>
        <text x="400" y="377" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">Go Live</text>
        
        <line x1="155" y1="370" x2="85" y2="370" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowhead7)"/>
        <text x="130" y="360" fill="#ef4444" fontSize="11">No</text>
        <ellipse cx="45" cy="370" rx="40" ry="25" fill="#fca5a5" stroke="#ef4444" strokeWidth="2"/>
        <text x="45" y="377" textAnchor="middle" fill="#7f1d1d" fontSize="11">End</text>
      </svg>
    );
  };

  // Helper component for draggable sub-rectangles
  const DraggableSubRect = ({ 
    subRect, 
    stepKey, 
    onEdit, 
    onDelete 
  }: { 
    subRect: SubRectangle; 
    stepKey: string; 
    onEdit: () => void;
    onDelete: () => void;
  }) => {
    const subData = getSubRectData(stepKey, subRect.id);
    const hasData = subData.deadline || subData.notes;
    const overdue = subData.deadline && isOverdue(subData.deadline);
    
    return (
      <g>
        {/* Sub-rectangle */}
        <g
          onMouseDown={(e) => handleSubRectDragStart(e, stepKey, subRect.id, subRect.x, subRect.y)}
          style={{ cursor: 'move' }}
        >
          <rect
            x={subRect.x}
            y={subRect.y}
            width="160"
            height="50"
            fill={hasData ? (overdue ? "#fee2e2" : "#fef3c7") : "#e0e7ff"}
            stroke={overdue ? "#ef4444" : "#6366f1"}
            strokeWidth="2"
            rx="6"
            className="hover:opacity-80 transition-opacity"
          />
          <text
            x={subRect.x + 80}
            y={subRect.y + 20}
            textAnchor="middle"
            fill={overdue ? "#991b1b" : "#1e40af"}
            fontSize="11"
            fontWeight="600"
          >
            {subRect.label}
          </text>
          {hasData && (
            <text
              x={subRect.x + 80}
              y={subRect.y + 35}
              textAnchor="middle"
              fill={overdue ? "#dc2626" : "#059669"}
              fontSize="9"
            >
              {subData.deadline ? `📅 ${new Date(subData.deadline).toLocaleDateString()}` : '📝'}
            </text>
          )}
        </g>
        
        {/* Badge indicator - clickable for editing */}
        {hasData && (
          <foreignObject x={subRect.x + 140} y={subRect.y - 8} width="20" height="20">
            <div
              className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center cursor-pointer ${
                overdue
                  ? 'bg-red-500 text-white animate-pulse'
                  : subData.deadline
                  ? 'bg-yellow-400 text-gray-800'
                  : 'bg-blue-400 text-white'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              {subData.deadline ? '📅' : '📝'}
            </div>
          </foreignObject>
        )}
        
        {/* Clickable area for editing - double click to edit */}
        <rect
          x={subRect.x}
          y={subRect.y}
          width="160"
          height="50"
          fill="transparent"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="cursor-pointer"
        />
        
        {/* Delete button */}
        <foreignObject x={subRect.x + 130} y={subRect.y + 5} width="25" height="20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="w-full h-full bg-red-500 text-white rounded text-xs hover:bg-red-600"
            title="Delete"
          >
            ×
          </button>
        </foreignObject>
      </g>
    );
  };

  // Flutter App Flow - Redesigned
  const FlutterAppFlow = () => {
    const module = 'flutter';
    void stepData; // Ensure re-render on data change
    
    // Center all shapes - SVG width is 1400, center is at 700
    const centerX = 700;
    const steps: StepInfo[] = [
      { module, stepId: 'ui-ux', label: 'UI/UX', x: centerX - 80, y: 80, width: 160, height: 70 },
      { module, stepId: 'figma', label: 'Figma Design', x: centerX - 80, y: 200, width: 160, height: 70 },
      { module, stepId: 'client-review', label: 'Client Review', x: centerX - 80, y: 320, width: 160, height: 70 },
      { module, stepId: 'flutter-screens', label: 'Flutter Creating Screens', x: centerX - 90, y: 480, width: 180, height: 80 },
      { module, stepId: 'backend-apis', label: 'Backend APIs', x: centerX - 90, y: 620, width: 180, height: 80 },
      { module, stepId: 'erd', label: 'ERD Database', x: centerX - 80, y: 760, width: 160, height: 70 },
      { module, stepId: 'collab', label: 'Frontend & Backend Collab', x: centerX - 100, y: 880, width: 200, height: 70 },
      { module, stepId: 'decision', label: 'If okay?', x: centerX - 60, y: 1000, width: 120, height: 80 },
      { module, stepId: 'version1', label: 'Version 1', x: centerX - 80, y: 1120, width: 160, height: 70 }
    ];

    const flutterScreensKey = getStepKey(module, 'flutter-screens');
    const backendApisKey = getStepKey(module, 'backend-apis');
    const flutterSubRects = getSubRectangles(flutterScreensKey);
    const backendSubRects = getSubRectangles(backendApisKey);
    
    // Initialize default positions for new sub-rectangles if needed
    useEffect(() => {
      const mainStep = steps.find(s => getStepKey(s.module, s.stepId) === flutterScreensKey);
      if (mainStep && flutterSubRects.length > 0) {
        const needsInit = flutterSubRects.some(sr => sr.x === 0 && sr.y === 0);
        if (needsInit) {
          setSubRectangles(prev => {
            const updated = prev[flutterScreensKey]?.map((sr, idx) => 
              (sr.x === 0 && sr.y === 0) 
                ? { ...sr, x: mainStep.x + (mainStep.width || 180) + 30, y: mainStep.y + (idx * 90) }
                : sr
            ) || [];
            return { ...prev, [flutterScreensKey]: updated };
          });
        }
      }
      
      const backendStep = steps.find(s => getStepKey(s.module, s.stepId) === backendApisKey);
      if (backendStep && backendSubRects.length > 0) {
        const needsInit = backendSubRects.some(sr => sr.x === 0 && sr.y === 0);
        if (needsInit) {
          setSubRectangles(prev => {
            const updated = prev[backendApisKey]?.map((sr, idx) => 
              (sr.x === 0 && sr.y === 0) 
                ? { ...sr, x: backendStep.x + (backendStep.width || 180) + 30, y: backendStep.y + (idx * 90) }
                : sr
            ) || [];
            return { ...prev, [backendApisKey]: updated };
          });
        }
      }
    }, [flutterSubRects.length, backendSubRects.length]);
    
    const maxHeight = Math.max(1200, 1120 + (Math.max(flutterSubRects.length, backendSubRects.length) * 100));
    
    return (
      <svg 
        width="1400" 
        height={maxHeight} 
        className="mx-auto" 
        viewBox={`0 0 1400 ${maxHeight}`} 
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleSubRectDrag}
        onMouseUp={handleSubRectDragEnd}
        onMouseLeave={handleSubRectDragEnd}
      >
        <defs>
          <marker id="arrowhead-flutter" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#6366f1" />
          </marker>
          <linearGradient id="mainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="1" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="1" />
          </linearGradient>
          <filter id="shadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx="2" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* UI/UX - Start */}
        <ClickableStep step={steps[0]} module={module}>
          <ellipse cx={steps[0].x + steps[0].width! / 2} cy={steps[0].y} rx={steps[0].width! / 2} ry="25" fill="url(#mainGradient)" stroke="#4f46e5" strokeWidth="2.5" filter="url(#shadow)"/>
          <text x={steps[0].x + steps[0].width! / 2} y={steps[0].y + 5} textAnchor="middle" fill="white" fontWeight="bold" fontSize="15">UI/UX</text>
        </ClickableStep>

        {/* Arrow */}
        <line x1={steps[0].x + steps[0].width! / 2} y1={steps[0].y + 25} x2={steps[0].x + steps[0].width! / 2} y2={steps[1].y - 35} stroke="#6366f1" strokeWidth="3" markerEnd="url(#arrowhead-flutter)"/>

        {/* Figma Design */}
        <ClickableStep step={steps[1]} module={module}>
          <rect x={steps[1].x} y={steps[1].y - 35} width={steps[1].width} height={steps[1].height} fill="#e0e7ff" stroke="#6366f1" strokeWidth="2.5" rx="8" filter="url(#shadow)"/>
          <text x={steps[1].x + steps[1].width! / 2} y={steps[1].y + 5} textAnchor="middle" fill="#1e40af" fontWeight="bold" fontSize="14">Figma Design</text>
        </ClickableStep>

        {/* Arrow */}
        <line x1={steps[1].x + steps[1].width! / 2} y1={steps[1].y + 35} x2={steps[1].x + steps[1].width! / 2} y2={steps[2].y - 35} stroke="#6366f1" strokeWidth="3" markerEnd="url(#arrowhead-flutter)"/>

        {/* Client Review */}
        <ClickableStep step={steps[2]} module={module}>
          <rect x={steps[2].x} y={steps[2].y - 35} width={steps[2].width} height={steps[2].height} fill="#e0e7ff" stroke="#6366f1" strokeWidth="2.5" rx="8" filter="url(#shadow)"/>
          <text x={steps[2].x + steps[2].width! / 2} y={steps[2].y + 5} textAnchor="middle" fill="#1e40af" fontWeight="bold" fontSize="14">Client Review</text>
        </ClickableStep>

        {/* Loop from Client Review back to Figma Design */}
        <path
          d={`M ${steps[2].x + steps[2].width!} ${steps[2].y} 
              Q ${steps[2].x + steps[2].width! + 100} ${steps[2].y - 60} 
                ${steps[1].x + steps[1].width!} ${steps[1].y}`}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.5"
          markerEnd="url(#arrowhead-flutter)"
        />
        <text 
          x={steps[2].x + steps[2].width! + 50} 
          y={steps[2].y - 40} 
          fill="#f59e0b" 
          fontSize="12" 
          fontWeight="600"
        >
          Revisions
        </text>
        
        {/* Loop from Figma Design to Client Review (feedback) */}
        <path
          d={`M ${steps[1].x + steps[1].width!} ${steps[1].y} 
              Q ${steps[1].x + steps[1].width! + 100} ${steps[1].y + 60} 
                ${steps[2].x + steps[2].width!} ${steps[2].y}`}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.5"
          markerEnd="url(#arrowhead-flutter)"
        />
        <text 
          x={steps[1].x + steps[1].width! + 50} 
          y={steps[1].y + 40} 
          fill="#f59e0b" 
          fontSize="12" 
          fontWeight="600"
        >
          Feedback
        </text>

        {/* Arrow */}
        <line x1={steps[2].x + steps[2].width! / 2} y1={steps[2].y + 35} x2={steps[2].x + steps[2].width! / 2} y2={steps[3].y - 40} stroke="#6366f1" strokeWidth="3" markerEnd="url(#arrowhead-flutter)"/>

        {/* Flutter Creating Screens - Main Rectangle */}
        <ClickableStep step={steps[3]} module={module}>
          <rect x={steps[3].x} y={steps[3].y - 40} width={steps[3].width} height={steps[3].height} fill="#e0e7ff" stroke="#6366f1" strokeWidth="2.5" rx="8" filter="url(#shadow)"/>
          <text x={steps[3].x + steps[3].width! / 2} y={steps[3].y - 5} textAnchor="middle" fill="#1e40af" fontWeight="bold" fontSize="13">Flutter Creating</text>
          <text x={steps[3].x + steps[3].width! / 2} y={steps[3].y + 15} textAnchor="middle" fill="#1e40af" fontWeight="bold" fontSize="13">Screens</text>
        </ClickableStep>
        
        {/* Sub-rectangles positioned next to main rectangle */}
        {flutterSubRects.map((subRect, index) => (
          <g key={subRect.id}>
            <DraggableSubRect
              subRect={subRect}
              stepKey={flutterScreensKey}
              onEdit={() => handleAddSubRect(flutterScreensKey, subRect)}
              onDelete={() => handleDeleteSubRect(flutterScreensKey, subRect.id)}
            />
            {/* Arrow to next sub-rectangle */}
            {index < flutterSubRects.length - 1 && (
              <line
                x1={subRect.x + 80}
                y1={subRect.y + 50}
                x2={flutterSubRects[index + 1].x + 80}
                y2={flutterSubRects[index + 1].y}
                stroke="#6366f1"
                strokeWidth="2"
                markerEnd="url(#arrowhead-flutter)"
              />
            )}
          </g>
        ))}
        
        {/* Arrow */}
        <line x1={steps[3].x + steps[3].width! / 2} y1={steps[3].y + 40} x2={steps[3].x + steps[3].width! / 2} y2={steps[4].y - 40} stroke="#6366f1" strokeWidth="3" markerEnd="url(#arrowhead-flutter)"/>

        {/* Backend APIs - Main Rectangle */}
        <ClickableStep step={steps[4]} module={module}>
          <rect x={steps[4].x} y={steps[4].y - 40} width={steps[4].width} height={steps[4].height} fill="#e0e7ff" stroke="#6366f1" strokeWidth="2.5" rx="8" filter="url(#shadow)"/>
          <text x={steps[4].x + steps[4].width! / 2} y={steps[4].y - 5} textAnchor="middle" fill="#1e40af" fontWeight="bold" fontSize="13">Backend APIs</text>
          <text x={steps[4].x + steps[4].width! / 2} y={steps[4].y + 15} textAnchor="middle" fill="#1e40af" fontWeight="bold" fontSize="13">and Connecting</text>
        </ClickableStep>
        
        {/* Sub-rectangles positioned next to main rectangle */}
        {backendSubRects.map((subRect, index) => (
          <g key={subRect.id}>
            <DraggableSubRect
              subRect={subRect}
              stepKey={backendApisKey}
              onEdit={() => handleAddSubRect(backendApisKey, subRect)}
              onDelete={() => handleDeleteSubRect(backendApisKey, subRect.id)}
            />
            {/* Arrow to next sub-rectangle */}
            {index < backendSubRects.length - 1 && (
              <line
                x1={subRect.x + 80}
                y1={subRect.y + 50}
                x2={backendSubRects[index + 1].x + 80}
                y2={backendSubRects[index + 1].y}
                stroke="#6366f1"
                strokeWidth="2"
                markerEnd="url(#arrowhead-flutter)"
              />
            )}
          </g>
        ))}
        
        {/* Arrow */}
        <line x1={steps[4].x + steps[4].width! / 2} y1={steps[4].y + 40} x2={steps[4].x + steps[4].width! / 2} y2={steps[5].y - 35} stroke="#6366f1" strokeWidth="3" markerEnd="url(#arrowhead-flutter)"/>

        {/* ERD Database */}
        <ClickableStep step={steps[5]} module={module}>
          <rect x={steps[5].x} y={steps[5].y - 35} width={steps[5].width} height={steps[5].height} fill="#e0e7ff" stroke="#6366f1" strokeWidth="2.5" rx="8" filter="url(#shadow)"/>
          <text x={steps[5].x + steps[5].width! / 2} y={steps[5].y + 5} textAnchor="middle" fill="#1e40af" fontWeight="bold" fontSize="14">ERD Database</text>
        </ClickableStep>

        {/* Arrow */}
        <line x1={steps[5].x + steps[5].width! / 2} y1={steps[5].y + 35} x2={steps[5].x + steps[5].width! / 2} y2={steps[6].y - 35} stroke="#6366f1" strokeWidth="3" markerEnd="url(#arrowhead-flutter)"/>

        {/* Frontend and Backend Collab */}
        <ClickableStep step={steps[6]} module={module}>
          <rect x={steps[6].x} y={steps[6].y - 35} width={steps[6].width} height={steps[6].height} fill="#e0e7ff" stroke="#6366f1" strokeWidth="2.5" rx="8" filter="url(#shadow)"/>
          <text x={steps[6].x + steps[6].width! / 2} y={steps[6].y - 5} textAnchor="middle" fill="#1e40af" fontWeight="bold" fontSize="13">Frontend & Backend</text>
          <text x={steps[6].x + steps[6].width! / 2} y={steps[6].y + 15} textAnchor="middle" fill="#1e40af" fontWeight="bold" fontSize="13">Collab</text>
        </ClickableStep>

        {/* Arrow */}
        <line x1={steps[6].x + steps[6].width! / 2} y1={steps[6].y + 35} x2={steps[6].x + steps[6].width! / 2} y2={steps[7].y - 40} stroke="#6366f1" strokeWidth="3" markerEnd="url(#arrowhead-flutter)"/>

        {/* Decision: If okay? */}
        <ClickableStep step={steps[7]} module={module}>
          <path d={`M ${steps[7].x + steps[7].width! / 2} ${steps[7].y - 40} L ${steps[7].x + steps[7].width!} ${steps[7].y} L ${steps[7].x + steps[7].width! / 2} ${steps[7].y + 40} L ${steps[7].x} ${steps[7].y} Z`} fill="white" stroke="#6366f1" strokeWidth="2.5" filter="url(#shadow)"/>
          <text x={steps[7].x + steps[7].width! / 2} y={steps[7].y - 5} textAnchor="middle" fill="#1e40af" fontSize="14" fontWeight="bold">If okay?</text>
        </ClickableStep>

        {/* Yes path */}
        <line x1={steps[7].x + steps[7].width! / 2} y1={steps[7].y + 40} x2={steps[7].x + steps[7].width! / 2} y2={steps[8].y - 35} stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrowhead-flutter)"/>
        <text x={steps[7].x + steps[7].width! / 2 + 20} y={steps[7].y + 60} fill="#22c55e" fontSize="13" fontWeight="bold">Yes</text>

        {/* Version 1 */}
        <ClickableStep step={steps[8]} module={module}>
          <ellipse cx={steps[8].x + steps[8].width! / 2} cy={steps[8].y} rx={steps[8].width! / 2} ry="25" fill="#22c55e" stroke="#16a34a" strokeWidth="2.5" filter="url(#shadow)"/>
          <text x={steps[8].x + steps[8].width! / 2} y={steps[8].y + 7} textAnchor="middle" fill="white" fontWeight="bold" fontSize="15">Version 1</text>
        </ClickableStep>

        {/* No path */}
        <line x1={steps[7].x} y1={steps[7].y} x2={centerX - 250} y2={steps[7].y} stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrowhead-flutter)"/>
        <text x={centerX - 200} y={steps[7].y - 10} fill="#ef4444" fontSize="13" fontWeight="bold">No</text>
        <ellipse cx={centerX - 250} cy={steps[7].y} rx="60" ry="25" fill="#fee2e2" stroke="#ef4444" strokeWidth="2.5" filter="url(#shadow)"/>
        <text x={centerX - 250} y={steps[7].y + 7} textAnchor="middle" fill="#991b1b" fontSize="12" fontWeight="bold">Fix Issues</text>
      </svg>
    );
  };

  const modules = [
    { id: 'main', name: '🏥 Main Workflow', component: MainFlow },
    { id: 'base', name: '1️⃣ Base Module', component: BaseModuleFlow },
    { id: 'general', name: '2️⃣ General Module', component: GeneralModuleFlow },
    { id: 'integration', name: '3️⃣ System Integration', component: IntegrationModuleFlow },
    { id: 'medical', name: '4️⃣ Medical Extensions', component: MedicalModuleFlow },
    { id: 'chatbot', name: '5️⃣ Chatbot Upgrade', component: ChatbotFlow },
    { id: 'customization', name: '6️⃣ Clinic Customization', component: CustomizationFlow },
    { id: 'flutter', name: '📱 Flutter App', component: FlutterAppFlow }
  ];

  const CurrentFlow = modules.find(m => m.id === selectedModule)?.component || MainFlow;
  const currentData = editingStep ? getStepData(editingStep.module, editingStep.stepId) : null;
  const isOverdueDeadline = editingStep && currentData?.deadline ? isOverdue(currentData.deadline) : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
            🏥 Odoo Clinic Management System
          </h1>
          <p className="text-gray-600 text-center mb-6">Complete Workflow Diagram</p>
          <p className="text-xs text-green-600 text-center mb-4">✓ Your deadlines and notes are automatically saved</p>
          
          {/* Module Navigation */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {modules.map(module => (
              <button
                key={module.id}
                onClick={() => setSelectedModule(module.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedModule === module.id
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {module.name}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">📋 Flowchart Legend:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div className="flex items-center gap-2">
                <div className="w-12 h-6 bg-blue-500 rounded-full border-2 border-blue-700"></div>
                <span>Oval = Start/End</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-6 bg-blue-100 border-2 border-blue-700 rounded"></div>
                <span>Rectangle = Process</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white border-2 border-blue-700 transform rotate-45"></div>
                <span className="ml-2">Diamond = Decision</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <div className="w-8 h-0.5 bg-blue-700"></div>
                  <div className="w-0 h-0 border-l-8 border-l-blue-700 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
                </div>
                <span>Arrow = Flow</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-300">
              <p className="text-xs text-gray-600 mb-2"><strong>💡 Tip:</strong> Click on any step in the flowchart to add deadlines or notes. Look for badges (📅 or 📝) on steps with information.</p>
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">📅</div>
                  <span>Has deadline</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">📅</div>
                  <span>Overdue deadline</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center">📝</div>
                  <span>Has notes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Flowchart Display */}
        <div className="bg-white rounded-lg shadow-xl p-6 overflow-x-auto relative">
          <CurrentFlow key={`flow-${selectedModule}-${JSON.stringify(stepData)}`} />
        </div>

        {/* Edit Modal */}
        {editingStep && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Edit: {editingStep.label}
              </h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📅 Deadline
                </label>
                <input
                  type="date"
                  value={deadlineInput}
                  onChange={(e) => setDeadlineInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {isOverdueDeadline && (
                  <p className="text-red-600 text-sm mt-1">⚠️ This deadline has passed!</p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📝 Notes
                </label>
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add notes about this step..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
                {currentData && (currentData.deadline || currentData.notes) && (
                  <button
                    onClick={handleDelete}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingStep(null);
                    setDeadlineInput('');
                    setNotesInput('');
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sub-Rectangle Modal */}
        {editingSubRect && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {editingSubRect.subRect ? 'Edit' : 'Add'} Sub-Item
              </h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Label
                </label>
                <input
                  type="text"
                  value={subRectLabel}
                  onChange={(e) => setSubRectLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter sub-item label..."
                  autoFocus
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📅 Deadline
                </label>
                <input
                  type="date"
                  value={subRectDeadline}
                  onChange={(e) => setSubRectDeadline(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📝 Notes
                </label>
                <textarea
                  value={subRectNotes}
                  onChange={(e) => setSubRectNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Add notes about this sub-item..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveSubRect}
                  disabled={!subRectLabel.trim()}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                {editingSubRect.subRect && (
                  <button
                    onClick={() => {
                      if (editingSubRect.subRect) {
                        handleDeleteSubRect(editingSubRect.stepKey, editingSubRect.subRect.id);
                      }
                      setEditingSubRect(null);
                      setSubRectLabel('');
                      setSubRectDeadline('');
                      setSubRectNotes('');
                    }}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingSubRect(null);
                    setSubRectLabel('');
                    setSubRectDeadline('');
                    setSubRectNotes('');
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Download Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <strong>💡 Tip:</strong> Right-click on the diagram and select "Save as Image" to download for your presentation. 
            You can also take a screenshot or print directly from your browser.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FlowchartDiagram;
