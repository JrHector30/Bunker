import { useState, useRef, useEffect } from 'react';
import { Search, Check, X, ChevronsUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function CategorizedCombobox({
  items,
  selectedItem,
  onSelect,
  categoriesList,
  closeOnSelect = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const listRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter items by active category and search query
  const filteredItems = items.filter((item) => {
    const matchesCategory = activeCategory === 'Todos' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Reset highlighted index when filters change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, activeCategory]);

  const handleSelect = (item) => {
    const isDeselect = selectedItem?.id === item.id;
    if (isDeselect) {
      onSelect(null);
    } else {
      onSelect(item);
    }
    
    if (closeOnSelect) {
      setIsOpen(false);
    }
  };

  // Keyboard navigation support
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredItems.length > 0 && highlightedIndex < filteredItems.length) {
          handleSelect(filteredItems[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div 
      id="combobox-container"
      ref={containerRef} 
      className="relative w-full max-w-[420px] font-sans"
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        id="combobox-trigger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-lg shadow-sm transition-all duration-155 text-left focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-sm cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedItem ? "text-slate-900 font-semibold" : "text-slate-400"}>
          {selectedItem ? selectedItem.name : "Select item..."}
        </span>
        <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="combobox-dropdown"
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 8, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Search Header */}
            <div className="flex items-center px-4 py-3 border-b border-slate-100 bg-white">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                id="search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items or filter by category..."
                className="ml-3 w-full outline-hidden text-sm placeholder-slate-400 bg-transparent text-slate-900 focus:outline-hidden border-none p-0"
                autoFocus
              />
              {searchQuery && (
                <button
                  id="clear-search-button"
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 select-none">
                Categoría:
              </span>
              {['Todos', ...categoriesList].map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    id={`pill-${cat}`}
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer select-none ${
                      isActive
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 shadow-2xs"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Options List grouped by categories */}
            <div
              id="options-list"
              ref={listRef}
              role="listbox"
              className="max-h-[280px] overflow-y-auto py-2 px-1 bg-white"
            >
              {filteredItems.length > 0 ? (
                categoriesList.map((cat) => {
                  const isCatAllowed = activeCategory === 'Todos' || activeCategory === cat;
                  if (!isCatAllowed) return null;

                  const itemsInCat = filteredItems.filter((i) => i.category === cat);
                  if (itemsInCat.length === 0) return null;

                  return (
                    <div key={cat} className="px-2 py-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                        {cat}
                      </span>
                      
                      <div className="space-y-0.5">
                        {itemsInCat.map((item) => {
                          const globalIndex = filteredItems.indexOf(item);
                          const isSelected = selectedItem?.id === item.id;
                          const isHighlighted = globalIndex === highlightedIndex;

                          return (
                            <button
                              id={`option-${item.id}`}
                              key={item.id}
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => handleSelect(item)}
                              onMouseEnter={() => setHighlightedIndex(globalIndex)}
                              className={`flex items-center w-full px-2 py-1.5 rounded-md transition-all text-left cursor-pointer border ${
                                isSelected
                                  ? "bg-indigo-50 border-indigo-100 text-indigo-700 font-semibold"
                                  : isHighlighted
                                  ? "bg-slate-50 border-slate-50 text-slate-900"
                                  : "bg-transparent border-transparent text-slate-700 hover:bg-slate-50/60"
                              }`}
                            >
                              <div className="w-5 flex justify-center shrink-0">
                                {isSelected ? (
                                  <Check className="w-4 h-4 text-indigo-600 font-bold" />
                                ) : (
                                  <div className={`w-1.5 h-1.5 rounded-full bg-slate-300 transition-colors ${
                                    isHighlighted ? "bg-indigo-400" : "opacity-0"
                                  }`} />
                                )}
                              </div>

                              <span className={`ml-3 text-sm flex-1 ${
                                isSelected ? "text-indigo-900" : "text-slate-700"
                              }`}>
                                {item.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-sm text-slate-400 font-normal">
                  No items found.
                </div>
              )}
            </div>

            {/* Selection Guide Footer */}
            <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex items-center justify-between">
              <div className="flex space-x-3">
                <div className="flex items-center text-[10px] text-slate-400 select-none">
                  <span className="bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-2xs mr-1 font-semibold font-mono text-[9px]">↑↓</span> Navigate
                </div>
                <div className="flex items-center text-[10px] text-slate-400 select-none">
                  <span className="bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-2xs mr-1 font-semibold font-mono text-[9px]">Enter</span> Select item
                </div>
              </div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider select-none">
                Single Selection Mode
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
