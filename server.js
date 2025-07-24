const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const Game = require('./class/game');
const express = require('express');
const {v4: uuidv4, validate} = require('uuid');
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

const messageHandlers = {
    // Connection and Initialisierung
    'getId': handleGetId,
    'init': handleInit,
    'ws': handleWsReconnect,

    // Lobby-Management
    'getLobbyState': handleGetLobbyState,
    'kickPlayer': handleKickPlayer,
    'leave': handleLeave,

    // Game Actions
    'startGame': handleStartGame,
    'getGameState': handleGetGameState,
    'draw': handleDraw,
    'bet': handleBet,
};

//Central-Dispatch-Logic: calling coresponding function for ws message type.
wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            let data = JSON.parse(message);
            const handler = messageHandlers[data.type];
            if (handler) {
                handler(ws, data);
            } else {
                logger.error("Server.js: Unbekannte Nachritentyp: " + data.type)
            }

        } catch (e) {
            logger.error(e);
            ws.send(JSON.stringify({type: 'error', message: 'Server.js: Ungültige Nachricht'}))
        }
    });
})

// ----- Handler-Funktions -----
/**
 * Handles the 'getId' message. Generates a new UUID for a connecting user,
 * stores them in `Game.users`, and sends the new ID back to the client.
 * @param {WebSocket} ws The WebSocket connection object of the client.
 * @param {object} data The parsed message object from the client.
 */
function handleGetId(ws, data) {
    const id = uuidv4();
    Game.users.set(id, {ws, name: null});
    ws.send(JSON.stringify({type: 'id', id: id}));
    logger.info("Server.js: Nutzer beigetreten. id: " + id.toString());
}

/**
 * Handles the 'init' message. Initializes a user's session by setting their name
 * and adding them to a lobby. It can either create a new lobby or add the user to an existing one.
 * @param {WebSocket} ws The WebSocket connection object of the client.
 * @param {object} data The parsed message object from the client.
 * @param {string} data.id The client's unique ID.
 * @param {string} data.name The client's chosen name.
 * @param {string} [data.lobby] The optional lobby code to join.
 */
function handleInit(ws, data) {
    if (identifyUser(data)) {
        if (games.has(data.lobby)) { //Fall 1: Nutzer schickt validen Lobbycode
            joinLobby(ws, data);
        } else if (!data.lobby) {    //Fall 2: Nutzer schickt kein Lobbycode
            createLobby(ws, data);
        } else {                    //Fall 3: Nutzer schickt invaliden Lobbycode
            ws.send(JSON.stringify({type: 'error', message: 'Fehler: Lobby existiert nicht'}))
        }
    } else {
        ws.send(JSON.stringify({type: 'error', message: 'Fehler: Kein Benutzername'}))
    }
}

/**
 * Handles the 'ws' message. Re-associates a new WebSocket connection with an
 * existing user ID. This is for handling page reloads or brief disconnects.
 * @param {WebSocket} ws The new WebSocket connection object of the client.
 * @param {object} data The parsed message object from the client.
 * @param {string} data.id The client's existing unique ID.
 */
function handleWsReconnect(ws, data) {
    if (Game.users.has(data.id)) {
        let user = Game.users.get(data.id);
        user.ws = ws;
        Game.users.set(data.id, user);
    }
}

/**
 * Handles the 'getLobbyState' message. Retrieves the current state of the
 * lobby the user is in and sends it back to the client.
 * @param {WebSocket} ws The WebSocket connection object of the client.
 * @param {object} data The parsed message object from the client.
 * @param {string} data.id The client's unique ID.
 */
function handleGetLobbyState(ws, data) {
    const lobby = getLobby(data.id);
    if (lobby) {
        sendLobbyStateUpdate(games.get(lobby), lobby);
    } else {
        ws.send(JSON.stringify({type: 'error', message: 'Lobby nicht gefunden.'}));
    }
}

/**
 * Handles the 'kickPlayer' message. Allows a host to remove another player from the lobby.
 * @param {WebSocket} ws The WebSocket connection object of the host client.
 * @param {object} data The parsed message object from the client.
 * @param {string} data.id The host's unique ID.
 * @param {number} data.kickIndex The index of the player to be kicked in the `game.players` array.
 */
function handleKickPlayer(ws, data) {
    const lobby = getLobby(data.id);
    if (!lobby) return; // Lobby nicht gefunden

    const game = games.get(lobby);

    // 1: Validate Host
    if (validateHostPlayer(game.getHostId(), data.id) &&
        game.players[data.kickIndex]
    ) {

        //2: checking if admin kicks himself. inform kicked Player
        const kickedPlayer = game.players[data.kickIndex];
        if (kickedPlayer.id === data.id) return;

        const kickedUser = Game.users.get(kickedPlayer.id);
        if (kickedUser && kickedUser.ws) {
            kickedUser.ws.send(JSON.stringify({type: 'replace', path: '/'}));
        }

        // deleate player formaly from game
        game.players.splice(data.kickIndex, 1);

        // 3: update lobby state
        sendLobbyStateUpdate(game, lobby);
    }
}

/**
 * Handles the 'leave' message. Removes a user from their game/lobby
 * and redirects them to the homepage.
 * @param {WebSocket} ws The WebSocket connection object of the client.
 * @param {object} data The parsed message object from the client.
 * @param {string} data.id The client's unique ID.
 */
function handleLeave(ws, data) {
    ws.send(JSON.stringify({type: 'replace', path: `/`}));
    deleteUserFromGame(data.id);
}

/**
 * Handles the 'startGame' message. Starts the game if the sender
 * is the host and there are enough players.
 * @param {WebSocket} ws The WebSocket connection object of the client.
 * @param {object} data The parsed message object from the client.
 * @param {string} data.id The client's unique ID, used to verify they are the host.
 */
function handleStartGame(ws, data) {
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

    // If all guard clauses pass, start the game.
    game.start();
    logger.info('Server.js: Spiel gestartet in Lobby: ' + lobby);
    game.sendMessageToLobby(JSON.stringify({type: 'replace', path: `/game/${lobby}`}));
}

/**
 * Handles the 'getGameState' message. Fetches the current game state
 * for the specific user and sends it to them.
 * @param {WebSocket} ws The WebSocket connection object of the client.
 * @param {object} data The parsed message object from the client.
 * @param {string} data.id The client's unique ID.
 * @param {string} data.lobby The lobby code for the game.
 */
function handleGetGameState(ws, data) {
    let message = games.get(data.lobby).getGameState(data.id);
    ws.send(message);
}

/**
 * Handles the 'draw' message. Processes a player's request to exchange cards during the draw round.
 * @param {WebSocket} ws The WebSocket connection object of the client.
 * @param {object} data The parsed message object from the client.
 * @param {string} data.id The client's unique ID.
 * @param {string} data.lobby The lobby code for the game.
 * @param {string[]} data.cards An array of card identifiers to be exchanged.
 */
function handleDraw(ws, data) {
    let game = games.get(data.lobby);
    let message = game.drawCards(data.id, data.cards);
    ws.send(message);
    game.sendMessageToLobby(JSON.stringify({
        "type": "pulse",
        "cards": data.cards,
        "currentPlayer": game.getCurrentPlayer(),
        "currentRound": game.getRoundName(game.currentRound)
    }));
}

/**
 * Handles the 'bet' message. Processes a player's bet or fold action.
 * @param {WebSocket} ws The WebSocket connection object of the client.
 * @param {object} data The parsed message object from the client.
 * @param {string} data.id The client's unique ID.
 * @param {string} data.lobby The lobby code for the game.
 * @param {number} data.bet The amount the player is betting.
 * @param {boolean} data.fold True if the player is folding.
 */
function handleBet(ws, data) {
    let game = games.get(data.lobby);
    game.bet(data.id, data.bet, data.fold);
}


// ----- Helperfunction -----
/**
 * A helper function to check if a given player ID matches the host's ID.
 * @param {string} host The ID of the host.
 * @param {string} playerToBeVerified The ID of the player to check.
 * @returns {boolean} True if the player is the host, otherwise false.
 */
function validateHostPlayer(host, playerToBeVerifyed) {
    if (host === playerToBeVerifyed) {
        return true
    }
    return false
}


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

/**
 * Sends the updated lobby state to all players in a game.
 * @param {Game} game The game instance.
 * @param {string} lobby The lobby code.
 */
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
                // Fall 1: Lobby ist (danach) leer und wird gelöscht
                if (game.playersLength() <= 1) {
                    games.delete(lobby);
                    return;
                }
                //Fall 2: Spiel ist gestartet -> Spieler beim nächsten Start rauswerfen
                if (game.isStarted) {
                    if (game.players[game.currentPlayer].id == userId) {
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

/**
 * Validates a user by their ID, sets their name, and cleans up any old game sessions.
 * This function ensures a user is properly registered in the system before they proceed to create or join a lobby.
 * @param {object} data - The data object received from the client.
 * @param {string} data.id - The user's unique identifier (UUID).
 * @param {string} data.name - The user's chosen display name.
 * @returns {boolean} Returns `true` if the user is successfully identified and their name is set, otherwise `false`.
 */
function identifyUser(data) {
    deleteUserFromGame(data.id);
    if (data.name && Game.users.has(data.id)) {
        user = Game.users.get(data.id);
        user.name = data.name;
        return true;
    }
    return false;
}

/**
 * Creates a new game lobby with a unique code.
 * The user who initiates the creation becomes the host of the new lobby.
 * It sends the new lobby code and a redirect instruction back to the client.
 * @param {WebSocket} ws - The WebSocket connection object of the client creating the lobby.
 * @param {object} data - The data object from the client, containing user information.
 * @param {string} data.id - The unique ID of the user creating the lobby.
 */
function createLobby(ws, data) {
    Game.users.set(data.id, user);
    let lobby = generateLobbyCode();
    console.log(lobby);
    games.set(lobby, new Game(data.id, user.name));
    ws.send(JSON.stringify({type: 'getLobby', lobby: lobby}));
    ws.send(JSON.stringify({type: 'redirect', path: `lobby/${lobby}`}));
    sendLobbyStateUpdate(games.get(lobby), lobby);
}

/**
 * Adds a player to an existing game lobby.
 * If the lobby is full, it sends a 'lobbyFull' message. Otherwise, it adds the player
 * and notifies all clients in the lobby about the new player.
 * @param {WebSocket} ws - The WebSocket connection object of the joining client.
 * @param {object} data - The data object from the client.
 * @param {string} data.id - The unique ID of the joining user.
 * @param {string} data.lobby - The lobby code the user wants to join.
 */
function joinLobby(ws, data) {
    let game = games.get(data.lobby);
    Game.users.set(data.id, user);
    if (!game.addPlayer(data.id, user.name)) {
        ws.send(JSON.stringify({type: 'lobbyFull'}));
        return;
    }
    ws.send(JSON.stringify({type: 'redirect', path: `lobby/${data.lobby}`}));
    sendLobbyStateUpdate(game, data.lobby);
    logger.info("Server.js: Nutzer in Lobby: " + games.get(data.lobby).getPlayerNames(Game.users));
}


//----- Server Stuff -----
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});

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

    server.close(() => {
        console.log('📴 HTTP-Server wurde geschlossen.');
    });

    setTimeout(() => {
        console.log('👋 Prozess wird beendet.');
        process.exit(0);
    }, 1000);
}