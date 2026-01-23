import { Plus, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
  display_order?: number;
}

interface CharacterScrollerProps {
  characters: Character[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddNew: () => void;
  onReorder?: (characters: Character[]) => void;
  isReorderMode?: boolean;
}

// Sortable Character Item
const SortableCharacterItem = ({
  character,
  selectedId,
  onSelect,
  isReorderMode,
  index,
}: {
  character: Character;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isReorderMode: boolean;
  index: number;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: character.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col items-center gap-1.5 flex-shrink-0 snap-start ${isDragging ? 'opacity-80' : ''}`}
    >
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05 }}
        whileHover={!isReorderMode ? { scale: 1.05 } : undefined}
        whileTap={!isReorderMode ? { scale: 0.95 } : undefined}
        onClick={() => !isReorderMode && onSelect(character.id)}
        className={`relative w-16 h-16 rounded-full overflow-hidden transition-all ${
          selectedId === character.id
            ? 'ring-[3px] ring-primary ring-offset-2 ring-offset-background'
            : ''
        } ${isReorderMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
        {...(isReorderMode ? { ...attributes, ...listeners } : {})}
      >
        {character.avatar_url ? (
          <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/40 to-purple-900/40 flex items-center justify-center">
            <span className="text-lg font-bold text-foreground">
              {character.name[0]?.toUpperCase()}
            </span>
          </div>
        )}
        {isReorderMode && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <GripVertical className="w-5 h-5 text-white" />
          </div>
        )}
      </motion.button>
      <span
        className={`text-xs w-16 text-center truncate ${
          selectedId === character.id ? 'text-primary font-medium' : 'text-muted-foreground'
        }`}
      >
        {character.name.split(' ')[0]}
      </span>
    </div>
  );
};

export const CharacterScroller = ({
  characters,
  selectedId,
  onSelect,
  onAddNew,
  onReorder,
  isReorderMode = false,
}: CharacterScrollerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = characters.findIndex((c) => c.id === active.id);
      const newIndex = characters.findIndex((c) => c.id === over.id);
      const newOrder = arrayMove(characters, oldIndex, newIndex);
      onReorder?.(newOrder);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={scrollRef}
        className="flex flex-row gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 snap-x snap-mandatory"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Add New Character Button */}
        {!isReorderMode && (
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0 snap-start">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAddNew}
              className="w-16 h-16 rounded-full border-2 border-dashed border-primary/60 flex items-center justify-center bg-transparent hover:border-primary transition-colors"
            >
              <Plus className="w-6 h-6 text-primary/60" />
            </motion.button>
            <span className="text-xs text-muted-foreground">New OC</span>
          </div>
        )}

        {/* Character Avatars */}
        <SortableContext
          items={characters.map((c) => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          {characters.map((character, index) => (
            <SortableCharacterItem
              key={character.id}
              character={character}
              selectedId={selectedId}
              onSelect={onSelect}
              isReorderMode={isReorderMode}
              index={index}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
};
