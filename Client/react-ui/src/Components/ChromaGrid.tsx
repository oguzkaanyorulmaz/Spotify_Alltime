import React, { useState, useRef } from 'react';
import './ChromaGrid.css';

export interface ChromaItem {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  handle?: string;
  borderColor?: string;
  gradient?: string;
  url?: string;
  location?: string;
}

interface ChromaGridProps {
  items: ChromaItem[];
  pinnedIds?: string[];
  onPinToggle?: (id: string) => void;
  onItemClick?: (item: ChromaItem) => void;
  onReorder?: (newItems: ChromaItem[]) => void;
}

export default function ChromaGrid({
  items = [],
  pinnedIds = [],
  onPinToggle,
  onItemClick,
  onReorder
}: ChromaGridProps) {
  const dragItem = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const handleCardClick = (item: ChromaItem) => {
    if (draggingIndex === null && onItemClick) {
      onItemClick(item);
    }
  };

  const handleCardMove = (e: React.MouseEvent<HTMLElement>) => {
    if (draggingIndex !== null) return;
    const c = e.currentTarget as HTMLElement;
    const rect = c.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    c.style.setProperty('--mouse-x', `${x}px`);
    c.style.setProperty('--mouse-y', `${y}px`);
  };

  // Drag and Drop Handlers (Real-time sorting)
  const handleDragStart = (e: React.DragEvent, position: number) => {
    dragItem.current = position;
    
    // Delay setting dragging index so the browser captures the full styling of the card for the drag ghost image
    setTimeout(() => {
      setDraggingIndex(position);
    }, 0);
    
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, position: number) => {
    e.preventDefault();
    if (dragItem.current !== null && dragItem.current !== position) {
      const copyListItems = [...items];
      const dragItemContent = copyListItems[dragItem.current];
      
      // Swap/Move item in the list
      copyListItems.splice(dragItem.current, 1);
      copyListItems.splice(position, 0, dragItemContent);
      
      // Update refs and indices immediately before triggering state change
      dragItem.current = position;
      setDraggingIndex(position);
      
      if (onReorder) {
        onReorder(copyListItems);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    dragItem.current = null;
  };

  return (
    <div className="chroma-grid-root">
      {items.map((c, i) => {
        const isAlwaysColorful = c.title.replace(/\s+/g, '') === "'2'+'2'" || c.title.replace(/\s+/g, '') === "2+2";
        const isPinned = pinnedIds.includes(c.id);
        return (
          <article
            key={c.id}
            className={`chroma-grid-card ${draggingIndex === i ? 'dragging' : ''} ${isAlwaysColorful ? 'always-colorful' : ''} ${isPinned ? 'pinned' : ''}`}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, i)}
            onDragEnter={(e) => handleDragEnter(e, i)}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            style={{
              '--mouse-x': '50%',
              '--mouse-y': '50%',
              '--card-border': c.borderColor || 'transparent',
              '--spotlight-color': 'rgba(255,255,255,0.22)',
              background: c.gradient || '#ffffff',
              cursor: 'grab',
              zIndex: isAlwaysColorful ? 12 : 1
            } as React.CSSProperties}
            onMouseMove={handleCardMove}
            onClick={() => handleCardClick(c)}
          >
            {/* Pin Toggle Button */}
            <div
              className={`chroma-grid-pin-button ${isPinned ? 'is-pinned' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onPinToggle) onPinToggle(c.id);
              }}
              title={isPinned ? "Sabitlemeyi Kaldır" : "Sabitle"}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
              </svg>
            </div>
          {/* Card Hover Spotlight Overlay */}
          <div
            className="chroma-grid-card-spotlight"
            style={{
              background: 'radial-gradient(circle at var(--mouse-x) var(--mouse-y), var(--spotlight-color), transparent 70%)'
            }}
          />

          <div className="chroma-grid-card-body">
            <div className="chroma-grid-card-image-container">
              <img
                src={c.image}
                alt={c.title}
                loading="lazy"
                className="chroma-grid-card-image"
                draggable={false}
              />
            </div>
          </div>

          <footer className="chroma-grid-card-footer">
            <h3 className="chroma-grid-card-title">{c.title}</h3>
            {c.handle && <span className="chroma-grid-card-handle">{c.handle}</span>}
            <p className="chroma-grid-card-subtitle">{c.subtitle}</p>
            {c.location && <span className="text-[0.85rem] text-[#aaa] text-right">{c.location}</span>}
          </footer>
        </article>
        );
      })}
    </div>
  );
}
