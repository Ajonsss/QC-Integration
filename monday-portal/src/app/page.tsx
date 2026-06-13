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
              const parsedForms = JSON.parse(savedForms);
              setForms(parsedForms);
              setActiveFormId(savedActiveId || parsedForms[0].id);
            } else {
              const scheduledCol = fetchedColumns.find((col: any) => 
                col.title.toLowerCase().includes('last date sche')
              );

              const initialIds = fetchedColumns
                  .filter((col: any) => {
                    const lowerTitle = col.title.toLowerCase();
                    return (
                      lowerTitle !== 'name' && 
                      lowerTitle !== 'item' && 
                      col.type !== 'multiple-person' &&
                      !lowerTitle.includes('assigned') &&
                      !lowerTitle.includes('date submitted')
                    );
                  })
                  .map((col: any) => col.id);
              
              // --- UPDATED: Renamed the tab to "Schedule a Post" ---
              const lockedScheduleTab: FormConfig = {
                id: 'locked-schedule-tab',
                name: 'Schedule a Post',
                selectedColumnIds: scheduledCol ? [scheduledCol.id] : [],
                isEditable: false, 
              };
              // -----------------------------------------------------

              const defaultEditableForm: FormConfig = {
                id: 'default-form',
                name: 'Main Form',
                selectedColumnIds: initialIds,
                isEditable: true,
              };

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

  useEffect(() => {
    if (forms.length > 0) {
      localStorage.setItem('monday_forms', JSON.stringify(forms));
    }
  }, [forms]);

  useEffect(() => {
    if (activeFormId) {
      localStorage.setItem('monday_active_form_id', activeFormId);
    }
  }, [activeFormId]);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeForm = forms.find(f => f.id === activeFormId) || forms[0];

  const createNewForm = () => {
    const newName = prompt("Enter a name for your new form tab:");
    if (!newName) return; 

    const newForm: FormConfig = {
      id: Date.now().toString(), 
      name: newName,
      selectedColumnIds: [], 
      isEditable: true, 
    };

    setForms([...forms, newForm]);
    setActiveFormId(newForm.id);
    setIsBuilderMode(true);      
  };

  const deleteForm = (idToDelete: string, formName: string) => {
    if (forms.length === 1) {
      alert("You must have at least one form available!");
      return;
    }
    
    // --- UPDATED: Updated the safety alert text ---
    if (idToDelete === 'locked-schedule-tab') {
      alert("The Schedule a Post tab is a required system tab and cannot be deleted.");
      return;
    }
    // ----------------------------------------------

    if (confirm(`Are you sure you want to delete the "${formName}" form?`)) {
      const remainingForms = forms.filter(f => f.id !== idToDelete);
      setForms(remainingForms);
      
      if (activeFormId === idToDelete) {
        setActiveFormId(remainingForms[0].id);
      }
    }
  };

  const toggleColumnSelection = (columnId: string) => {
    setForms(forms.map(form => {
      if (form.id !== activeFormId) return form;
      
      const isSelected = form.selectedColumnIds.includes(columnId);
      return {
        ...form,
        selectedColumnIds: isSelected 
          ? form.selectedColumnIds.filter(id => id !== columnId) 
          : [...form.selectedColumnIds, columnId]
      };
    }));
  };

  const handleInputChange = (columnId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [columnId]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedItemId) {
      alert("Please select an item to update first!");
      return;
    }
    setIsSubmitting(true);

    try {
      const finalSubmissionData = { ...formData };
      
      const postStatusColumn = columns.find(col => 
        col.title.toLowerCase() === 'post status' || col.title === 'Post Status'
      );
      
      if (postStatusColumn) {
        finalSubmissionData[postStatusColumn.id] = { label: "Submitted in GHL" };
      }

      const response = await fetch('/api/board/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItemId,
          columnValues: finalSubmissionData,
        }),
      });

      if (response.ok) {
        alert("Success! The board has been updated.");
        setSearchQuery("");
        setSelectedItemId("");
        setFormData({});
      } else {
        alert("There was an error updating the board.");
      }
    } catch (error) {
      alert("A network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !activeForm) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-xl font-bold text-gray-600">Loading your board...</p>
      </div>
    );
  }

  const isColumnHidden = (col: any) => {
    const lowerTitle = col.title.toLowerCase();
    return (
      lowerTitle === 'name' || 
      lowerTitle === 'item' || 
      col.type === 'multiple-person' ||
      lowerTitle.includes('assigned') ||
      lowerTitle.includes('date submitted')
    );
  };

  return (
    <main className="min-h-screen p-10 bg-gray-100">
      <div className="max-w-3xl mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            {isBuilderMode ? "⚙️ Form Builder" : "Team Task Form"}
          </h1>
          {activeForm.isEditable && (
            <button 
              onClick={() => setIsBuilderMode(!isBuilderMode)}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition bg-blue-100 px-4 py-2 rounded-md"
            >
              {isBuilderMode ? "Save & View Form" : "Edit Form Fields"}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-6 border-b pb-2 border-gray-300">
          {forms.map((form) => (
            <div 
              key={form.id} 
              className={`flex items-center rounded-t-md border-t border-l border-r transition-colors ${
                activeFormId === form.id ? 'bg-white border-gray-300 text-blue-600 shadow-sm' : 'bg-gray-200 border-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              <button 
                onClick={() => {
                  setActiveFormId(form.id);
                  setIsBuilderMode(false); 
                }} 
                className="px-4 py-2 font-semibold focus:outline-none"
              >
                {form.name}
                {!form.isEditable && <span className="ml-2 text-xs text-gray-400">🔒</span>}
              </button>
              
              {form.isEditable && (
                <button 
                  onClick={() => deleteForm(form.id, form.name)}
                  className={`pr-3 pl-1 text-xs hover:text-red-500 focus:outline-none ${activeFormId === form.id ? 'text-gray-400' : 'text-gray-500'}`}
                  title="Delete this form"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button onClick={createNewForm} className="px-4 py-2 text-sm font-bold text-green-600 bg-green-100 hover:bg-green-200 rounded-t-md transition focus:outline-none">
            + New Form
          </button>
        </div>

        <div className="bg-white p-8 rounded-b-lg rounded-tr-lg shadow-lg">
          
          {/* BUILDER MODE */}
          {isBuilderMode && activeForm.isEditable ? (
            <div>
              <p className="text-gray-600 mb-6 pb-4 border-b">
                Select which columns should be visible in the <strong>{activeForm.name}</strong>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {columns.map((col) => {
                  if (isColumnHidden(col)) return null; 
                  
                  return (
                    <label 
                      key={col.id} 
                      className="flex items-center p-3 border rounded-md transition cursor-pointer hover:bg-gray-50"
                    >
                      <input 
                        type="checkbox"
                        checked={activeForm.selectedColumnIds.includes(col.id)}
                        onChange={() => toggleColumnSelection(col.id)}
                        className="w-5 h-5 rounded mr-3 text-blue-600"
                      />
                      <span className="font-medium text-gray-700">{col.title}</span>
                      <span className="ml-auto text-xs text-gray-400 uppercase">{col.type}</span>
                    </label>
                  );
                })}
              </div>
              <button onClick={() => setIsBuilderMode(false)} className="mt-8 bg-green-600 text-white font-bold py-3 px-6 rounded-md hover:bg-green-700 transition shadow-md">
                Save {activeForm.name}
              </button>
            </div>
          ) : (
          /* LIVE FORM MODE */
            <form className="space-y-6">
              
              <div className="flex flex-col bg-blue-50 p-4 rounded-md border border-blue-100 mb-6 relative">
                <label className="mb-2 font-bold text-blue-900">Search & Select Item to Update</label>
                <input
                  type="text"
                  placeholder="Type to search items..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="border border-blue-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white text-gray-800"
                />
                {isDropdownOpen && (
                  <ul className="absolute z-10 w-[calc(100%-2rem)] mt-[80px] bg-white border border-gray-300 rounded-md shadow-xl max-h-60 overflow-auto">
                    {filteredItems.length > 0 ? (
                      filteredItems.map((item) => (
                        <li
                          key={item.id}
                          onClick={() => {
                            setSelectedItemId(item.id);     
                            setSearchQuery(item.name);      
                            setIsDropdownOpen(false);       
                          }}
                          className="p-3 hover:bg-blue-100 cursor-pointer transition border-b border-gray-50 last:border-0 text-gray-700"
                        >
                          {item.name}
                        </li>
                      ))
                    ) : (
                      <li className="p-3 text-gray-500 italic bg-gray-50">No items match your search.</li>
                    )}
                  </ul>
                )}
              </div>

              {columns.map((col) => {
                if (isColumnHidden(col)) return null;
                if (!activeForm.selectedColumnIds.includes(col.id)) return null;

                if (col.type === 'color' || col.type === 'status') {
                  let statusOptions: { id: string; label: string }[] = [];
                  try {
                    const settings = JSON.parse(col.settings_str);
                    if (settings && settings.labels) {
                      statusOptions = Object.entries(settings.labels).map(([id, label]) => ({ id, label: String(label) }));
                    }
                  } catch (e) { }

                  return (
                    <div key={col.id} className="flex flex-col">
                      <label className="mb-2 font-semibold text-gray-700">{col.title}</label>
                      <select 
                        value={formData[col.id] || ""}
                        onChange={(e) => handleInputChange(col.id, e.target.value)}
                        className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
                      >
                        <option value="">Select {col.title}...</option>
                        {statusOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  );
                }

                if (col.type === 'date') {
                  return (
                    <div key={col.id} className="flex flex-col">
                      <label className="mb-2 font-semibold text-gray-700">{col.title}</label>
                      <input
                        type="date"
                        value={formData[col.id] || ""}
                        onChange={(e) => handleInputChange(col.id, e.target.value)}
                        className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      />
                    </div>
                  );
                }

                return (
                  <div key={col.id} className="flex flex-col">
                    <label className="mb-2 font-semibold text-gray-700">{col.title}</label>
                    <input
                      type="text"
                      placeholder={`Enter ${col.title}...`}
                      value={formData[col.id] || ""}
                      onChange={(e) => handleInputChange(col.id, e.target.value)}
                      className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`w-full mt-8 text-white font-bold py-3 px-4 rounded-md transition shadow-md ${
                  isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? `Sending ${activeForm.name} to monday.com...` : `Submit ${activeForm.name}`}
              </button>
            </form>
          )}

        </div>
      </div>
    </main>
  );
}