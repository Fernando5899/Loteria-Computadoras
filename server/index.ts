// server/index.ts
import express from 'express';
import * as http from 'http';
import { Server, Socket } from 'socket.io';

// --- CONSTANTES Y TIPOS ---
const ALL_WORDS = [
    'CPU', 'ALU', 'RAM', 'ROM', 'Caché', 'GPU', 'Placa Base', 'BIOS/UEFI',
    'Bus de Datos', 'Bus de Direcciones', 'Arquitectura Von Neumann', 'Arquitectura Harvard',
    'Set de Instrucciones (ISA)', 'CISC', 'RISC', 'Pipeline (Segmentación)',
    'Multiprocesamiento', 'Multihilo (Multithreading)', 'Sistema Operativo',
    'Kernel (Núcleo)', 'Drivers (Controladores)', 'SSD', 'HDD', 'Periférico',
    'Puerto (I/O Port)', 'Latencia', 'Ancho de Banda', 'Reloj del Sistema (Clock Speed)',
    'Virtualización', 'Firmware'
];
const MAX_PLAYERS = 30;
const CRIER_PASSWORD = 'Fernando'; // Puedes cambiar esta contraseña

type Player = { id: string; name: string; role: 'crier' | 'player' };

// --- ESTADO DEL JUEGO (VIVE EN EL SERVIDOR) ---
let deck: string[] = [];
let calledCards: string[] = [];
let isGameWon = false;
let winner: Player | null = null; // La única variable para el ganador
let players: Player[] = [];

// --- FUNCIONES DE AYUDA ---
function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function resetGame() {
    console.log('🔄 Reseteando el juego...');
    deck = shuffleArray(ALL_WORDS);
    calledCards = [];
    isGameWon = false;
    winner = null; // Reseteamos el objeto winner completo
}

// --- INICIALIZACIÓN DEL SERVIDOR ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://192.168.0.7:5173"],
        methods: ["GET", "POST"]
    }
});

// Inicializa el juego por primera vez al arrancar el servidor
resetGame();

// --- LÓGICA DE CONEXIÓN ---
io.on('connection', (socket: Socket) => {

    if (players.length >= MAX_PLAYERS) {
        socket.emit('server:roomFull');
        socket.disconnect(true);
        return;
    }
    console.log(`✅ Usuario conectado: ${socket.id}`);

    // Le enviamos el estado actual del juego al nuevo usuario
    socket.emit('game:gameState', { deck, calledCards, isGameWon, winner });

    // Evento para autenticar al Cantador
    socket.on('crier:authenticate', (password: string) => {
        const crierExists = players.some(p => p.role === 'crier');
        if (crierExists || password !== CRIER_PASSWORD) {
            return socket.emit('crier:authFailed');
        }
        const newCrier: Player = { id: socket.id, role: 'crier', name: 'Cantador' };
        players.push(newCrier);
        socket.emit('crier:authSuccess');
        io.emit('game:playersUpdate', players);
        socket.broadcast.emit('user:connected', { name: newCrier.name });
    });

    // Evento para que un Jugador se una
    socket.on('player:join', ({ name }: { name: string }) => {
        const newPlayer: Player = { id: socket.id, role: 'player', name };
        players.push(newPlayer);
        socket.emit('player:assigned');
        io.emit('game:playersUpdate', players);
        socket.broadcast.emit('user:connected', { name: newPlayer.name });
    });

    // Evento para cantar la siguiente carta
    socket.on('crier:callNextCard', () => {
        const player = players.find(p => p.id === socket.id);
        if (isGameWon || player?.role !== 'crier' || calledCards.length >= deck.length) return;

        const nextCard = deck[calledCards.length];
        calledCards.push(nextCard);
        io.emit('game:newCard', { newCard: nextCard, allCalledCards: calledCards });
    });

    // Evento para declarar un ganador
    socket.on('player:declareWinner', () => {
        if (isGameWon) return;

        const winningPlayer = players.find(p => p.id === socket.id);
        if (!winningPlayer) return;

        isGameWon = true;
        winner = winningPlayer; // Guardamos el objeto completo del ganador

        io.emit('game:gameOver', { winner });
        console.log(`🏆 ¡Ganador declarado: ${winner.name} (${socket.id})!`);
    });

    // Evento para reiniciar el juego
    socket.on('game:playAgain', () => {
        resetGame();
        io.emit('game:gameState', { deck, calledCards, isGameWon, winner });
    });

    // Evento cuando un usuario se desconecta
    socket.on('disconnect', () => {
        const player = players.find(p => p.id === socket.id);
        players = players.filter(p => p.id !== socket.id);
        console.log(`❌ Usuario desconectado: ${socket.id}`);
        if (player) {
            io.emit('user:disconnected', { name: player.name });
        }
        io.emit('game:playersUpdate', players);
    });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`🚀 Servidor escuchando en el puerto ${PORT}`));