//EDIT: Mehrfaches starten des SPiels verhindern
//EDIT: getLobby(data.id) sucht die erste Lobby des Spielers. Es muss aber vor dem Aufruf validiert werden, damit der Spieler nur in einer Lobby ist.

const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const Game = require('./class/game');
const express = require('express');
const {v4: uuidv4} = require('uuid');
const logger = require('./logger/logger');
require('dotenv').config();

/**
 * @file server.js
 * This file is the main entry point for the WebSocket and HTTP server for the poker game.
 * It handles user connections, lobby management, and the real-time game state communication
 * between the clients and the game logic defined in './class/game.js'.
 */

const games = new Map();

const app = express();
const server = http.createServer(app);

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html', 'index.html'));
});
app.get('/:html/:lobbyId', (req, res) => {
    if (!games.has(req.params.lobbyId)) {
        res.status(404).send('Lobby nicht gefunden');
    }
    res.sendFile(path.join(__dirname, 'public/html', `${req.params.html}.html`));
});

app.use((req, res) => {
    res.status(404).send('Nicht gefunden');
});


const wss = new WebSocket.Server({server});

wss.on('connection', (ws) => {

    ws.on('message', (message) => {
        console.log(message);
        try {
            let data;
            try {
                data = JSON.parse(message);
            } catch {
                return;
            }
            if (data.type === 'getId') {
                const id = uuidv4();
                Game.users.set(id, {ws, name: null});
                ws.send(JSON.stringify({type: 'id', id: id}));
                //logger.log("Server.js: Nutzer beigetreten, called data.type === getId" + id.toString());
                console.log("Nutzer beigetreten: " + id);

            } else if(data.type === 'leave') {
                ws.send(JSON.stringify({type: 'replace', path: `/`}));
                deleteUserFromGame(data.id);

            } else if (data.type === 'startGame') {
                const lobby = getLobby(data.id);
                if (!lobby) {
                    ws.send(JSON.stringify({type: 'error', message: 'Fehler: Lobby existiert nicht'}))
                    return;
                }

                const game = games.get(lobby);

                // Check 1: Is the person starting the game the host (player 0)?
                if (game.getHostId() !== data.id) {
                    ws.send(JSON.stringify({type: 'error', message: 'Fehler: Nur der Host kann das Spiel starten.'}));
                    return;
                }

                // Check 2: Is there more than one player?
                if (game.playersLength() < 2) {
                    ws.send(JSON.stringify({type: 'error', message: 'Nicht genügend Spieler in der Lobby.'}));
                    return;
                }

                // If all checks pass, start the game
                game.start();
                logger.info('Server.js: Spiel gestartet in Lobby: ' + lobby);
                game.sendMessageToLobby(JSON.stringify({type: 'replace', path: `/game/${lobby}`}));
                

            } else if (data.type === 'init') { // Erstelle Lobby oder trete bestehender bei
                deleteUserFromGame(data.id);
                if (data.name && Game.users.has(data.id)) {
                    user = Game.users.get(data.id);
                    user.name = data.name;
                    if (games.has(data.lobby)) { //Fall 1: Nutzer schickt validen Lobbycode
                        let game = games.get(data.lobby);
                        Game.users.set(data.id, user);
                        if (!game.addPlayer(data.id, user.name)) {
                            ws.send(JSON.stringify({type: 'lobbyFull'}));
                            return;
                        }
                        ws.send(JSON.stringify({type: 'redirect', path: `lobby/${data.lobby}`}));
                        //update an die Lobby mit neuem Spieler
                        sendLobbyStateUpdate(game, data.lobby);
                        console.log(games.get(data.lobby).getPlayerNames(Game.users));

                    } else if (!data.lobby) {    //Fall 2: Nutzer schickt kein Lobbycode
                        Game.users.set(data.id, user);
                        let lobby = generateLobbyCode();
                        console.log(lobby);
                        games.set(lobby, new Game(data.id, user.name));
                        ws.send(JSON.stringify({type: 'getLobby', lobby: lobby}));
                        ws.send(JSON.stringify({type: 'redirect', path: `lobby/${lobby}`}));
                        sendLobbyStateUpdate(games.get(lobby), lobby);

                    } else {                    //Fall 3: Nutzer schickt invaliden Lobbycode
                        ws.send(JSON.stringify({type: 'error', message: 'Fehler: Lobby existiert nicht'}))
                    }
                } else {
                    ws.send(JSON.stringify({type: 'error', message: 'Fehler: Kein Benutzername'}))
                }

            } else if (data.type === 'ws') {
                if (Game.users.has(data.id)) {
                    let user = Game.users.get(data.id);
                    user.ws = ws;
                    Game.users.set(data.id, user);
                }


            } else if (data.type === 'getLobbyState') {
                const lobby = getLobby(data.id);
                if (lobby) {
                    sendLobbyStateUpdate(games.get(lobby), lobby);
                } else {
                    ws.send(JSON.stringify({type: 'error', message: 'Lobby nicht gefunden.'}));
                }


            } else if (data.type === 'kickPlayer') {
                const lobby = getLobby(data.id);
                if (!lobby) return; // Lobby nicht gefunden

                const game = games.get(lobby);

                // Schritt 1: Validierung
                // Ist der Absender der Host und ist der kickIndex gültig?
                if (game.getHostId() === data.id && game.players[data.kickIndex]) {
                    
                    // Schritt 2: Aktion & Benachrichtigung des gekickten Spielers
                    const kickedPlayer = game.players[data.kickIndex];
                    if(kickedPlayer.id === data.id) return; // Host kann sich nicht selbst kicken

                    const kickedUser = Game.users.get(kickedPlayer.id);
                    if (kickedUser && kickedUser.ws) {
                        // Sende eine Nachricht an den gekickten Spieler, um ihn zum Hauptmenü weiterzuleiten
                        kickedUser.ws.send(JSON.stringify({ type: 'replace', path: '/' }));
                    }

                    // Spieler aus dem Array entfernen
                    game.players.splice(data.kickIndex, 1);

                    // Schritt 3: Update an den Rest der Lobby
                    sendLobbyStateUpdate(game, lobby);
                }


            } else if (data.type === 'draw') {
                let game = games.get(data.lobby);
                let message = game.drawCards(data.id, data.cards);
                ws.send(message);
                game.sendMessageToLobby(JSON.stringify({
                    "type": "pulse",
                    "cards": data.cards,
                    "currentPlayer": game.getCurrentPlayer(),
                    "currentRound": game.getRoundName(game.currentRound)
                }));

            } else if (data.type === 'bet') {
                let game = games.get(data.lobby);
                game.bet(data.id, data.bet, data.fold);

            } else if (data.type === 'getGameState') {
                let message = games.get(data.lobby).getGameState(data.id);
                ws.send(message);
             }


        } catch (e) {
            console.log(e)
        }
    });


    ws.on('close', () => { // Wird die Verbindung getrennt, so hat der Nutzer 3 Sekunden Zeit um sich neu zu verbinden, sonst wird er gelöscht
        let userId;

        for (const [id, user] of Game.users.entries()) {
            if (user.ws === ws) {
                userId = id;
                break;
            }
        }

        if (userId) {
            setTimeout(() => {
                const user = Game.users.get(userId);
                if (!user || user.ws.readyState !== WebSocket.OPEN) {
                    Game.users.delete(userId);
                    deleteUserFromGame(userId);
                    console.log("User durch Close gelöscht:", userId);
                }
            }, 3000);
        }
    });


});


/**
 * Logs the current list of connected users to the console for debugging purposes.
 * Iterates through the global 'users' Map and prints each user's id, name, and WebSocket connection state.
 */
function logUsers() {
    console.log('--- Aktuelle Nutzerliste ---');
    for (const [id, userData] of Game.users.entries()) {
        console.log(`Id: ${id}`);
        console.log(`  Name: ${userData.name}`);
        console.log(`  WebSocket offen: ${userData.ws.readyState === 1}`); // 1 = OPEN
    }
    console.log('----------------------------');
}

function sendLobbyStateUpdate(game, lobby) {
    game.players.forEach(player => {
        const user = Game.users.get(player.id);
        if (user && user.ws) {
            user.ws.send(JSON.stringify({
                type: 'lobby',
                host: game.players[0].id === player.id,
                users: game.getPlayerNames(Game.users),
                code: lobby
            }));
        }
    });
}

/**
 * Deletes the user from every game in games.
 */
function deleteUserFromGame(userId) {
    games.forEach((game, lobby) => {

        for (let i = 0; i < game.players.length; i++) {
            const player = game.players[i];

            if (player.id === userId) { 
                if(game.playersLength() <= 1) { // Fall 1: Lobby ist (danach) leer und wird gelöscht
                    games.delete(lobby);
                    return;
                }
                if (game.isStarted) { //Fall 2: Spiel ist gestartet -> Spieler beim nächsten Start rauswerfen
                    if(game.players[game.currentPlayer].id == userId) {
                        game.updateCurrentPlayer();
                    }
                    player.leaveGame = true;
                    player.active = false;
                    game.sendCallbackMessageToLobby(game.getGameState);
                } else { //Fall 3: Noch in der Lobby -> Spieler wird sofort rausgeworfen
                    game.players.splice(i, 1);
                    i--;
                    sendLobbyStateUpdate(game, lobby);
                }
            }
        }
    });
}


/**
 * Finds the lobby code for a given player id.
 * @param {string} id - The player's unique id (id).
 * @returns {string|null} The lobby code if the player is found in a game, otherwise null.
 */
function getLobby(id) {
    for (const [lobbyCode, game] of games.entries()) {
        if (game.players.some(player => player.id === id && player.leaveGame == false)) {
            return lobbyCode;
        }
    }
    return null;
}

/**
 * Generates a unique 6-character alphanumeric lobby code.
 * Ensures the generated code is not already in use by checking the global 'games' Map.
 * @returns {string} The unique lobby code.
 */
function generateLobbyCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    do {
        code = '';
        for (let i = 0; i < 6; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            code += chars[randomIndex];
        }
    } while (games.has(code))
    return code;
}


// Server starten
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});

//Server herunterfahren
// Shutdown-Signale abfangen: STRG+C oder Kill-Befehl
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/**
 * Gracefully shuts down the server.
 * Closes the HTTP server to stop accepting new connections and then exits the process.
 * This function is registered to be called on SIGINT and SIGTERM signals.
 */
function shutdown() {
    console.log('\n🛑 Server wird heruntergefahren...');

    // 1. HTTP-Server stoppen - nimmt keine neuen Verbindungen mehr an
    server.close(() => {
        console.log('📴 HTTP-Server wurde geschlossen.');
    });

    setTimeout(() => {
        console.log('👋 Prozess wird beendet.');
        process.exit(0);
    }, 1000);
}