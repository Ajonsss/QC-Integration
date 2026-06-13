"use client";

import { useState, useEffect } from 'react';

type FormConfig = {
  id: string;
  name: string;
  selectedColumnIds: string[];
  isEditable: boolean;
};

export default function Home() {
  const [columns, setColumns] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // App Navigation State
  const [activeAppView, setActiveAppView] = useState<'forms' | 'tasks'>('forms');

  const [forms, setForms] = useState<FormConfig[]>([]);
  const [activeFormId, setActiveFormId] = useState<string>("");
  const [isBuilderMode, setIsBuilderMode] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Temporary Local State for Task View Statuses
  const [localTaskStatuses, setLocalTaskStatuses] = useState<Record<string, string>>({});
  
  // Tracking Completed Tasks and Print View
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);

  const toggleTaskCompletion = (taskId: string) => {
    setCompletedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handlePrintReport = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleTaskStatusChange = (itemId: string, newStatus: string) => {
    setLocalTaskStatuses(prev => ({ ...prev, [itemId]: newStatus }));
  };

  useEffect(() => {
    fetch('/api/board')
      .then((res) => res.json())
      .then((data) => {
        if (data.boards && data.boards.length > 0) {
          const fetchedColumns = data.boards[0].columns;
          setColumns(fetchedColumns);
          setItems(data.boards[0].items_page.items);

          const savedForms = localStorage.getItem('monday_forms');
          const savedActiveId = localStorage.getItem('monday_active_form_id');

          if (savedForms) {
            const parsedForms = JSON.parse(savedForms).filter((f: any) => !f.isDashboard);
            setForms(parsedForms);
            
            const idExists = parsedForms.some((f: FormConfig) => f.id === savedActiveId);
            setActiveFormId(idExists ? savedActiveId : parsedForms[0].id);
          } else {
            const scheduledCol = fetchedColumns.find((col: any) => col.title.toLowerCase().includes('last date sche'));
            const lockedScheduleTab: FormConfig = { id: 'locked-schedule-tab', name: 'Schedule a Post', selectedColumnIds: scheduledCol ? [scheduledCol.id] : [], isEditable: false };
            
            const initialIds = fetchedColumns
                .filter((col: any) => !isColumnHidden(col))
                .map((col: any) => col.id);
            const defaultEditableForm: FormConfig = { id: 'default-form', name: 'Main Form', selectedColumnIds: initialIds, isEditable: true };
            
            setForms([lockedScheduleTab, defaultEditableForm]);
            setActiveFormId(lockedScheduleTab.id);
          }
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => { if (forms.length > 0) localStorage.setItem('monday_forms', JSON.stringify(forms)); }, [forms]);
  useEffect(() => { if (activeFormId) localStorage.setItem('monday_active_form_id', activeFormId); }, [activeFormId]);

  const activeForm = forms.find(f => f.id === activeFormId) || forms[0];
  const filteredItems = items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const isColumnHidden = (col: any) => {
    const lowerTitle = col.title.toLowerCase();
    return (lowerTitle === 'name' || lowerTitle === 'item' || col.type === 'multiple-person' || lowerTitle.includes('assigned') || lowerTitle.includes('date submitted'));
  };

  const createNewForm = () => {
    const newName = prompt("Enter a name for your new form tab:");
    if (!newName) return;
    const newForm: FormConfig = { id: Date.now().toString(), name: newName, selectedColumnIds: [], isEditable: true };
    setForms([...forms, newForm]);
    setActiveFormId(newForm.id);
    setIsBuilderMode(true);
  };

  const deleteForm = (idToDelete: string, formName: string) => {
    if (forms.length <= 1) return alert("You must have at least one form available!");
    if (idToDelete === 'locked-schedule-tab') return alert("The Schedule a Post tab cannot be deleted.");
    if (confirm(`Are you sure you want to delete "${formName}"?`)) {
      const remainingForms = forms.filter(f => f.id !== idToDelete);
      setForms(remainingForms);
      setActiveFormId(remainingForms[0].id);
    }
  };

  const toggleColumnSelection = (columnId: string) => {
    setForms(forms.map(form => {
      if (form.id !== activeFormId) return form;
      const isSelected = form.selectedColumnIds.includes(columnId);
      return { ...form, selectedColumnIds: isSelected ? form.selectedColumnIds.filter(id => id !== columnId) : [...form.selectedColumnIds, columnId] };
    }));
  };

  const handleInputChange = (columnId: string, value: any) => setFormData(prev => ({ ...prev, [columnId]: value }));

  const handleSubmit = async () => {
    if (!selectedItemId) return alert("Please select an item to update!");
    setIsSubmitting(true);
    try {
      const finalSubmissionData = { ...formData };
      const postStatusColumn = columns.find(col => col.title.toLowerCase() === 'post status');
      if (postStatusColumn) finalSubmissionData[postStatusColumn.id] = { label: "Submitted in GHL" };
      
      const response = await fetch('/api/board/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: selectedItemId, columnValues: finalSubmissionData }),
      });
      if (response.ok) {
        alert("Success!");
        setSearchQuery(""); setSelectedItemId(""); setFormData({});
      }
    } catch (error) { alert("Error updating board."); } finally { setIsSubmitting(false); }
  };

  const getTableItems = (type: string) => {
    return items.filter(item => {
      if (type === 'Scheduling') {
        if (item.column_values) {
          return item.column_values.some((col: any) => 
            col.text && col.text.toLowerCase() === 'submitted in ghl'
          );
        }
        return false;
      }
      
      if (type === 'CC QC Task') {
        if (item.column_values) {
          return item.column_values.some((col: any) => 
            col.text && col.text.toLowerCase() === 'ready for review'
          );
        }
        return false; 
      }
      return false;
    });
  };

  const getStatusOptionsForTable = (tableName: string) => {
    let targetColumnTitle = '';
    
    if (tableName === 'Scheduling') {
      targetColumnTitle = 'post status';
    } else if (tableName === 'CC QC Task') {
      targetColumnTitle = 'qc status';
    }

    const column = columns.find(col => col.title.toLowerCase() === targetColumnTitle);
    
    if (column && (column.type === 'color' || column.type === 'status')) {
      try {
        const settings = JSON.parse(column.settings_str);
        if (settings && settings.labels) {
          return Object.entries(settings.labels).map(([id, label]) => ({ id, label: String(label) }));
        }
      } catch (e) {
        console.error(`Failed to parse status settings for ${targetColumnTitle}`, e);
      }
    }
    return [];
  };

  if (loading || !activeForm) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // --- PRINT VIEW ---
  if (isPrinting) {
    const completedItems = items.filter(item => completedTaskIds.includes(item.id));
    return (
      <div className="min-h-screen bg-white text-black p-6 sm:p-10 font-sans">
        <div className="max-w-4xl mx-auto">
          <div className="border-b-2 border-black pb-4 mb-8 flex flex-col sm:flex-row justify-between sm:items-end gap-2 sm:gap-0">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Daily Progress Report</h1>
              <p className="text-gray-500 mt-1">Generated by SMM QC Web</p>
            </div>
            <p className="font-semibold text-lg">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="text-green-600">✓</span> Completed Tasks ({completedItems.length})
          </h2>
          
          {completedItems.length > 0 ? (
            <ul className="list-none space-y-3">
              {completedItems.map((item, idx) => (
                <li key={item.id} className="text-base sm:text-lg p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <span className="font-bold mr-3">{idx + 1}.</span> {item.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="italic text-gray-500 text-lg">No tasks were marked as completed today.</p>
          )}

          <button 
            onClick={() => setIsPrinting(false)} 
            className="mt-12 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg print:hidden hover:bg-blue-700 transition-colors w-full sm:w-auto"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#fdfbfb] via-[#e2d1c3] to-[#a1c4fd] text-gray-800 font-sans selection:bg-blue-200">
      
      {/* --- GLOBAL MACOS MENU BAR (Optimized for Mobile) --- */}
      <div className="fixed top-0 left-0 w-full h-10 sm:h-7 bg-white/70 backdrop-blur-xl border-b border-white/40 z-50 flex items-center px-2 sm:px-4 text-[12px] sm:text-[13px] font-medium text-gray-800 shadow-sm overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-4 sm:gap-5 flex-1">
          <span className="font-bold text-lg leading-none mb-1 hidden sm:inline"></span>
          <span className="font-bold cursor-default">SMM QC</span>
          <button 
            onClick={() => setActiveAppView('forms')} 
            className={`transition-colors hover:text-black ${activeAppView === 'forms' ? 'text-black font-semibold' : 'text-gray-500'}`}
          >
            Forms
          </button>
          <button 
            onClick={() => setActiveAppView('tasks')} 
            className={`transition-colors hover:text-black ${activeAppView === 'tasks' ? 'text-black font-semibold' : 'text-gray-500'}`}
          >
            Task View
          </button>
        </div>
        {/* Hide time/date on smaller phones to save space */}
        <div className="ml-auto hidden sm:flex items-center gap-4 text-gray-600">
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <span>{new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Main Container - Adjusted padding for mobile */}
      <div className="pt-14 sm:pt-16 pb-6 sm:pb-10 px-2 sm:px-6 max-w-6xl mx-auto h-[100dvh] flex flex-col">
        
        {/* --- MACOS APP WINDOW --- */}
        <div className="bg-white/60 backdrop-blur-2xl rounded-lg sm:rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] sm:shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/60 overflow-hidden flex flex-col flex-1 sm:min-h-[700px]">
          
          {/* Window Title Bar */}
          <div className="min-h-12 bg-white/40 border-b border-gray-200/50 flex flex-wrap items-center justify-between px-3 sm:px-4 py-2 sm:py-0 relative gap-2 sm:gap-0">
            
            {/* Traffic Lights - Hidden on Mobile */}
            <div className="hidden sm:flex gap-2 w-1/4">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] shadow-inner"></div>
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] shadow-inner"></div>
              <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] shadow-inner"></div>
            </div>

            {/* Segmented Control (Center) */}
            <div className="flex-1 flex justify-center w-full sm:w-auto sm:absolute sm:left-1/2 sm:-translate-x-1/2 order-3 sm:order-none">
              <div className="flex bg-gray-200/50 p-1 rounded-lg shadow-inner border border-gray-100/50 w-full sm:w-auto">
                <button 
                  onClick={() => setActiveAppView('forms')} 
                  className={`flex-1 sm:flex-none px-4 sm:px-6 py-1.5 sm:py-1 text-[13px] font-medium rounded-md transition-all duration-200 ${activeAppView === 'forms' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Forms
                </button>
                <button 
                  onClick={() => setActiveAppView('tasks')} 
                  className={`flex-1 sm:flex-none px-4 sm:px-6 py-1.5 sm:py-1 text-[13px] font-medium rounded-md transition-all duration-200 ${activeAppView === 'tasks' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Tasks
                </button>
              </div>
            </div>

            {/* Window Actions */}
            <div className="flex items-center justify-end w-full sm:w-1/4 order-2 sm:order-none">
              {activeAppView === 'forms' && activeForm.isEditable && (
                <button 
                  onClick={() => setIsBuilderMode(!isBuilderMode)}
                  className="text-xs font-semibold text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 transition-colors px-3 py-1.5 rounded-md border border-blue-500/20"
                >
                  {isBuilderMode ? "Done Editing" : "Edit Fields"}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* --------------------------- */}
            {/* TASK VIEW (DASHBOARD)       */}
            {/* --------------------------- */}
            {activeAppView === 'tasks' && (
              <div className="p-4 sm:p-8 animate-in fade-in duration-300 overflow-y-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">Project Overview</h1>
                  
                  <button 
                    onClick={handlePrintReport}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-gray-800 text-white text-sm font-semibold rounded-lg hover:bg-black transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                    Print Report
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {['Scheduling', 'CC QC Task'].map(tableName => {
                    const dynamicStatusOptions = getStatusOptionsForTable(tableName);

                    return (
                      <div key={tableName} className="bg-white/50 backdrop-blur-md p-4 sm:p-6 rounded-xl shadow-sm border border-white/60">
                        <h2 className="text-[14px] sm:text-[15px] font-semibold text-gray-700 mb-4 border-b border-gray-200/50 pb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          {tableName}
                        </h2>
                        <div className="overflow-y-auto max-h-[400px] pr-1 sm:pr-2">
                          <table className="w-full text-left border-collapse">
                            <tbody>
                              {getTableItems(tableName).length > 0 ? (
                                getTableItems(tableName).map(item => {
                                  const isDone = completedTaskIds.includes(item.id);

                                  return (
                                    <tr key={item.id} className={`border-b border-gray-100/50 group hover:bg-white/60 transition-colors rounded-lg ${isDone ? 'opacity-60' : ''}`}>
                                      {/* Mobile-Responsive Table Cell */}
                                      <td className="py-3 px-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                                        
                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                          <input 
                                            type="checkbox" 
                                            checked={isDone}
                                            onChange={() => toggleTaskCompletion(item.id)}
                                            className="w-4 h-4 rounded text-green-500 focus:ring-green-500/30 cursor-pointer border-gray-300 flex-shrink-0"
                                            title="Mark as Done"
                                          />
                                          <span className={`text-[13px] sm:text-[14px] font-medium transition-all line-clamp-2 sm:line-clamp-none ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                            {item.name}
                                          </span>
                                        </div>

                                        <select
                                          value={localTaskStatuses[item.id] || ""}
                                          onChange={(e) => handleTaskStatusChange(item.id, e.target.value)}
                                          disabled={isDone}
                                          className={`w-full sm:w-auto sm:ml-4 bg-white/80 sm:bg-white/60 backdrop-blur-md border border-gray-200/50 p-2 sm:p-1.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-[13px] text-gray-700 cursor-pointer ${isDone ? 'cursor-not-allowed bg-gray-100' : ''}`}
                                        >
                                          <option value="" disabled>Set Status...</option>
                                          {dynamicStatusOptions.map((opt) => (
                                            <option key={opt.id} value={opt.label}>{opt.label}</option>
                                          ))}
                                        </select>
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td className="py-6 text-center text-sm text-gray-400 italic">No tasks found.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* --------------------------- */}
            {/* FORMS VIEW                  */}
            {/* --------------------------- */}
            {activeAppView === 'forms' && (
              <div className="flex flex-col md:flex-row flex-1 overflow-hidden animate-in fade-in duration-300">
                
                {/* Mobile-Responsive Sidebar Tab Navigation */}
                <div className="w-full md:w-64 bg-white/30 border-b md:border-b-0 md:border-r border-gray-200/50 p-3 sm:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto">
                  <h3 className="hidden md:block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Form Views</h3>
                  {forms.map(form => (
                    <div key={form.id} className="relative group flex-shrink-0 w-auto md:w-full">
                      <button 
                        onClick={() => { setActiveFormId(form.id); setIsBuilderMode(false); }} 
                        className={`w-full text-left px-3 sm:px-4 py-2 rounded-lg text-[13px] sm:text-[14px] font-medium transition-all flex items-center justify-between whitespace-nowrap ${
                          activeFormId === form.id 
                            ? 'bg-blue-500 text-white shadow-sm' 
                            : 'text-gray-700 hover:bg-black/5 bg-white/50 md:bg-transparent'
                        }`}
                      >
                        <span className="truncate mr-2">{form.name}</span>
                        {!form.isEditable && <span className="opacity-70 text-xs">🔒</span>}
                      </button>
                      
                      {form.isEditable && activeFormId !== form.id && (
                        <button 
                          onClick={() => deleteForm(form.id, form.name)}
                          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 items-center justify-center rounded-md text-gray-400 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all text-xs"
                          title="Delete form"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={createNewForm} 
                    className="flex-shrink-0 mt-0 md:mt-4 px-3 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-800 hover:bg-black/5 bg-white/50 md:bg-transparent rounded-lg transition-colors flex items-center gap-2 border border-dashed border-gray-300/50 whitespace-nowrap"
                  >
                    <span>+</span> Add Form
                  </button>
                </div>

                {/* Form Content Area */}
                <div className="flex-1 p-4 sm:p-8 overflow-y-auto relative">
                  
                  {isBuilderMode && activeForm.isEditable ? (
                    <div className="max-w-2xl mx-auto md:mx-0">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Configure '{activeForm.name}'</h2>
                      <p className="text-[13px] sm:text-sm text-gray-500 mb-6">Select the fields you want your team to fill out.</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {columns.filter(c => !isColumnHidden(c)).map(col => (
                          <label key={col.id} className="flex items-center p-3 sm:p-4 bg-white/50 border border-white/60 rounded-xl shadow-sm cursor-pointer hover:bg-white transition-all">
                            <input 
                              type="checkbox" 
                              checked={activeForm.selectedColumnIds.includes(col.id)} 
                              onChange={() => toggleColumnSelection(col.id)} 
                              className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500/30 border-gray-300 mr-3 flex-shrink-0" 
                            />
                            <span className="font-medium text-gray-700 text-[13px] sm:text-[14px] truncate">{col.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <form className="max-w-xl mx-auto space-y-4 sm:space-y-5 pb-10">
                      
                      <div className="mb-6 sm:mb-8 text-center md:text-left">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">{activeForm.name}</h2>
                        <p className="text-[13px] sm:text-sm text-gray-500">Submit an update to the Monday.com board.</p>
                      </div>

                      <div className="flex flex-col relative z-20">
                        <label className="mb-1.5 text-[12px] sm:text-[13px] font-semibold text-gray-600 ml-1">Select Record</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={searchQuery} 
                            placeholder="Type to search items..."
                            onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }} 
                            onFocus={() => setIsDropdownOpen(true)} 
                            className="w-full bg-white/80 sm:bg-white/60 backdrop-blur-md border border-white/50 p-3 sm:p-2.5 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:bg-white transition-all text-[14px] sm:text-[16px]" 
                          />
                          {isDropdownOpen && (
                            <ul className="absolute z-30 bg-white/95 backdrop-blur-xl w-full border border-gray-200/50 shadow-xl rounded-xl mt-2 max-h-48 sm:max-h-56 overflow-auto py-1">
                              {filteredItems.length > 0 ? (
                                filteredItems.map(item => (
                                  <li 
                                    key={item.id} 
                                    onClick={() => { setSelectedItemId(item.id); setSearchQuery(item.name); setIsDropdownOpen(false); }} 
                                    className="px-4 py-3 sm:py-2 text-[14px] cursor-pointer hover:bg-blue-500 hover:text-white transition-colors border-b border-gray-50 last:border-0"
                                  >
                                    {item.name}
                                  </li>
                                ))
                              ) : (
                                <li className="px-4 py-3 text-[14px] text-gray-400 italic text-center">No results found</li>
                              )}
                            </ul>
                          )}
                        </div>
                      </div>

                      {columns.filter(col => !isColumnHidden(col) && activeForm.selectedColumnIds.includes(col.id)).map(col => (
                        <div key={col.id} className="flex flex-col relative z-10">
                          <label className="mb-1.5 text-[12px] sm:text-[13px] font-semibold text-gray-600 ml-1">{col.title}</label>
                          {col.type === 'color' || col.type === 'status' ? (
                            <select 
                              onChange={(e) => handleInputChange(col.id, e.target.value)}
                              value={formData[col.id] || ""}
                              className="w-full bg-white/80 sm:bg-white/60 backdrop-blur-md border border-white/50 p-3 sm:p-2.5 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:bg-white transition-all text-[14px] sm:text-[16px] appearance-none" 
                            >
                              <option value="">Select option...</option>
                              {Object.entries(JSON.parse(col.settings_str).labels || {}).map(([id, label]: any) => (
                                <option key={id} value={id}>{label}</option>
                              ))}
                            </select>
                          ) : (
                            <input 
                              type={col.type === 'date' ? 'date' : 'text'} 
                              onChange={(e) => handleInputChange(col.id, e.target.value)} 
                              value={formData[col.id] || ""}
                              className="w-full bg-white/80 sm:bg-white/60 backdrop-blur-md border border-white/50 p-3 sm:p-2.5 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:bg-white transition-all text-[14px] sm:text-[16px]" 
                            />
                          )}
                        </div>
                      ))}

                      <div className="pt-6">
                        <button 
                          type="button" 
                          onClick={handleSubmit} 
                          disabled={isSubmitting}
                          className={`w-full text-white py-3.5 sm:py-3 rounded-xl font-medium shadow-md transition-all text-[15px] sm:text-[14px] ${
                            isSubmitting ? 'bg-blue-400 cursor-wait' : 'bg-blue-500 hover:bg-blue-600 hover:shadow-lg active:scale-[0.99]'
                          }`}
                        >
                          {isSubmitting ? "Syncing to Monday.com..." : "Submit Update"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}