import { EmptyState } from '@indxr/shared/EmptyState';
import { FileText, Search, Bell } from 'lucide-react';

export function Default() {
  return (
    <EmptyState
      title="No transcripts yet"
      description="Paste a YouTube URL above to extract and index your first transcript."
      action={{ label: 'Extract transcript', onClick: () => {} }}
    />
  );
}

export function SearchEmpty() {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description="Try a different keyword or clear your search filters."
    />
  );
}

export function NoNotifications() {
  return (
    <EmptyState
      icon={Bell}
      title="All caught up"
      description="You have no messages. New notifications will appear here."
    />
  );
}
