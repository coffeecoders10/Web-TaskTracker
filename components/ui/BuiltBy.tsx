import Image from "next/image";
import styles from "./built-by.module.css";

/** Small "Built by CoffeeCoders" credit. Placement and alignment come from the caller's `className`. */
export function BuiltBy({ className }: { className?: string }) {
  return (
    <p className={className ? `${styles.builtBy} ${className}` : styles.builtBy}>
      <Image
        className={styles.logo}
        src="/coffeecoders_logo.png"
        alt=""
        width={28}
        height={28}
      />
      <span>
        Built by <strong className={styles.name}>CoffeeCoders</strong>
      </span>
    </p>
  );
}
