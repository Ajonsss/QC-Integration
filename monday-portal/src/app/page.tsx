"use client";

import { useState, useEffect } from 'react';

export default function Home() {
  const [columns, setColumns] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State for the Searchable Dropdown
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // State for Form Data & Submission Status
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/board')
      .then((res) => res.json())
      .then((data) => {
        if (data.boards && data.boards.length > 0) {
            setColumns(data.boards[0].columns);
            setItems(data.boards[0].items_page.items);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load data", err);
        setLoading(false);
      });
  }, []);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInputChange = (columnId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [columnId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedItemId) {
      alert("Please select an item to update first!");
      return;
    }

    setIsSubmitting(true);

    try {
      // --- NEW: Automatically Inject the Status ---
      // 1. Find the monday.com ID for your Status column
      const statusColumn = columns.find(col => col.title.toLowerCase().includes('status'));
      
      // 2. Copy whatever the user typed into the visible form
      const finalSubmissionData = { ...formData };

      // 3. Forcefully add the automated status update to the payload
      if (statusColumn) {
        finalSubmissionData[statusColumn.id] = { label: "Submitted in GHL" };
      }
      // --------------------------------------------

      const response = await fetch('/api/board/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItemId,
          columnValues: finalSubmissionData, // We send the injected payload here
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
      console.error("Submission failed:", error);
      alert("A network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-xl font-bold text-gray-600">Loading your board...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-10 bg-gray-100">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-4">
          Team Task Form
        </h1>

        <form className="space-y-6">
          
          {/* The Always-Present Item Selection Combobox */}
          <div className="flex flex-col bg-blue-50 p-4 rounded-md border border-blue-100 mb-6 relative">
            <label className="mb-2 font-bold text-blue-900">
              Search & Select Item to Update
            </label>
            
            <input
              type="text"
              placeholder="Type to search items..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
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
                      className={`p-3 hover:bg-blue-100 cursor-pointer transition border-b border-gray-50 last:border-0 ${
                        selectedItemId === item.id ? 'bg-blue-50 font-bold text-blue-700' : 'text-gray-700'
                      }`}
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
            // --- UPDATED: Strict Column Filtering ---
            // Now we ONLY allow the scheduled date to visually render
            const isScheduledDate = col.title.toLowerCase().includes('last date sche');

            if (!isScheduledDate) {
              return null;
            }
            // ----------------------------------------

            // Render Date Columns
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

            // Fallback
            return null;
          })}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full mt-8 text-white font-bold py-3 px-4 rounded-md transition shadow-md ${
              isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? 'Sending to monday.com...' : 'Submit to monday.com'}
          </button>
        </form>
      </div>
    </main>
  );
}