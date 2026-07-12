/** Maps a user's stored `avatarColor` to Tailwind classes for the violet/cyan palette. */
export function avatarColorClasses(color: string): string {
  switch (color) {
    case 'cyan':
      return 'bg-accent/15 text-accent border border-accent/30';
    case 'violet':
    default:
      return 'bg-primary/15 text-primary border border-primary/30';
  }
}
