import { ThemeToggle } from '@/components/ui/theme-toggle';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-contrast shadow-card">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-[19px]"
            >
              <path d="M3 17.5 9 11l4 4 8-8.5" />
              <path d="M21 10V6h-4" />
            </svg>
          </span>

          <div className="leading-tight">
            <h1 className="text-[15px] font-semibold tracking-tight text-ink">Lead Tracker</h1>
            <p className="hidden text-xs text-ink-subtle sm:block">Pipeline for inbound leads</p>
          </div>
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}
