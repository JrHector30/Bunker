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
      className={`relative w-full max-w-[420px] ${isOpen ? 'z-[100]' : 'z-auto'}`}
      style={{ fontFamily: 'var(--font-sans)' }}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        id="combobox-trigger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-all duration-150 text-left text-sm cursor-pointer"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-main)',
          borderColor: 'var(--glass-border)',
          borderWidth: '1px',
          borderStyle: 'solid',
          fontFamily: 'var(--font-sans)',
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span 
          className={selectedItem ? "font-semibold" : ""}
          style={{ color: selectedItem ? 'var(--text-main)' : 'var(--text-muted)' }}
        >
          {selectedItem ? selectedItem.name : "Seleccione plato..."}
        </span>
        <ChevronsUpDown className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--text-muted)' }} />
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
            className="absolute left-0 right-0 z-[150] mt-1 rounded-xl shadow-2xl overflow-hidden flex flex-col"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--glass-border)',
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
          >
            {/* Search Header */}
            <div 
              className="flex items-center px-4 py-3 border-b"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--glass-border)',
              }}
            >
              <Search className="w-5 h-5 shrink-0" style={{ color: 'var(--text-muted)' }} />
              <input
                id="search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar platos o filtrar por categoría..."
                className="ml-3 w-full outline-hidden text-sm bg-transparent border-none p-0"
                style={{
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                }}
                autoFocus
              />
              {searchQuery && (
                <button
                  id="clear-search-button"
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-full hover:bg-zinc-800/50 shrink-0 transition-colors cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div 
              className="px-4 py-2 border-b flex flex-wrap gap-1.5 items-center"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--glass-border)',
              }}
            >
              <span 
                className="text-[10px] font-bold uppercase tracking-wider mr-1 select-none"
                style={{ color: 'var(--text-muted)' }}
              >
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
                    className="px-3 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer select-none hover:text-[var(--text-main)] hover:border-[var(--text-main)]"
                    style={{
                      backgroundColor: isActive ? 'var(--primary)' : 'var(--bg-surface)',
                      borderColor: isActive ? 'var(--primary)' : 'var(--glass-border)',
                      color: isActive ? 'var(--text-inverse)' : 'var(--text-muted)',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Options List */}
            <div
              id="options-list"
              ref={listRef}
              role="listbox"
              className="max-h-[280px] overflow-y-auto py-2 px-1"
              style={{ backgroundColor: 'var(--bg-primary)' }}
            >
              {filteredItems.length > 0 ? (
                categoriesList.map((cat) => {
                  const isCatAllowed = activeCategory === 'Todos' || activeCategory === cat;
                  if (!isCatAllowed) return null;

                  const itemsInCat = filteredItems.filter((i) => i.category === cat);
                  if (itemsInCat.length === 0) return null;

                  return (
                    <div key={cat} className="px-2 py-1.5">
                      <span 
                        className="text-[10px] font-bold uppercase tracking-wider px-2 block mb-1"
                        style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}
                      >
                        {cat}
                      </span>
                      
                      <div className="space-y-0.5">
                        {itemsInCat.map((item) => {
                          const globalIndex = filteredItems.indexOf(item);
                          const isSelected = selectedItem?.id === item.id;
                          const isHighlighted = globalIndex === highlightedIndex;

                          let btnStyle = {
                            backgroundColor: 'transparent',
                            borderColor: 'transparent',
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-sans)',
                          };

                          if (isSelected) {
                            btnStyle = {
                              backgroundColor: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                              borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                              color: 'var(--text-main)',
                              fontFamily: 'var(--font-sans)',
                            };
                          } else if (isHighlighted) {
                            btnStyle = {
                              backgroundColor: 'var(--bg-secondary)',
                              borderColor: 'var(--glass-border)',
                              color: 'var(--text-main)',
                              fontFamily: 'var(--font-sans)',
                            };
                          }

                          return (
                            <button
                              id={`option-${item.id}`}
                              key={item.id}
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => handleSelect(item)}
                              onMouseEnter={() => setHighlightedIndex(globalIndex)}
                              className="flex items-center w-full px-2 py-1.5 rounded-md transition-all text-left cursor-pointer border"
                              style={btnStyle}
                            >
                              <div className="w-5 flex justify-center shrink-0">
                                {isSelected ? (
                                  <Check className="w-4 h-4 font-bold" style={{ color: 'var(--primary)' }} />
                                ) : (
                                  <div 
                                    className="w-1.5 h-1.5 rounded-full transition-colors" 
                                    style={{ 
                                      backgroundColor: 'var(--primary)',
                                      opacity: isHighlighted ? 1 : 0
                                    }}
                                  />
                                )}
                              </div>

                              <span className="ml-3 text-sm flex-1">
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
                <div 
                  className="py-8 text-center text-sm font-normal"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}
                >
                  No se encontraron platos.
                </div>
              )}
            </div>

            {/* Selection Guide Footer */}
            <div 
              className="px-4 py-2 border-t flex items-center justify-between"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--glass-border)',
              }}
            >
              <div className="flex space-x-3">
                <div 
                  className="flex items-center text-[10px] select-none"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <span 
                    className="border rounded px-1.5 py-0.5 mr-1 font-semibold font-mono text-[9px]"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--glass-border)',
                      color: 'var(--text-main)',
                    }}
                  >
                    ↑↓
                  </span> 
                  Navegar
                </div>
                <div 
                  className="flex items-center text-[10px] select-none"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <span 
                    className="border rounded px-1.5 py-0.5 mr-1 font-semibold font-mono text-[9px]"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--glass-border)',
                      color: 'var(--text-main)',
                    }}
                  >
                    Enter
                  </span> 
                  Seleccionar
                </div>
              </div>
              <div 
                className="text-[10px] font-semibold uppercase tracking-wider select-none"
                style={{ color: 'var(--text-muted)' }}
              >
                Selección Única
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
