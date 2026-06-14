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

  const [forms, setForms] = useState<FormConfig[]>([]);
  const [activeFormId, setActiveFormId] = useState<string>("");
  const [isBuilderMode, setIsBuilderMode] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial Load from Monday.com and LocalStorage (DB removed)
  useEffect(() => {
    fetch('/api/board')
      .then((res) => res.json())
      .then((data) => {
        if (data.boards && data.boards.length > 0) {
          const fetchedColumns = data.boards[0].columns;
          setColumns(fetchedColumns);
          setItems(data.boards[0].items_page.items);

          // Restore from Local Storage
          const savedForms = localStorage.getItem('monday_forms');
          const savedActiveId = localStorage.getItem('monday_active_form_id');

          if (savedForms) {
            // Filter out old dashboard tabs if they exist from previous versions
            const parsedForms = JSON.parse(savedForms).filter((f: any) => !f.isDashboard);
            setForms(parsedForms);
            
            const idExists = parsedForms.some((f: FormConfig) => f.id === savedActiveId);
            setActiveFormId(idExists ? savedActiveId : parsedForms[0].id);
          } else {
            // Default setup if no local storage exists
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
      })
      .catch((err) => {
        console.error("Failed to load data", err);
        setLoading(false);
      });
  }, []);

  // Save to LocalStorage whenever forms or active tab changes
  useEffect(() => { 
    if (forms.length > 0) localStorage.setItem('monday_forms', JSON.stringify(forms)); 
  }, [forms]);
  
  useEffect(() => { 
    if (activeFormId) localStorage.setItem('monday_active_form_id', activeFormId); 
  }, [activeFormId]);

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

  if (loading || !activeForm) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#e0eafc]">
        <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    // macOS "Tahoe" Concept Wallpaper Background (Icy Blue / Alpine Frost)
    <main className="min-h-screen bg-gradient-to-br from-[#e0eafc] via-[#cfdef3] to-[#8eb5ff] text-slate-800 font-sans selection:bg-blue-300">
      
      {/* --- GLOBAL MACOS MENU BAR --- */}
      <div className="fixed top-0 left-0 w-full h-10 sm:h-7 bg-white/40 backdrop-blur-2xl border-b border-white/50 z-50 flex items-center px-3 sm:px-4 text-[12px] sm:text-[13px] font-medium text-slate-800 shadow-sm overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-4 sm:gap-5 flex-1">
          <span className="font-bold text-lg leading-none mb-1 hidden sm:inline text-slate-900"></span>
          <span className="font-bold cursor-default text-slate-900">SMM QC Web Submission</span>
          <button className="text-slate-900 font-semibold cursor-default">Forms</button>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-4 text-slate-700">
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <span>{new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
        </div>
      </div>

      <div className="pt-14 sm:pt-20 pb-6 sm:pb-10 px-2 sm:px-6 max-w-6xl mx-auto h-[100dvh] flex flex-col">
        
        {/* --- MACOS APP WINDOW (Frosty Tahoe Look) --- */}
        <div className="bg-white/50 backdrop-blur-3xl rounded-lg sm:rounded-2xl shadow-[0_20px_60px_rgba(30,50,90,0.15)] border border-white/60 overflow-hidden flex flex-col flex-1 sm:min-h-[700px]">
          
          {/* Window Title Bar */}
          <div className="min-h-12 bg-white/30 border-b border-white/40 flex flex-wrap items-center justify-between px-3 sm:px-4 py-2 sm:py-0 relative gap-2 sm:gap-0">
            
            <div className="hidden sm:flex gap-2 w-1/4">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] shadow-inner"></div>
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] shadow-inner"></div>
              <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] shadow-inner"></div>
            </div>

            <div className="flex-1 flex justify-center w-full sm:w-auto sm:absolute sm:left-1/2 sm:-translate-x-1/2 order-3 sm:order-none">
               <div className="text-[13px] font-semibold text-slate-700 tracking-wide">
                  SMM QC Form Manager
               </div>
            </div>

            <div className="flex items-center justify-end w-full sm:w-1/4 order-2 sm:order-none">
              {activeForm.isEditable && (
                <button 
                  onClick={() => setIsBuilderMode(!isBuilderMode)}
                  className="text-xs font-semibold text-blue-700 bg-white/40 hover:bg-white/60 shadow-sm transition-colors px-3 py-1.5 rounded-md border border-white/50"
                >
                  {isBuilderMode ? "Done Editing" : "Edit Fields"}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* --------------------------- */}
            {/* FORMS VIEW                  */}
            {/* --------------------------- */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden animate-in fade-in duration-300">
              
              {/* Sidebar Tab Navigation */}
              <div className="w-full md:w-64 bg-white/20 border-b md:border-b-0 md:border-r border-white/30 p-3 sm:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto">
                <h3 className="hidden md:block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">Form Views</h3>
                {forms.map(form => (
                  <div key={form.id} className="relative group flex-shrink-0 w-auto md:w-full">
                    <button 
                      onClick={() => { setActiveFormId(form.id); setIsBuilderMode(false); }} 
                      className={`w-full text-left px-3 sm:px-4 py-2 rounded-lg text-[13px] sm:text-[14px] font-medium transition-all flex items-center justify-between whitespace-nowrap ${
                        activeFormId === form.id 
                          ? 'bg-blue-600/90 text-white shadow-md backdrop-blur-md' 
                          : 'text-slate-700 hover:bg-white/40 bg-white/30 md:bg-transparent'
                      }`}
                    >
                      <span className="truncate mr-2">{form.name}</span>
                      {!form.isEditable && <span className="opacity-70 text-xs">🔒</span>}
                    </button>
                    
                    {form.isEditable && activeFormId !== form.id && (
                      <button 
                        onClick={() => deleteForm(form.id, form.name)}
                        className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 items-center justify-center rounded-md text-slate-400 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all text-xs"
                        title="Delete form"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  onClick={createNewForm} 
                  className="flex-shrink-0 mt-0 md:mt-4 px-3 py-2 text-[13px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/40 bg-white/30 md:bg-transparent rounded-lg transition-colors flex items-center gap-2 border border-dashed border-slate-300/50 whitespace-nowrap"
                >
                  <span>+</span> Add Form
                </button>
              </div>

              {/* Form Content Area */}
              <div className="flex-1 p-4 sm:p-8 overflow-y-auto relative">
                
                {isBuilderMode && activeForm.isEditable ? (
                  <div className="max-w-2xl mx-auto md:mx-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">Configure '{activeForm.name}'</h2>
                    <p className="text-[13px] sm:text-sm text-slate-600 mb-6">Select the fields you want your team to fill out.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {columns.filter(c => !isColumnHidden(c)).map(col => (
                        <label key={col.id} className="flex items-center p-3 sm:p-4 bg-white/60 border border-white/80 rounded-xl shadow-sm cursor-pointer hover:bg-white/80 transition-all">
                          <input 
                            type="checkbox" 
                            checked={activeForm.selectedColumnIds.includes(col.id)} 
                            onChange={() => toggleColumnSelection(col.id)} 
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/30 border-slate-300 mr-3 flex-shrink-0" 
                          />
                          <span className="font-medium text-slate-700 text-[13px] sm:text-[14px] truncate">{col.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <form className="max-w-xl mx-auto space-y-4 sm:space-y-5 pb-10">
                    
                    <div className="mb-6 sm:mb-8 text-center md:text-left">
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1">{activeForm.name}</h2>
                      <p className="text-[13px] sm:text-sm text-slate-600">Submit an update to the Monday.com board.</p>
                    </div>

                    <div className="flex flex-col relative z-20">
                      <label className="mb-1.5 text-[12px] sm:text-[13px] font-semibold text-slate-700 ml-1">Select Record</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={searchQuery} 
                          placeholder="Type to search items..."
                          onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }} 
                          onFocus={() => setIsDropdownOpen(true)} 
                          className="w-full bg-white/70 backdrop-blur-md border border-white/60 p-3 sm:p-2.5 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-400/30 focus:bg-white transition-all text-[14px] sm:text-[16px] text-slate-800 placeholder-slate-400" 
                        />
                        {isDropdownOpen && (
                          <ul className="absolute z-30 bg-white/95 backdrop-blur-xl w-full border border-white/60 shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-xl mt-2 max-h-48 sm:max-h-56 overflow-auto py-1">
                            {filteredItems.length > 0 ? (
                              filteredItems.map(item => (
                                <li 
                                  key={item.id} 
                                  onClick={() => { setSelectedItemId(item.id); setSearchQuery(item.name); setIsDropdownOpen(false); }} 
                                  className="px-4 py-3 sm:py-2 text-[14px] cursor-pointer text-slate-700 hover:bg-blue-500 hover:text-white transition-colors border-b border-slate-100 last:border-0"
                                >
                                  {item.name}
                                </li>
                              ))
                            ) : (
                              <li className="px-4 py-3 text-[14px] text-slate-400 italic text-center">No results found</li>
                            )}
                          </ul>
                        )}
                      </div>
                    </div>

                    {columns.filter(col => !isColumnHidden(col) && activeForm.selectedColumnIds.includes(col.id)).map(col => (
                      <div key={col.id} className="flex flex-col relative z-10">
                        <label className="mb-1.5 text-[12px] sm:text-[13px] font-semibold text-slate-700 ml-1">{col.title}</label>
                        {col.type === 'color' || col.type === 'status' ? (
                          <select 
                            onChange={(e) => handleInputChange(col.id, e.target.value)}
                            value={formData[col.id] || ""}
                            className="w-full bg-white/70 backdrop-blur-md border border-white/60 p-3 sm:p-2.5 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-400/30 focus:bg-white transition-all text-[14px] sm:text-[16px] text-slate-800 appearance-none cursor-pointer" 
                          >
                            <option value="" className="text-slate-400">Select option...</option>
                            {Object.entries(JSON.parse(col.settings_str).labels || {}).map(([id, label]: any) => (
                              <option key={id} value={id}>{label}</option>
                            ))}
                          </select>
                        ) : (
                          <input 
                            type={col.type === 'date' ? 'date' : 'text'} 
                            onChange={(e) => handleInputChange(col.id, e.target.value)} 
                            value={formData[col.id] || ""}
                            className="w-full bg-white/70 backdrop-blur-md border border-white/60 p-3 sm:p-2.5 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-400/30 focus:bg-white transition-all text-[14px] sm:text-[16px] text-slate-800" 
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
                          isSubmitting ? 'bg-blue-400/80 cursor-wait' : 'bg-blue-600/90 hover:bg-blue-600 hover:shadow-lg active:scale-[0.99] backdrop-blur-md border border-blue-500/50'
                        }`}
                      >
                        {isSubmitting ? "Syncing to Monday.com..." : "Submit Update"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}