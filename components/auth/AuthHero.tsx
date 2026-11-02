import { BrandArt } from "@/components/ui/BrandArt";
import { LogoMark } from "@/components/ui/Logo";
import styles from "./auth.module.css";

/**
 * Brand panel for the auth screens. Left column on desktop; a compact banner
 * above the form on mobile (the one-liner is dropped there to keep the form
 * above the fold).
 */
export function AuthHero() {
  return (
    <aside className={styles.hero}>
      <BrandArt className={styles.art} />

      <div className={styles.heroBody}>
        <div className={styles.lockup}>
          <LogoMark className={styles.logo} size={56} />
          <p className={styles.wordmark}>Onward</p>
        </div>
        <p className={styles.tagline}>A quiet place to see what&rsquo;s next and get it done.</p>
      </div>
    </aside>
  );
}
