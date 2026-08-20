import { useAssetUrl } from '@/lib/useAssetUrl'
import type { DraftPage } from './wizardTypes'
import styles from './wizard.module.css'

/** Thumbnail for a draft page, whether freshly imported or already stored. */
export default function PagePreview({ page, alt }: { page: DraftPage; alt: string }) {
  const storedUrl = useAssetUrl(page.imageBlob ? undefined : page.imageRef)
  const url = page.previewUrl ?? storedUrl
  return url ? (
    <img className={styles.pageThumb} src={url} alt={alt} loading="lazy" />
  ) : (
    <div className={styles.pageThumb} aria-hidden="true" />
  )
}
