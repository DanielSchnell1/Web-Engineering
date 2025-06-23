const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const Game = require('./class/game');
const { send } = require('process');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const SECRET_KEY = 'dein_geheimer_schlüssel';
const users = new Map();
const games = new Map();

const app = express();
const server = http.createServer(app);

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html', 'index.html'));
});
app.get('/:html/:lobbyId', (req, res) => {
  if(!games.has(req.params.lobbyId))
  {
    res.status(404).send('Lobby nicht gefunden');
  }
  res.sendFile(path.join(__dirname, 'public/html', `${req.params.html}.html`));
});

app.use((req, res) => {
  res.status(404).send('Nicht gefunden');
});


const wss = new WebSocket.Server({ server });

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
    if (data.type === 'getToken'){
      const id = uuidv4();
      users.set(id, { ws, name: null });
      ws.send(JSON.stringify({ type: 'token', token: id }));
      console.log("Nutzer beigetreten: "+ id);
    
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
      sendMessageToLobby(lobby, JSON.stringify({ type: 'replace', path: `/game/${lobby}`}));
      game.start();
      


    } else if (data.type === 'init') { // Erstelle Lobby oder trete bestehender bei
      if(data.name && users.has(data.token))
      {
        user = users.get(data.token);
        user.name = data.name;
        if(games.has(data.lobby)) { //Fall 1: Nutzer schickt validen Lobbycode
          users.set(data.token, user);
          games.get(data.lobby).addPlayer(data.token);
          ws.send(JSON.stringify({ type: 'redirect', path: `lobby/${data.lobby}`}));
          sendMessageToLobby(data.lobby, JSON.stringify({ type: 'lobby', users: games.get(data.lobby).getPlayerNames(users)})); 
          console.log(games.get(data.lobby).getPlayerNames(users));
          
        } else if (!data.lobby){    //Fall 2: Nutzer schickt kein Lobbycode
          users.set(data.token, user);
            let lobby = generateLobbyCode();
            console.log(lobby);
            games.set(lobby, new Game(data.token));
            ws.send(JSON.stringify({type: 'getLobby', lobby: lobby}));
            ws.send(JSON.stringify({ type: 'redirect', path: `lobby/${lobby}`}));

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
    
    
    } else if(data.type === 'draw') {
        console.log(data.cards);
    


    } else if(data.type === 'getGameState') {
      let message = games.get(data.lobby).getGameState(data.token, users);
      ws.send(message);
    }

  } catch(e){
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
