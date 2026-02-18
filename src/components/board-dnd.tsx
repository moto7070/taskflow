"use client";

import { useMemo, useState, useTransition } from "react";

import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TaskItem {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "todo" | "in_progress" | "review" | "done";
}

interface BoardColumn {
  id: string;
  name: string;
  sortOrder: number;
  tasks: TaskItem[];
}

interface BoardDndProps {
  projectId: string;
  initialColumns: BoardColumn[];
}

function findColumnByTask(columns: BoardColumn[], taskId: string): BoardColumn | undefined {
  return columns.find((col) => col.tasks.some((task) => task.id === taskId));
}

function TaskCard({ task }: { task: TaskItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm"
    >
      <p className="font-medium text-slate-900">{task.title}</p>
      <p className="mt-1 text-xs text-slate-500">
        {task.priority} / {task.status}
      </p>
    </div>
  );
}

function ColumnContainer({ column }: { column: BoardColumn }) {
  return (
    <div className="w-72 flex-shrink-0 rounded-lg border border-slate-200 bg-slate-100 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">{column.name}</h2>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
          {column.tasks.length}
        </span>
      </div>
      <div className="space-y-2">
        <SortableContext items={column.tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export function BoardDnd({ projectId, initialColumns }: BoardDndProps) {
  const [columns, setColumns] = useState(initialColumns);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor));

  const taskIds = useMemo(() => columns.flatMap((col) => col.tasks.map((task) => task.id)), [columns]);

  const persistOrder = (nextColumns: BoardColumn[]) => {
    startTransition(async () => {
      const payload = {
        projectId,
        columns: nextColumns.map((col) => ({
          id: col.id,
          taskIds: col.tasks.map((task) => task.id),
        })),
      };

      const res = await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({ error: "Failed to reorder tasks." }))) as {
          error?: string;
        };
        window.alert(data.error ?? "Failed to reorder tasks.");
      }
    });
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveTaskId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const sourceColumn = findColumnByTask(columns, activeId);
    const targetColumn = findColumnByTask(columns, overId);
    if (!sourceColumn || !targetColumn) return;

    const sourceIndex = sourceColumn.tasks.findIndex((task) => task.id === activeId);
    const targetIndex = targetColumn.tasks.findIndex((task) => task.id === overId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextColumns = columns.map((col) => ({ ...col, tasks: [...col.tasks] }));
    const source = nextColumns.find((c) => c.id === sourceColumn.id);
    const target = nextColumns.find((c) => c.id === targetColumn.id);
    if (!source || !target) return;

    if (source.id === target.id) {
      source.tasks = arrayMove(source.tasks, sourceIndex, targetIndex);
      setColumns(nextColumns);
      persistOrder(nextColumns);
      return;
    }

    const [moved] = source.tasks.splice(sourceIndex, 1);
    target.tasks.splice(targetIndex, 0, moved);
    setColumns(nextColumns);
    persistOrder(nextColumns);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {taskIds.length === 0
            ? "No tasks yet. Add tasks in the next step."
            : "Drag and drop tasks to reorder or move between columns."}
        </p>
        {isPending ? <p className="text-xs text-slate-500">Saving...</p> : null}
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {columns.map((column) => (
            <ColumnContainer key={column.id} column={column} />
          ))}
        </div>
      </DndContext>
      {activeTaskId ? <p className="text-xs text-slate-500">Dragging: {activeTaskId}</p> : null}
    </section>
  );
}
