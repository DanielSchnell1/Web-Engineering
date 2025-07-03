//EDIT: Mehrfaches starten des SPiels verhindern
//EDIT: Dokumentation: README.md schreiben

const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const Game = require('./class/game');
const express = require('express');
const {v4: uuidv4} = require('uuid');
const logger = require('./logger/logger');

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

    let userToken = null;
    ws.on('message', (message) => {
        try {
            let data;
            try {
                data = JSON.parse(message);
            } catch {
                return;
            }
            if (data.type === 'getToken') {
                const id = uuidv4();
                Game.users.set(id, {ws, name: null});
                ws.send(JSON.stringify({type: 'token', token: id}));
                //logger.log("Server.js: Nutzer beigetreten, called data.type === getToken" + id.toString());
                console.log("Nutzer beigetreten: " + id);

            } else if (data.type === 'startGame') {
                let lobby = getLobby(data.token);
                if (!lobby) {
                    ws.send(JSON.stringify({type: 'error', message: 'Fehler: Lobby existiert nicht'}))
                    return;
                }
                //Nur spieler 0 ist berechtigt das Spiel zu starten
                game = games.get(lobby);
                if (!(game.players[0].jwt === data.token)) {
                    ws.send(JSON.stringify({type: 'error', message: 'Fehler: Keine Berechtigung'}))
                    return;
                }
                game.start();
                logger.info('Server.js:  called Spiel gestartet. data.type === startGame' + game);
                game.sendMessageToLobby(JSON.stringify({type: 'replace', path: `/game/${lobby}`}));


            } else if (data.type === 'init') { // Erstelle Lobby oder trete bestehender bei
                if (data.name && Game.users.has(data.token)) {
                    user = Game.users.get(data.token);
                    user.name = data.name;
                    if (games.has(data.lobby)) { //Fall 1: Nutzer schickt validen Lobbycode
                        let game = games.get(data.lobby);
                        Game.users.set(data.token, user);
                        game.addPlayer(data.token, user.name);
                        ws.send(JSON.stringify({type: 'redirect', path: `lobby/${data.lobby}`}));
                        //update an die Lobby mit neuem Spieler
                        game.sendMessageToLobby(JSON.stringify({
                            type: 'lobby',
                            users: games.get(data.lobby).getPlayerNames(Game.users)
                        }));
                        logger.info("Server.js: ")
                        console.log(games.get(data.lobby).getPlayerNames(Game.users));

                    } else if (!data.lobby) {    //Fall 2: Nutzer schickt kein Lobbycode
                        Game.users.set(data.token, user);
                        let lobby = generateLobbyCode();
                        console.log(lobby);
                        games.set(lobby, new Game(data.token, user.name));
                        ws.send(JSON.stringify({type: 'getLobby', lobby: lobby}));
                        ws.send(JSON.stringify({type: 'redirect', path: `lobby/${lobby}`}));

                    } else {                    //Fall 3: Nutzer schickt invaliden Lobbycode
                        ws.send(JSON.stringify({type: 'error', message: 'Fehler: Lobby existiert nicht'}))
                    }
                } else {
                    ws.send(JSON.stringify({type: 'error', message: 'Fehler: Kein Benutzername'}))
                }

            } else if (data.type === 'ws') {
                if (Game.users.has(data.token)) {
                    let user = Game.users.get(data.token);
                    user.ws = ws;
                    Game.users.set(data.token, user);
                }


            } else if (data.type === 'getLobbyState') {
                lobby = getLobby(data.token);
                ws.send(JSON.stringify({type: 'lobby', users: games.get(lobby).getPlayerNames(Game.users), code: lobby}));


            } else if (data.type === 'draw') {
                let game = games.get(data.lobby);
                let message = game.drawCards(data.token, data.cards);
                ws.send(message);
                game.sendMessageToLobby(JSON.stringify({
                    "type": "pulse",
                    "cards": data.cards,
                    "currentPlayer": game.getCurrentPlayer(),
                    "currentRound": game.getRoundName(game.currentRound)
                }));

            } else if (data.type === 'bet') {
                let game = games.get(data.lobby);
                game.bet(data.token, data.bet, data.fold);

            } else if (data.type === 'getGameState') {
                let message = games.get(data.lobby).getGameState(data.token);
                ws.send(message);
             }// else if (data.type === 'restartGame') {
            //     let game = games.get(data.lobby);
            //     // Prüfen, ob token berechtigt ist, z.B. Spieler 0:
            //     if (game.players[0].jwt !== data.token) {
            //         ws.send(JSON.stringify({type: 'error', message: 'Keine Berechtigung zum Neustart'}));
            //         return;
            //     }
            //     game.resetGame(); // deine Reset-Logik in Game
            //     game.start();     // Spiel neu starten (Runde starten)
            //     sendMessageToLobby(data.lobby, JSON.stringify({type: 'replace', path: `/game/${data.lobby}`}));
            // }


        } catch (e) {
            console.log(e)
        }
    });


    ws.on('close', () => { // Wird die Verbindung getrennt, so hat der Nutzer 10 Sekunden Zeit um sich neu zu verbinden, sonst wird er gelöscht
        if (userToken && Game.users.has(userToken)) {
            setTimeout(() => {
                if (Game.users.get(userToken)?.ws.readyState !== WebSocket.OPEN) {
                    Game.users.delete(userToken);
                    console.log("User durch Close gelöscht:", userToken);
                }
            }, 10000);
        }
    });


});


/**
 * Logs the current list of connected users to the console for debugging purposes.
 * Iterates through the global 'users' Map and prints each user's token, name, and WebSocket connection state.
 */
function logUsers() {
    console.log('--- Aktuelle Nutzerliste ---');
    for (const [token, userData] of Game.users.entries()) {
        console.log(`Token: ${token}`);
        console.log(`  Name: ${userData.name}`);
        console.log(`  WebSocket offen: ${userData.ws.readyState === 1}`); // 1 = OPEN
    }
    console.log('----------------------------');
}


/**
 * Finds the lobby code for a given player token.
 * @param {string} token - The player's unique token (JWT).
 * @returns {string|null} The lobby code if the player is found in a game, otherwise null.
 */
function getLobby(token) {
    for (const [lobbyCode, game] of games.entries()) {
        if (game.players.some(player => player.jwt === token)) {
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
const PORT = 1234;
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