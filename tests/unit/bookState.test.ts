import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import {
  clearAllProgress,
  markUnread,
  recordOpened,
  recordPageTurn,
  removeHistoryEntry,
  restartBook,
  toggleFavourite,
} from '@/lib/bookState'

describe('reading progress & favourites (local persistence)', () => {
  beforeEach(async () => {
    await db.bookState.clear()
  })

  it('records page turns and computes completion', async () => {
    await recordPageTurn('b1', 3, 10)
    let state = await db.bookState.get('b1')
    expect(state?.currentPage).toBe(3)
    expect(state?.completed).toBe(0)

    await recordPageTurn('b1', 10, 10)
    state = await db.bookState.get('b1')
    expect(state?.completed).toBe(1)
    expect(state?.completedAt).toBeTruthy()
  })

  it('records opens for the Continue Reading shelf', async () => {
    await recordOpened('b2', 8)
    const state = await db.bookState.get('b2')
    expect(state?.lastOpenedAt).toBeTruthy()
    expect(state?.totalPages).toBe(8)
  })

  it('toggles favourites', async () => {
    expect(await toggleFavourite('b3', 5)).toBe(true)
    expect((await db.bookState.get('b3'))?.favourite).toBe(1)
    expect(await toggleFavourite('b3', 5)).toBe(false)
    expect((await db.bookState.get('b3'))?.favourite).toBe(0)
  })

  it('restart and mark-unread reset progress', async () => {
    await recordPageTurn('b4', 6, 6)
    await restartBook('b4')
    expect((await db.bookState.get('b4'))?.currentPage).toBe(1)
    expect((await db.bookState.get('b4'))?.completed).toBe(0)

    await recordPageTurn('b4', 4, 6)
    await markUnread('b4')
    expect((await db.bookState.get('b4'))?.lastOpenedAt).toBeUndefined()
  })

  it('removing history keeps favourites, drops the rest', async () => {
    await recordPageTurn('fav', 2, 5)
    await toggleFavourite('fav', 5)
    await recordPageTurn('plain', 2, 5)

    await removeHistoryEntry('fav')
    await removeHistoryEntry('plain')

    expect((await db.bookState.get('fav'))?.favourite).toBe(1)
    expect((await db.bookState.get('fav'))?.currentPage).toBe(1)
    expect(await db.bookState.get('plain')).toBeUndefined()
  })

  it('clearAllProgress preserves favourite flags only', async () => {
    await recordPageTurn('a', 3, 5)
    await toggleFavourite('a', 5)
    await recordPageTurn('b', 3, 5)

    await clearAllProgress()

    expect((await db.bookState.get('a'))?.favourite).toBe(1)
    expect((await db.bookState.get('a'))?.currentPage).toBe(1)
    expect(await db.bookState.get('b')).toBeUndefined()
  })
})
