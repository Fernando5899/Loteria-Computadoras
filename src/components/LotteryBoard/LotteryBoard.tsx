import {useEffect, useState} from "react";
import { LotteryCard } from "../LotteryCard/LotteryCard.tsx";
import styles from "./LotteryBoard.module.css";
import { socket } from "../../services/socket.ts";
import { checkWin } from "../../utils/gameLogic.ts";

type LotteryBoardProps = {
    words: string[]; // El tablero recibe un array de strings
    markedWords: string[];
    onCardClick: (word: string) => void;
    recentCard: string | null;
};

export const LotteryBoard = ({ words, markedWords, onCardClick, recentCard }: LotteryBoardProps) => {
    const [canWin, setCanWin] = useState(false);

    // Cada vez que las cartas marcadas cambien, verificamos si hay una victoria
    useEffect(() => {
        const hasWon = checkWin(words, markedWords);
        setCanWin(hasWon);
    }, [words, markedWords]);

    const handleWinClick = () => {
        // Le decimos al servidor que creemos que hemos ganado
        socket.emit('player:declareWinner');
    };
    return (
        <div className={styles.boardContainer}>
            <div className={styles.board}>
                {words.map((word) => (
                    <LotteryCard
                        key={word}
                        word={word}
                        // Pasamos la información a cada carta
                        isMarked={markedWords.includes(word)}
                        onClick={onCardClick}
                        isRecent={word === recentCard}
                    />
                ))}
            </div>
            {/* El botón de ganar solo se muestra si hay una condición de victoria */}
            {canWin && (
                <button onClick={handleWinClick} className={styles.winButton}>
                    ¡Lotería!
                </button>
            )}
        </div>
    );
};