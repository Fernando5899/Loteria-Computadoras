// src/components/CrierView/CrierView.tsx
import styles from './CrierView.module.css';
import { socket } from "../../services/socket.ts";

// 1. DEFINIMOS EL TIPO 'TARJETA' (debe coincidir con App.tsx)
type Tarjeta = {
    palabra: string;
    descripcion: string;
};

// 2. ACTUALIZAMOS LAS PROPS QUE RECIBIMOS
type CrierViewProps = {
    deck: Tarjeta[];
    calledCards: Tarjeta[];
};

export const CrierView = ({ deck, calledCards }: CrierViewProps) => {
    // 3. LÓGICA PARA MANEJAR EL OBJETO 'Tarjeta'
    const currentCardObject = calledCards.length > 0 ? calledCards[calledCards.length - 1] : null;

    // Si hay una carta, mostramos su descripción. Si no, el mensaje inicial.
    const currentDescription = currentCardObject ? currentCardObject.descripcion : '¡Presiona para empezar!';
    // Si hay una carta, mostramos su palabra entre paréntesis.
    const currentWord = currentCardObject ? `(Carta: ${currentCardObject.palabra})` : '';

    const remainingCards = deck.length - calledCards.length;

    const handleNextCard = () => {
        socket.emit('crier:callNextCard'); // El evento sigue siendo el mismo
    };

    return (
        <div className={styles.container}>
            {/* --- COLUMNA IZQUIERDA: CONTROLES PRINCIPALES --- */}
            <div className={styles.mainControls}>
                <div className={styles.mainCardWrapper}>
                    <p className={styles.mainCardLabel}>Descripción (Pista)</p>
                    {/* 4. MOSTRAMOS LA DESCRIPCIÓN Y LA PALABRA */}
                    <div className={styles.mainCard}>{currentDescription}</div>
                    <p className={styles.mainCardLabel}>{currentWord}</p>
                </div>
                <button
                    onClick={handleNextCard}
                    disabled={remainingCards <= 0}
                    className={styles.nextButton}
                >
                    {calledCards.length === 0 ? 'Empezar Juego' : 'Siguiente Carta'}
                </button>
            </div>

            {/* --- COLUMNA DERECHA: INFORMACIÓN DEL JUEGO --- */}
            <div className={styles.gameInfo}>
                <div className={styles.stats}>
                    <div className={styles.statBox}>
                        <span className={styles.statValue}>{calledCards.length}</span>
                        <span className={styles.statLabel}>Cantadas</span>
                    </div>
                    <div className={styles.statBox}>
                        <span className={styles.statValue}>{remainingCards}</span>
                        <span className={styles.statLabel}>Restantes</span>
                    </div>
                </div>
                <div className={styles.history}>
                    <p className={styles.historyTitle}>Historial</p>
                    <div className={styles.historyGrid}>
                        {/* 5. ACTUALIZAMOS EL HISTORIAL PARA QUE MUESTRE LA PALABRA */}
                        {calledCards.slice().reverse().map(card => (
                            // Usamos card.palabra como key y como contenido
                            <div key={card.palabra} className={styles.historyCard}>
                                {card.palabra}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};