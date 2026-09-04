import React from 'react';
import { useScheduleStore, StatusFilter, PriorityFilter } from '../store/useScheduleStore';
import { Search, X, Plus } from 'lucide-react';
import { clsx } from 'clsx';

export const SearchFilterBar: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    openCreateModal,
  } = useScheduleStore();

  const statusOptions: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
  ];

  const priorityOptions: { key: PriorityFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'high', label: 'High' },
    { key: 'medium', label: 'Medium' },
    { key: 'low', label: 'Low' },
  ];

  return (
    <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-3 bg-canvas border border-hairline rounded-md p-3 shadow-level-1">
      {/* Left: Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="w-4 h-4 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title or description..."
          className="w-full h-9 pl-9 pr-8 rounded-sm border border-hairline bg-canvas-soft text-body-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-ink focus:bg-canvas transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="w-5 h-5 absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-ink-mute hover:text-ink"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Middle & Right: Filters & Add CTA */}
      <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5">
        {/* Status Filter Pill Group */}
        <div className="flex items-center p-0.5 rounded-sm bg-canvas-soft-2 border border-hairline">
          {statusOptions.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={clsx(
                'px-2.5 py-1 text-xs font-mono font-medium rounded-xs transition-all',
                statusFilter === key
                  ? 'bg-canvas text-ink shadow-level-1'
                  : 'text-ink-mute hover:text-ink'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Priority Filter Pill Group */}
        <div className="flex items-center gap-1">
          <span className="hidden xl:inline text-caption-mono text-ink-mute text-[11px] uppercase mr-1">
            Priority:
          </span>
          <div className="flex items-center p-0.5 rounded-sm bg-canvas-soft-2 border border-hairline">
            {priorityOptions.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setPriorityFilter(key)}
                className={clsx(
                  'px-2 py-1 text-xs font-mono font-medium rounded-xs transition-all',
                  priorityFilter === key
                    ? 'bg-canvas text-ink shadow-level-1'
                    : 'text-ink-mute hover:text-ink'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Primary CTA: + Add Entry Button */}
        <button
          type="button"
          onClick={() => openCreateModal()}
          className="h-9 px-4 rounded-pill bg-ink hover:bg-ink/90 text-on-primary font-sans text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 shadow-level-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.2]" />
          <span>Add Entry</span>
        </button>
      </div>
    </div>
  );
};
