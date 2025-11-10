// src/App.tsx
import { useState, useEffect, useRef } from "react";
import { socket } from "./services/socket.ts";
import { LotteryBoard } from "./components/LotteryBoard/LotteryBoard.tsx";
import styles from "./App.module.css";
import { CrierView } from "./components/CrierView/CrierView.tsx";
import { GameOverModal } from "./components/GameOverModal/GameOverModal.tsx";
import { LoginView } from "./components/LoginView/LoginView.tsx";
import { AnimatedBackground } from "./components/AnimatedBackground/AnimatedBackground"; // Asegúrate de tener esta importación

// --- 1. DEFINIMOS EL NUEVO TIPO 'TARJETA' ---
type Tarjeta = { palabra: string; descripcion: string; };
type Player = { id: string; name: string; role: 'crier' | 'player' };
type Toast = { id: number; message: string; type: 'connect' | 'disconnect' };

function App() {
    // Lógica para manejar el audio
    const musicaLoginRef = useRef<HTMLAudioElement | null>(null);
    const musicaCantadorRef = useRef<HTMLAudioElement | null>(null);
    const musicaJugadorRef = useRef<HTMLAudioElement | null>(null);

    // CORRECCIÓN 1: Unificamos el estado de silencio y lo iniciamos en 'true'
    const [isMuted, setIsMuted] = useState(true);

    // Estados del juego
    const [markedWords, setMarkedWords] = useState<string[]>([]);
    const [deck, setDeck] = useState<Tarjeta[]>([]); // Ahora es un array de Tarjetas
    const [calledCards, setCalledCards] = useState<Tarjeta[]>([]); // Ahora es un array de Tarjetas
    const [playerBoard, setPlayerBoard] = useState<string[]>([]);
    const [notification, setNotification] = useState('');
    const [currentView, setCurrentView] = useState<'login' | 'crier' | 'player'>('login');
    const [gameResult, setGameResult] = useState<{ isOver: boolean; winner: Player | null }>({
        isOver: false,
        winner: null,
    });
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [recentCard, setRecentCard] = useState<string | null>(null);
    // --- 3. CORREGIMOS EL TIPO DEL ESTADO 'theme' ---
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    });

    // Función para regresar al inicio
    const handleExitToLogin = () => {
        setCurrentView('login');
    };

    // Lógica para manejar el audio
    // Efecto para inicializar los objetos de audio
    useEffect(() => {
        musicaLoginRef.current = new Audio('/audio/login.ogg');
        musicaLoginRef.current.loop = true;
        musicaLoginRef.current.volume = 0.5;

        musicaCantadorRef.current = new Audio('/audio/cantador.ogg');
        musicaCantadorRef.current.loop = true;
        musicaCantadorRef.current.volume = 0.5;

        musicaJugadorRef.current = new Audio('/audio/jugador.ogg');
        musicaJugadorRef.current.loop = true;
        musicaJugadorRef.current.volume = 0.5;
    }, []);

    // Función principal que dirige la música
    const manejarCambioDeMusica = (nuevaVista: 'login' | 'crier' | 'player' | 'end') => {
        musicaLoginRef.current?.pause();
        musicaCantadorRef.current?.pause();
        musicaJugadorRef.current?.pause();

        if (isMuted || nuevaVista === 'end') return;

        switch (nuevaVista) {
            case 'login':
                musicaLoginRef.current?.play().catch(() => {});
                break;
            case 'crier':
                musicaCantadorRef.current?.play().catch(() => {});
                break;
            case 'player':
                musicaJugadorRef.current?.play().catch(() => {});
                break;
        }
    }

    //Lógica de Audio
    // CORRECCIÓN 2: Usamos 'isMuted' en la dependencia
    useEffect(() => {
        manejarCambioDeMusica(currentView);
    }, [currentView, isMuted, manejarCambioDeMusica]);

    // Efecto que aplica el tema al HTML y lo guarda
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Efecto para toda la lógica de sockets
    useEffect(() => {
        const addToast = (message: string, type: Toast['type']) => {
            const id = Date.now();
            setToasts(prev => [...prev, { id, message, type }]);
            setTimeout(() => {
                setToasts(prev => prev.filter(toast => toast.id !== id));
            }, 4000);
        };

        const handleAuthSuccess = () => setCurrentView('crier');
        const handlePlayerAssigned = () => setCurrentView('player');

        socket.on('connect', () => addToast('¡Te has conectado!', 'connect'));
        socket.on('disconnect', () => addToast('Te has desconectado.', 'disconnect'));

        // --- 5. ACTUALIZAMOS CÓMO SE RECIBEN LOS DATOS ---
        socket.on('game:gameState', (state: { deck: Tarjeta[], calledCards: Tarjeta[], isGameWon: boolean, winner: Player | null }) => {
            setDeck(state.deck);
            setCalledCards(state.calledCards);
            // Creamos el tablero del jugador extrayendo solo las palabras
            const boardWords = state.deck.slice(0, 24).map(card => card.palabra);
            setPlayerBoard(boardWords);
            setMarkedWords([]);
            setGameResult({ isOver: state.isGameWon, winner: state.winner });
        });

        socket.on('game:newCard', (data: { newCard: Tarjeta, allCalledCards: Tarjeta[] }) => {
            setCalledCards(data.allCalledCards);
            setRecentCard(data.newCard.palabra); // El resaltado usa la palabra
            setTimeout(() => {
                setRecentCard(null);
            }, 2000);
        });

        socket.on('game:gameOver', ({ winner }) => {
            setGameResult({ isOver: true, winner: winner });
            manejarCambioDeMusica('end');
        });

        socket.on('user:connected', ({ name }) => addToast(`Jugador '${name}' se ha unido.`, 'connect'));
        socket.on('user:disconnected', ({ name }) => addToast(`Jugador '${name}' se ha ido.`, 'disconnect'));
        socket.on('crier:authSuccess', handleAuthSuccess);
        socket.on('player:assigned', handlePlayerAssigned);
        socket.on('crier:authFailed', () => alert('Contraseña incorrecta o el rol de cantador ya está ocupado.'));
        socket.on('server:roomFull', () => alert('La sala está llena. No puedes unirte.'));

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('game:gameState');
            socket.off('game:newCard');
            socket.off('game:gameOver');
            socket.off('user:connected');
            socket.off('user:disconnected');
            socket.off('crier:authSuccess', handleAuthSuccess);
            socket.off('player:assigned', handlePlayerAssigned);
            socket.off('crier:authFailed');
            socket.off('server:roomFull');
        };
    }, [manejarCambioDeMusica]); // Añadimos la dependencia que faltaba

    // Lógica de Audio
    // CORRECCIÓN 3: La función ahora actualiza 'isMuted'
    const toggleMute = () => {
        setIsMuted(prev => !prev);
    };

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const handleCardClick = (clickedWord: string) => {
        // CORRECCIÓN: Extraemos las palabras del array de objetos y luego comparamos
        const calledWordsList = calledCards.map(card => card.palabra);

        if (!calledWordsList.includes(clickedWord)) {
            setNotification(`¡La carta "${clickedWord}" aún no ha salido!`);
            setTimeout(() => setNotification(''), 2500);
            return;
        }
        if (markedWords.includes(clickedWord)) {
            setMarkedWords(markedWords.filter(word => word !== clickedWord));
        } else {
            setMarkedWords([...markedWords, clickedWord]);
        }
    };

    const handleJoinAsPlayer = () => {
        setCurrentView('player');
    };

    const renderView = () => {
        switch (currentView) {
            case 'crier':
                // 6. PASAMOS LOS OBJETOS COMPLETOS AL CANTADOR
                return <CrierView deck={deck} calledCards={calledCards} />;
            case 'player':
                return <LotteryBoard
                    words={playerBoard}
                    markedWords={markedWords}
                    onCardClick={handleCardClick}
                    recentCard={recentCard}
                />;
            case 'login':
            default:
                return <LoginView onJoinAsPlayer={handleJoinAsPlayer} />;
        }
    };

    return (
        <div className={styles.appContainer}>
            <AnimatedBackground theme={theme}/>
            <div className={styles.toastContainer}>
                {toasts.map(toast => (
                    <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
                        {toast.message}
                    </div>
                ))}
            </div>
            {notification && <div className={styles.notification}>{notification}</div>}

            <div className={styles.header}>
                {(currentView === 'player' || currentView === 'crier') && (
                    <button onClick={handleExitToLogin} className={styles.exitButton}>
                        Salir
                    </button>
                )}
                <h1 className={styles.title}>Lotería de Ética y Sostenibilidad</h1>
                <button onClick={toggleTheme} className={styles.themeToggle}>
                    {theme === 'light' ? '🌱' : '💀'}
                </button>
            </div>

            {/* Lógica de Audio */}
            {/* CORRECCIÓN 4: El botón ahora usa 'isMuted' */}
            <button onClick={toggleMute} className={styles.muteButton}>
                {isMuted ? '🔇' : '🔊'}
            </button>

            {renderView()}

            {/* CORRECCIÓN 5: Pasamos la prop 'isMuted' al modal */}
            {gameResult.isOver && <GameOverModal winner={gameResult.winner} role={currentView} isMuted={isMuted}/>}
        </div>
    );
}

export default App;