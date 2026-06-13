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
            // Filter out old dashboard tabs if they exist from previous versions
            const parsedForms = JSON.parse(savedForms).filter((f: any) => !f.isDashboard);
            setForms(parsedForms);
            
            // Ensure the saved active ID actually exists in the filtered array
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

  const getTableItems = (type: string) => items.filter(item => item.name.toLowerCase().includes(type.toLowerCase() === 'scheduling' ? 'schedule' : 'qc'));

  if (loading || !activeForm) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    // macOS Sequoia Wallpaper Background (CSS Gradient Mimic)
    <main className="min-h-screen bg-gradient-to-br from-[#fdfbfb] via-[#e2d1c3] to-[#a1c4fd] text-gray-800 font-sans selection:bg-blue-200">
      
      {/* --- GLOBAL MACOS MENU BAR --- */}
      <div className="fixed top-0 left-0 w-full h-7 bg-white/60 backdrop-blur-xl border-b border-white/40 z-50 flex items-center px-4 text-[13px] font-medium text-gray-800 shadow-sm">
        <div className="flex items-center gap-5">
          <span className="font-bold text-lg leading-none mb-1"></span>
          <span className="font-bold cursor-default">SMM QC Web</span>
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
        <div className="ml-auto flex items-center gap-4 text-gray-600">
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <span>{new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
        </div>
      </div>

      <div className="pt-16 pb-10 px-6 max-w-6xl mx-auto">
        
        {/* --- MACOS APP WINDOW --- */}
        <div className="bg-white/60 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/60 overflow-hidden flex flex-col min-h-[700px]">
          
          {/* Window Title Bar */}
          <div className="h-12 bg-white/40 border-b border-gray-200/50 flex items-center justify-between px-4 relative">
            {/* Traffic Lights */}
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] shadow-inner"></div>
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] shadow-inner"></div>
              <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] shadow-inner"></div>
            </div>

            {/* Segmented Control (Center) */}
            <div className="absolute left-1/2 -translate-x-1/2 flex bg-gray-200/50 p-1 rounded-lg shadow-inner border border-gray-100/50">
              <button 
                onClick={() => setActiveAppView('forms')} 
                className={`px-6 py-1 text-[13px] font-medium rounded-md transition-all duration-200 ${activeAppView === 'forms' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Forms
              </button>
              <button 
                onClick={() => setActiveAppView('tasks')} 
                className={`px-6 py-1 text-[13px] font-medium rounded-md transition-all duration-200 ${activeAppView === 'tasks' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Task View
              </button>
            </div>

            {/* Window Actions */}
            <div className="flex items-center">
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

          {/* Window Content Area */}
          <div className="flex-1 flex flex-col">
            
            {/* --------------------------- */}
            {/* TASK VIEW (DASHBOARD)       */}
            {/* --------------------------- */}
            {activeAppView === 'tasks' && (
              <div className="p-8 animate-in fade-in duration-300">
                <h1 className="text-2xl font-bold text-gray-800 mb-6 tracking-tight">Project Overview</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {['Scheduling', 'CC QC'].map(tableName => (
                    <div key={tableName} className="bg-white/50 backdrop-blur-md p-6 rounded-xl shadow-sm border border-white/60">
                      <h2 className="text-[15px] font-semibold text-gray-700 mb-4 border-b border-gray-200/50 pb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {tableName} Tasks
                      </h2>
                      <div className="overflow-y-auto max-h-[400px] pr-2">
                        <table className="w-full text-left border-collapse">
                          <tbody>
                            {getTableItems(tableName).length > 0 ? (
                              getTableItems(tableName).map(item => (
                                <tr key={item.id} className="border-b border-gray-100/50 group hover:bg-white/60 transition-colors rounded-lg">
                                  <td className="py-3 px-2 text-[14px] text-gray-800">{item.name}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td className="py-6 text-center text-sm text-gray-400 italic">No tasks found.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --------------------------- */}
            {/* FORMS VIEW                  */}
            {/* --------------------------- */}
            {activeAppView === 'forms' && (
              <div className="flex flex-1 overflow-hidden animate-in fade-in duration-300">
                
                {/* Sidebar Tab Navigation */}
                <div className="w-64 bg-white/30 border-r border-gray-200/50 p-4 flex flex-col gap-2 overflow-y-auto">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Form Views</h3>
                  {forms.map(form => (
                    <div key={form.id} className="relative group">
                      <button 
                        onClick={() => { setActiveFormId(form.id); setIsBuilderMode(false); }} 
                        className={`w-full text-left px-3 py-2 rounded-lg text-[14px] font-medium transition-all flex items-center justify-between ${
                          activeFormId === form.id 
                            ? 'bg-blue-500 text-white shadow-sm' 
                            : 'text-gray-700 hover:bg-black/5'
                        }`}
                      >
                        <span className="truncate">{form.name}</span>
                        {!form.isEditable && <span className="opacity-70 text-xs">🔒</span>}
                      </button>
                      
                      {form.isEditable && activeFormId !== form.id && (
                        <button 
                          onClick={() => deleteForm(form.id, form.name)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-md text-gray-400 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all text-xs"
                          title="Delete form"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={createNewForm} 
                    className="mt-4 px-3 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-800 hover:bg-black/5 rounded-lg transition-colors flex items-center gap-2 border border-dashed border-gray-300/50"
                  >
                    <span>+</span> Add New Form
                  </button>
                </div>

                {/* Form Content Area */}
                <div className="flex-1 p-8 overflow-y-auto relative">
                  
                  {isBuilderMode && activeForm.isEditable ? (
                    <div className="max-w-2xl">
                      <h2 className="text-2xl font-bold text-gray-800 mb-2">Configure '{activeForm.name}'</h2>
                      <p className="text-sm text-gray-500 mb-6">Select the fields you want your team to fill out.</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {columns.filter(c => !isColumnHidden(c)).map(col => (
                          <label key={col.id} className="flex items-center p-3 bg-white/50 border border-white/60 rounded-xl shadow-sm cursor-pointer hover:bg-white transition-all">
                            <input 
                              type="checkbox" 
                              checked={activeForm.selectedColumnIds.includes(col.id)} 
                              onChange={() => toggleColumnSelection(col.id)} 
                              className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500/30 border-gray-300 mr-3" 
                            />
                            <span className="font-medium text-gray-700 text-[14px] truncate">{col.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <form className="max-w-xl mx-auto space-y-5 pb-10">
                      
                      <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-1">{activeForm.name}</h2>
                        <p className="text-sm text-gray-500">Submit an update to the Monday.com board.</p>
                      </div>

                      {/* Primary Item Search */}
                      <div className="flex flex-col relative z-20">
                        <label className="mb-1.5 text-[13px] font-semibold text-gray-600 ml-1">Select Record</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={searchQuery} 
                            placeholder="Type to search items..."
                            onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }} 
                            onFocus={() => setIsDropdownOpen(true)} 
                            className="w-full bg-white/60 backdrop-blur-md border border-white/50 p-2.5 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:bg-white transition-all text-[14px]" 
                          />
                          {isDropdownOpen && (
                            <ul className="absolute z-30 bg-white/90 backdrop-blur-xl w-full border border-gray-200/50 shadow-xl rounded-xl mt-2 max-h-56 overflow-auto py-1">
                              {filteredItems.length > 0 ? (
                                filteredItems.map(item => (
                                  <li 
                                    key={item.id} 
                                    onClick={() => { setSelectedItemId(item.id); setSearchQuery(item.name); setIsDropdownOpen(false); }} 
                                    className="px-4 py-2 text-[14px] cursor-pointer hover:bg-blue-500 hover:text-white transition-colors"
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

                      {/* Dynamic Columns */}
                      {columns.filter(col => !isColumnHidden(col) && activeForm.selectedColumnIds.includes(col.id)).map(col => (
                        <div key={col.id} className="flex flex-col relative z-10">
                          <label className="mb-1.5 text-[13px] font-semibold text-gray-600 ml-1">{col.title}</label>
                          {col.type === 'color' || col.type === 'status' ? (
                            <select 
                              onChange={(e) => handleInputChange(col.id, e.target.value)}
                              value={formData[col.id] || ""}
                              className="w-full bg-white/60 backdrop-blur-md border border-white/50 p-2.5 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:bg-white transition-all text-[14px] appearance-none" 
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
                              className="w-full bg-white/60 backdrop-blur-md border border-white/50 p-2.5 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:bg-white transition-all text-[14px]" 
                            />
                          )}
                        </div>
                      ))}

                      {/* Submit Button */}
                      <div className="pt-6">
                        <button 
                          type="button" 
                          onClick={handleSubmit} 
                          disabled={isSubmitting}
                          className={`w-full text-white py-3 rounded-xl font-medium shadow-md transition-all text-[14px] ${
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