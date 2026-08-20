/** Curated shelf/category definitions with child-friendly icons. */

export interface CategoryDef {
  id: string
  label: string
  emoji: string
}

export const BUILT_IN_CATEGORIES: CategoryDef[] = [
  { id: 'robert-munsch', label: 'Robert Munsch Collection', emoji: '🎈' },
  { id: 'picture-books', label: 'Picture Books', emoji: '🎨' },
  { id: 'fairy-tales', label: 'Fairy Tales', emoji: '🏰' },
  { id: 'brothers-grimm', label: 'Brothers Grimm', emoji: '🌲' },
  { id: 'andersen', label: 'Hans Christian Andersen', emoji: '🦢' },
  { id: 'folk-tales', label: 'Folk Tales', emoji: '🪕' },
  { id: 'bedtime', label: 'Bedtime Stories', emoji: '🌙' },
  { id: 'poetry-rhymes', label: 'Poems & Rhymes', emoji: '🎵' },
  { id: 'short-reads', label: 'Short Reads', emoji: '⏳' },
  { id: 'chapter-books', label: 'Chapter Books', emoji: '📗' },
  { id: 'classics', label: 'Public-Domain Classics', emoji: '📜' },
  { id: 'animals', label: 'Animal Friends', emoji: '🦊' },
  { id: 'adventure', label: 'Adventures', emoji: '🗺️' },
  { id: 'funny', label: 'Giggles', emoji: '😄' },
]

export function categoryLabel(id: string, custom: CategoryDef[] = []): string {
  const def =
    BUILT_IN_CATEGORIES.find((c) => c.id === id) ?? custom.find((c) => c.id === id)
  if (def) return def.label
  return id.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

export function categoryEmoji(id: string, custom: CategoryDef[] = []): string {
  const def =
    BUILT_IN_CATEGORIES.find((c) => c.id === id) ?? custom.find((c) => c.id === id)
  return def?.emoji ?? '📚'
}
