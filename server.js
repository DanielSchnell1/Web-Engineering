const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const Game = require('./class/game');
const { send } = require('process');

const SECRET_KEY = 'dein_geheimer_schlüssel';
const users = new Map();
const games = new Map();

const server = http.createServer((req, res) => {
  let filePath;
  if (req.url === '/' || req.url === '/index.html') { // Request URL
    filePath = path.join(__dirname, '/html/index.html'); 
  } else {
    filePath = path.join(__dirname, req.url);
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Nicht gefunden');
    }

    let contentType = 'text/plain';
    if (filePath.endsWith('.html')) contentType = 'text/html; charset=utf-8';
    else if (filePath.endsWith('.js')) contentType = 'application/javascript';
    else if (filePath.endsWith('.css')) contentType = 'text/css';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});


const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  let userToken = null;
  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }
    if (data.type === 'getToken'){
      const newToken = jwt.sign({ timestamp: Date.now() }, SECRET_KEY);
      users.set(newToken, { ws, name: null });
      ws.send(JSON.stringify({ type: 'token', token: newToken }));
      console.log("Nutzer beigetreten: "+ newToken);
    
    } else if(data.type === 'startGame'){
      let lobby = getLobby(data.token);
      if(!lobby){
        ws.send(JSON.stringify({ type: 'error', message: 'Fehler: Lobby existiert nicht'}))
        return;
      }
      game = games.get(lobby);
      if(!(game.players[0].jwt === data.token)) {
        ws.send(JSON.stringify({ type: 'error', message: 'Fehler: Keine Berechtigung'}))
        return;
      }
      sendMessageToLobby(lobby, JSON.stringify({ type: 'redirect', path: 'game.html'}));
      game.start();
      


    } else if (data.type === 'init') { // Erstelle Lobby oder trete bestehender bei
      if(data.name && users.has(data.token))
      {
        user = users.get(data.token);
        user.name = data.name;
        if(games.has(data.lobby)) { //Fall 1: Nutzer schickt validen Lobbycode
          users.set(data.token, user);
          games.get(data.lobby).addPlayer(data.token);
          ws.send(JSON.stringify({ type: 'redirect', path: 'html/lobby.html'}));
          sendMessageToLobby(data.lobby, JSON.stringify({ type: 'lobby', users: games.get(data.lobby).getPlayerNames(users), code: data.lobby})); 
          console.log(games.get(data.lobby).getPlayerNames(users));
          
        } else if (!data.lobby){    //Fall 2: Nutzer schickt kein Lobbycode
          users.set(data.token, user);
            let lobby = generateLobbyCode();
            console.log(lobby);
            games.set(lobby, new Game(data.token));
            ws.send(JSON.stringify({ type: 'redirect', path: 'html/lobby.html'}));

        } else {                    //Fall 3: Nutzer schickt invaliden Lobbycode
          ws.send(JSON.stringify({ type: 'error', message: 'Fehler: Lobby existiert nicht'}))
        }
      } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Fehler: Kein Benutzername'}))
      }


    } else if (data.type === 'ws') {
      if(users.has(data.token))
      {
        let user = users.get(data.token);
        user.ws = ws;
        users.set(data.token, user);
      }
    } else if (data.type === 'getLobbyState') {
      lobby = getLobby(data.token);
        ws.send(JSON.stringify({ type: 'lobby', users: games.get(lobby).getPlayerNames(users), code: lobby})); 
    }
  });


  ws.on('close', () => { // Wird die Verbindung getrennt, so hat der Nutzer 10 Sekunden Zeit um sich neu zu verbinden, sonst wird er gelöscht
    if (userToken && users.has(userToken)) {
      setTimeout(() => {
        if (users.get(userToken)?.ws.readyState !== WebSocket.OPEN) {
          users.delete(userToken);
          console.log("User durch Close gelöscht:", userToken);
        }
      }, 10000);
    }
  });
});


function logUsers() {
  console.log('--- Aktuelle Nutzerliste ---');
  for (const [token, userData] of users.entries()) {
    console.log(`Token: ${token}`);
    console.log(`  Name: ${userData.name}`);
    console.log(`  WebSocket offen: ${userData.ws.readyState === 1}`); // 1 = OPEN
  }
  console.log('----------------------------');
}
function sendMessageToLobby(lobby, JSON) {

  games.get(lobby).players.forEach(user => {
    users.get(user.jwt).ws.send(JSON);
  });
}
function getLobby(token){
  for (const [lobbyCode, game] of games.entries()) {
    if (game.players.some(player => player.jwt === token)) {
      return lobbyCode;
    }
  }
  return null;
}

function generateLobbyCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do  {
    code = '';
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      code += chars[randomIndex];
    }
  } while(games.has(code))
  return code;
}



// Server starten
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
