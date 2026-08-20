import { useEffect, useState } from 'react'
import { resolveAssetUrl } from './assets'
import type { AssetRef } from './schema'

/**
 * Resolves an asset ref to a URL usable in <img>/<audio>. Static refs resolve
 * synchronously on first render; idb: refs resolve once the blob is read.
 */
export function useAssetUrl(ref: AssetRef | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() =>
    ref && !ref.startsWith('idb:') ? undefined : undefined,
  )
  useEffect(() => {
    let alive = true
    if (!ref) {
      setUrl(undefined)
      return
    }
    void resolveAssetUrl(ref).then((u) => {
      if (alive) setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [ref])
  return url
}
