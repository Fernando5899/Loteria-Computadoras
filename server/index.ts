// server/index.ts
import express from 'express';
import * as http from 'http';
import { Server, Socket } from 'socket.io';

// --- 1. NUEVA ESTRUCTURA DE DATOS ---
type Tarjeta = {
    palabra: string;
    descripcion: string;
};

const ALL_WORDS: Tarjeta[] = [
    { palabra: 'Consumo Responsable', descripcion: 'Elegir productos y servicios minimizando el impacto ambiental y social.' },
    { palabra: 'Responsabilidad Social', descripcion: 'El compromiso de una organización con el bienestar de la sociedad.' },
    { palabra: 'Ética', descripcion: 'Principios morales que guían el comportamiento en el desarrollo tecnológico.' },
    { palabra: 'Basura Electrónica', descripcion: 'Residuos de aparatos eléctricos y electrónicos desechados.' },
    { palabra: 'Emisiones de Gases (CO2)', descripcion: 'Gases liberados a la atmósfera que contribuyen al calentamiento global.' },
    { palabra: 'Computación Verde', descripcion: 'El diseño y uso de tecnología de forma sostenible y eco-amigable.' },
    { palabra: 'Impacto Ambiental', descripcion: 'La alteración (positiva o negativa) del medio ambiente por la tecnología.' },
    { palabra: 'Uso Eficiente de Recursos', descripcion: 'Utilizar la menor cantidad de energía y materiales posibles.' },
    { palabra: 'Reducir Desperdicio', descripcion: 'Minimizar la cantidad de recursos que se tiran durante la producción o uso.' },
    { palabra: 'Reducir Contaminación', descripcion: 'Disminuir la liberación de sustancias nocivas al entorno.' },
    { palabra: 'Prácticas Éticas', descripcion: 'Acciones que se alinean con los principios morales y el bien común.' },
    { palabra: 'Prácticas Sostenibles', descripcion: 'Métodos que pueden mantenerse a largo plazo sin agotar recursos.' },
    { palabra: 'Hardware y Recursos', descripcion: 'Los componentes físicos y materiales usados para construir tecnología.' },
    { palabra: 'Eficiencia Energética', descripcion: 'Realizar la misma tarea (cálculo) utilizando menos electricidad.' },
    { palabra: 'Centros de Datos', descripcion: 'Instalaciones que albergan miles de servidores y consumen mucha energía.' },
    { palabra: 'Desarrollo Sostenible', descripcion: 'Innovar tecnológicamente sin comprometer las necesidades de futuras generaciones.' },
    { palabra: 'Impacto Social', descripcion: 'El efecto que la tecnología tiene en las comunidades y la cultura.' },
    { palabra: 'Energía Renovable', descripcion: 'Electricidad generada de fuentes como el sol o el viento, en lugar de fósiles.' },
    { palabra: 'Microsoft', descripcion: 'Compañía que se comprometió a ser carbono negativo para 2030.' },
    { palabra: 'Carbono Negativo', descripcion: 'Eliminar más dióxido de carbono de la atmósfera del que se emite.' },
    { palabra: 'Ingeniería en Sistemas', descripcion: 'La disciplina de diseñar y construir soluciones tecnológicas complejas.' },
    { palabra: 'Sector TIC', descripcion: 'Industria de las Tecnologías de la Información y Comunicación.' },
    { palabra: 'Hardware', descripcion: 'Los componentes físicos de una computadora (CPU, GPU, RAM).' },
    { palabra: 'Software', descripcion: 'Los programas y aplicaciones que se ejecutan en una computadora.' },
    { palabra: 'Medio Ambiente', descripcion: 'El entorno natural que es afectado por la creación y desecho de tecnología.' },
    { palabra: 'Sociedad', descripcion: 'El conjunto de personas que interactúan y son afectadas por la tecnología.' },
    { palabra: 'Prácticas Justas', descripcion: 'Asegurar condiciones laborales justas en la cadena de suministro.' },
    { palabra: 'Contaminación', descripcion: 'Presencia de componentes nocivos en el aire, agua o tierra.' },
    { palabra: 'Protección de Datos', descripcion: 'La responsabilidad ética y legal de resguardar la información de los usuarios.' },
    { palabra: 'Tecnología', descripcion: 'La aplicación del conocimiento científico para fines prácticos.' }
];
const MAX_PLAYERS = 30;
const CRIER_PASSWORD = 'Fernando';

type Player = { id: string; name: string; role: 'crier' | 'player' };

// --- 2. EL ESTADO DEL JUEGO AHORA USA LA NUEVA ESTRUCTURA ---
let deck: Tarjeta[] = []; // El mazo es una lista de Tarjetas
let calledCards: Tarjeta[] = []; // Las cartas cantadas también
let isGameWon = false;
let winner: Player | null = null;
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