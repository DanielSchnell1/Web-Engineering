//const logger = require('C:/DHBW/Semester2/Web_Engineering/Web-Engineering/logger/logger.js');
const drawCards = [];

    // Einsatzanzeige
    const betSlider = document.getElementById('bet');
    const betValue = document.getElementById('betValue');
    const betButton = document.getElementById('betButton');
    const foldButton = document.getElementById('foldButton');
    const drawButton = document.getElementById("drawButton");

    /**
     * Handles incoming WebSocket messages from the server.
     * This function is the central point for updating the game state on the client side.
     * @param {MessageEvent} event - The event object containing the message data from the server.
     */
    ws.addEventListener('message', (event) => {
      let data = JSON.parse(event.data);
      console.log(data);

      
    if (data.currentPlayer !== undefined) {
        document.getElementById("currentPlayer").textContent = "aktueller Spieler: " + data.currentPlayer;
    }
    if (data.currentBet !== undefined) {
        document.getElementById("currentBet").textContent = "Einsatz: " + data.currentBet;
        const betSlider = document.getElementById("bet")
        if(data.currentBet > betSlider.max){
          betSlider.min = betSlider.max;
        } else {
          betSlider.min = Math.min(data.balance, data.currentBet);
        }
        betSlider.value = betSlider.min;
        betValue.textContent = betSlider.min;
    }
    if (data.currentPot !== undefined) {
        document.getElementById("currentPot").textContent = "Pot: " + data.currentPot;
    }
    if (data.currentRound !== undefined) {
        document.getElementById("currentRound").textContent = data.currentRound;
    }
    if (data.moveState !== undefined)
    {
      const betElements = document.querySelectorAll('.bet');

      if ([0, 2, 3].includes(data.moveState)) {
        betElements.forEach(el => el.style.display = 'none');
      } else {
        betElements.forEach(el => el.style.display = 'flex');
      }

      if (data.moveState === 0 || data.moveState === 1 || data.moveState === 3) {
        drawButton.style.display = 'none';
      } else {
        drawButton.style.display = 'flex';
      }

    }
    



      if(data.type === "drawCards"){
        console.log("test");
        const imgs = document.querySelectorAll('#self .cards img');
        data.cards.forEach((card, index)=>{
          imgs[index].src = `/img/cards/${data.cards[index]}.svg`
        });
      }


      if(data.type === "pulse"){
        data.cards.forEach(id => {
        const img = document.getElementById(id);
            img.classList.add('pulse');
            img.addEventListener('animationend', function handler() {
            img.classList.remove('pulse');
            img.removeEventListener('animationend', handler);
          });
        });
      }

      /**
       * Renders the entire game state based on data from the server
       * when a message with type 'getGameState' is received.
       * This includes displaying all players, their cards, balances, and setting up the bet slider.
       */
      if(data.type === "getGameState"){
        let container_players = document.getElementById(`players`);
        let container_self = document.getElementById(`self`);
        // Setting the max bet value of a player to the balance of the player.
        document.getElementById("bet").max = data.balance;

        if (data.currentRound === 'Showdown') {
          const leaderboard = document.getElementById('leaderboard');
          const leaderboard_list = leaderboard.querySelector("ul");
          leaderboard_list.innerHTML = '';
          console.log(data);

          data.players.sort((a, b) => b.cardScore - a.cardScore);

          data.players.forEach((player) => {
            if(!player.user) return;
            //erstellen des leaderboards
            leaderboard_list.innerHTML += `
              <li class="leaderboardEntry">
                <span class="playerName">${player.user}</span>
                <div class="playerCards">
                ${player.cards.map(card => `<img src="/img/cards/${card}.svg" alt="${card}" />`).join('')}
                <div>
                <span class="playerBalance">${player.cardScore} Chips</span>

              </li>`;
          });

          if(data.host){
            if (!leaderboard.querySelector('button#startGameBtn')) {
              console.log("Spiel starten Button hinzugefügt");
              leaderboard.insertAdjacentHTML('beforeend', `
                <button id="startGameBtn" 
                        onclick="ws.send(JSON.stringify({ type: 'startGame', id: '${sessionStorage.getItem('id')}' }))">
                          Spiel starten
                </button>`);
            }
          }

          leaderboard.showModal();
          return;
        }

        

        container_players.innerHTML = '';
        container_self.innerHTML = '';
          /**
           * Iterates over the players array from the server data to render each player.
           * @param {object} player - The player object from the server.
           * @param {number} index - The index of the player in the array.
           */
          data.players.forEach((player, index) => {
            if(!player.user){
              return;
            }
            // Differentiates between the current player ('self') and other players for rendering.
            if(data.self != index) {
              container_players.innerHTML += `
              <div class="player" style="top: ${600-200*Math.sqrt(10-20*(index/(data.players.length-1)-0.5)**2)}%;">
                <div class = "playerdata">
                <div class="playername">${player.user} </div>
                <div class="playername"> ${player.balance} Chips</div>
                </div>
                <div class="cards" id="cards${index}"></div>
              </div>
              `;
            } else {
              container_self.innerHTML += `
              <div class="player">
                <div class = "playerdata">
                <div class="playername">${player.user} </div>
                <div class="playername"> ${player.balance} Chips</div>
                </div>
                <div class="cards" id="cards${index}"></div>
              </div>
              `;
            }
            /**
             * Creates and displays the cards for each player.
             * Adds a click event listener to each card for selection during the draw phase.
             * @param {string} card - The name of the card.
             * @param {number} j - The index of the card.
             */
            player.cards.forEach((card, j) => {
              let cardsDiv = document.getElementById(`cards${index}`);
              const src = `/img/cards/${card}.svg`
              const img = document.createElement('img');
              img.src = src;
              img.alt = card;
              img.className = "card";
              img.id = `${index}_${j}`;
              // Handles card selection for the draw phase.
              img.addEventListener('click', () => {
                const id = img.id;
                if (img.classList.contains('selected')) {
                  img.classList.remove('selected');
                  const index = drawCards.indexOf(id);
                  if (index > -1) drawCards.splice(index, 1);
                } else {
                  img.classList.add('selected');
                  drawCards.push(id);
                }
              });
              cardsDiv.appendChild(img);
            });
          });
            // This part positions the other players around the table in a curve.
            const items = container_players.querySelectorAll(":scope > div");
            const b = 100;
            items.forEach((el, i) => {
              console.log(b);
              let angle = Math.PI * (i / (items.length - 1));
              let y = b - b * Math.sin(angle);
              el.style.top = y + "%";
              
            });
      }
    });


    

    // This is a placeholder for displaying community cards.
    // const communityCards = ['herz 10', 'pik 7', 'karo 2', 'karo dame', 'pik ass'];
    // const communityDiv = document.getElementById('community');
    //
    // communityCards.forEach((card, index) => {
    //   const img = document.createElement('img');
    //   img.src = `/img/cards/${card}.svg`;
    //   img.alt = card;
    //   communityDiv.appendChild(img);
    //   img.tabIndex = 0;
    //   img.setAttribute('role', 'button');
    //   img.addEventListener('keydown', (e) => {
    //     if (e.key === 'Enter') {
    //       img.click();
    //     }
    //   });
    //   communityDiv.appendChild(img);
    // });

    /**
     * Updates the bet value display in real-time as the user moves the slider.
     */
    betSlider.addEventListener('input', () => {
      betValue.textContent = betSlider.value;
    });

/**
 * Sends a "fold" action to the server when the fold button is clicked.
 * This indicates that the player gives up the current hand.
 */
foldButton.addEventListener("click", () => { 
  ws.send(JSON.stringify({
    type: 'bet',
    lobby: lobby,
    id: sessionStorage.getItem('id') || null,
    bet: null,
    fold: true,
  }));
});


/**
 * Sends a "draw" action to the server, including the list of cards the player wants to exchange.
 */
drawButton.addEventListener("click", () => {
  ws.send(JSON.stringify({
    type: 'draw',
    lobby: lobby,
    id: sessionStorage.getItem('id') || null,
    cards: drawCards
  }));
});

/**
 * Sends a "bet" action to the server with the amount specified by the bet slider.
 */
betButton.addEventListener("click", () => {
  ws.send(JSON.stringify({
    type: 'bet',
    lobby: lobby,
    id: sessionStorage.getItem('id') || null,
    bet: document.getElementById("bet").value,
    fold: false,
  }));
});

/**
 * Sends a "leave" action to the server.
 */
document.getElementById('leaveBtn').addEventListener('click', () => {
  ws.send(JSON.stringify({
    type: 'leave',
    id: sessionStorage.getItem('id')
  }));
});



/**
 * Requests the initial game state from the server as soon as the WebSocket connection is established.
 */
ws.addEventListener('open', () => {
  ws.send(JSON.stringify({ type: 'getGameState', id: id, lobby: lobby}));
});

