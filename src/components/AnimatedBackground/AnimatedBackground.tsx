// src/components/AnimatedBackground/AnimatedBackground.tsx
import styles from './AnimatedBackground.module.css';

// 1. Definimos las props que el componente espera
type Props = {
    theme: 'light' | 'dark'; // Espera saber cuál es el tema
};

const particles = Array.from({ length: 15 });

export const AnimatedBackground = ({ theme }: Props) => {
    return (
        <div className={styles.container}>
            {/* 2. Usamos un renderizado condicional */}
            {theme === 'light' ? (
                // Si el tema es 'light', solo renderizamos las hojas
                particles.map((_, i) => (
                    <span
                        key={`leaf-${i}`}
                        className={`${styles.particle} ${styles.leaf}`}
                        style={{
                            left: `${Math.random() * 100}vw`,
                            animationDelay: `${Math.random() * 10}s`,
                        }}
                    >
                        🌱
                    </span>
                ))
            ) : (
                // Si el tema es 'dark', solo renderizamos las calaveras
                particles.map((_, i) => (
                    <span
                        key={`chaos-${i}`}
                        className={`${styles.particle} ${styles.chaos}`}
                        style={{
                            left: `${Math.random() * 100}vw`,
                            animationDelay: `${Math.random() * 10}s`,
                        }}
                    >
                        💀
                    </span>
                ))
            )}
        </div>
    );
};