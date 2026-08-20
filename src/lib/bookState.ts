import { db, type BookStateRow } from './db'
import { nowIso } from './util'

/** Reading progress, favourites and history — all stored locally. */

async function getOrCreate(bookId: string, totalPages: number): Promise<BookStateRow> {
  const existing = await db.bookState.get(bookId)
  if (existing) return existing
  const fresh: BookStateRow = {
    bookId,
    currentPage: 1,
    totalPages,
    completed: 0,
    favourite: 0,
  }
  await db.bookState.put(fresh)
  return fresh
}

export async function recordPageTurn(bookId: string, page: number, totalPages: number) {
  const state = await getOrCreate(bookId, totalPages)
  const completed = page >= totalPages ? 1 : state.completed
  await db.bookState.put({
    ...state,
    currentPage: page,
    totalPages,
    completed,
    completedAt: completed && !state.completed ? nowIso() : state.completedAt,
    lastOpenedAt: nowIso(),
  })
}

export async function recordOpened(bookId: string, totalPages: number) {
  const state = await getOrCreate(bookId, totalPages)
  await db.bookState.put({ ...state, totalPages, lastOpenedAt: nowIso() })
}

export async function toggleFavourite(bookId: string, totalPages: number): Promise<boolean> {
  const state = await getOrCreate(bookId, totalPages)
  const favourite = state.favourite ? 0 : 1
  await db.bookState.put({
    ...state,
    favourite,
    favouritedAt: favourite ? nowIso() : undefined,
  })
  return favourite === 1
}

export async function restartBook(bookId: string) {
  const state = await db.bookState.get(bookId)
  if (!state) return
  await db.bookState.put({ ...state, currentPage: 1, completed: 0, completedAt: undefined })
}

export async function markUnread(bookId: string) {
  const state = await db.bookState.get(bookId)
  if (!state) return
  await db.bookState.put({
    ...state,
    currentPage: 1,
    completed: 0,
    completedAt: undefined,
    lastOpenedAt: undefined,
  })
}

export async function removeHistoryEntry(bookId: string) {
  const state = await db.bookState.get(bookId)
  if (!state) return
  if (state.favourite) {
    await db.bookState.put({
      ...state,
      currentPage: 1,
      completed: 0,
      lastOpenedAt: undefined,
      completedAt: undefined,
    })
  } else {
    await db.bookState.delete(bookId)
  }
}

export async function clearAllProgress() {
  const all = await db.bookState.toArray()
  for (const s of all) {
    if (s.favourite) {
      await db.bookState.put({
        ...s,
        currentPage: 1,
        completed: 0,
        lastOpenedAt: undefined,
        completedAt: undefined,
      })
    } else {
      await db.bookState.delete(s.bookId)
    }
  }
}
