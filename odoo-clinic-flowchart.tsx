import React, { useState, useEffect } from 'react';

interface StepData {
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
  const [editingStep, setEditingStep] = useState<StepInfo | null>(null);
  const [deadlineInput, setDeadlineInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  // Load data from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('workflowStepData');
    if (saved) {
      setStepData(JSON.parse(saved));
    }
  }, []);

  // Save data to localStorage whenever stepData changes
  useEffect(() => {
    try {
      const dataToSave = JSON.stringify(stepData);
      localStorage.setItem('workflowStepData', dataToSave);
      console.log('StepData updated, saved to localStorage:', stepData);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, [stepData]);

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

  const getStepData = (module: string, stepId: string): StepData => {
    const key = getStepKey(module, stepId);
    return stepData[key] || {};
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

  // Helper component to display notes on the workflow - INSIDE the shape
  const NotesDisplay = ({ step, module }: { step: StepInfo; module: string }) => {
    const data = getStepData(module, step.stepId);
    if (!data.notes) return null;

    // Calculate position INSIDE the shape
    const stepHeight = step.height || 60;
    const stepWidth = step.width || 180;
    
    // Position notes at the bottom of the shape, below the main label
    // Main label is typically at step.y (center), so notes go below center
    const noteY = step.y + 8; // Below center, inside the shape
    const maxCharsPerLine = Math.floor((stepWidth - 20) / 6); // Approximate chars per line based on width
    const maxLines = 2; // Max 2 lines to fit inside
    
    // Split notes into lines
    const lines: string[] = [];
    const words = data.notes.split(' ');
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + word).length <= maxCharsPerLine) {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);
    
    const displayLines = lines.slice(0, maxLines);
    const hasMore = lines.length > maxLines;
    const lineHeight = 10;

    return (
      <g>
        {/* Notes text - displayed INSIDE the shape at the bottom */}
        {displayLines.map((line, index) => (
          <text
            key={index}
            x={step.x}
            y={noteY + (index * lineHeight)}
            textAnchor="middle"
            fill="#92400e"
            fontSize="9"
            fontWeight="500"
            className="cursor-pointer"
            onClick={() => handleStepClick(step)}
            style={{ pointerEvents: 'all' }}
          >
            {index === 0 ? '📝 ' : ''}{line.length > maxCharsPerLine ? line.substring(0, maxCharsPerLine - 3) + '...' : line}
          </text>
        ))}
        {hasMore && (
          <text
            x={step.x}
            y={noteY + displayLines.length * lineHeight}
            textAnchor="middle"
            fill="#92400e"
            fontSize="8"
            fontStyle="italic"
            className="cursor-pointer"
            onClick={() => handleStepClick(step)}
          >
            ...more
          </text>
        )}
      </g>
    );
  };

  // Helper component to display deadline on the workflow - INSIDE the shape
  const DeadlineDisplay = ({ step, module }: { step: StepInfo; module: string }) => {
    const data = getStepData(module, step.stepId);
    if (!data.deadline) return null;

    const overdue = isOverdue(data.deadline);
    const deadlineDate = new Date(data.deadline);
    const formattedDate = deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Calculate position INSIDE the shape - at the top, above the main label
    // Main label is typically at step.y (center), so deadline goes above center
    const deadlineY = step.y - 12; // Above center, inside the shape

    return (
      <g>
        {/* Deadline text - displayed INSIDE the shape at the top */}
        <text
          x={step.x}
          y={deadlineY}
          textAnchor="middle"
          fill={overdue ? "#991b1b" : "#92400e"}
          fontSize="9"
          fontWeight="600"
          className="cursor-pointer"
          onClick={() => handleStepClick(step)}
          style={{ pointerEvents: 'all' }}
        >
          📅 {overdue ? '⚠️ ' : ''}{formattedDate}
        </text>
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
    module: string;
  }) => {
    return (
      <g>
        {children}
        <StepBadge step={step} module={module} />
        <DeadlineDisplay step={step} module={module} />
        <NotesDisplay step={step} module={module} />
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
    return (
      <svg width="800" height="1100" className="mx-auto">
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

  const modules = [
    { id: 'main', name: '🏥 Main Workflow', component: MainFlow },
    { id: 'base', name: '1️⃣ Base Module', component: BaseModuleFlow },
    { id: 'general', name: '2️⃣ General Module', component: GeneralModuleFlow },
    { id: 'integration', name: '3️⃣ System Integration', component: IntegrationModuleFlow },
    { id: 'medical', name: '4️⃣ Medical Extensions', component: MedicalModuleFlow },
    { id: 'chatbot', name: '5️⃣ Chatbot Upgrade', component: ChatbotFlow },
    { id: 'customization', name: '6️⃣ Clinic Customization', component: CustomizationFlow }
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
        <div className="bg-white rounded-lg shadow-xl p-6 overflow-x-auto relative" key={`flow-container-${selectedModule}-${Object.keys(stepData).length}`}>
          <CurrentFlow />
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
