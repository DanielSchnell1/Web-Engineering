//const logger = require('C:/DHBW/Semester2/Web_Engineering/Web-Engineering/logger/logger.js');
const drawCards = [];
const endGame = document.getElementById('leaderboard');

    // Einsatzanzeige
    const betSlider = document.getElementById('bet');
    const betValue = document.getElementById('betValue');
    const betButton = document.getElementById('betButton');
    const foldButton = document.getElementById('foldButton');
    const drawButton = document.getElementById("drawButton");

    ws.addEventListener('message', (event) => {
      let data = JSON.parse(event.data);

      
    if (data.currentPlayer !== undefined) {
        document.getElementById("currentPlayer").textContent = "aktueller Spieler: " + data.currentPlayer;
    }
    if (data.currentBet !== undefined) {
        document.getElementById("currentBet").textContent = "Einsatz: " + data.currentBet;
    }
    if (data.currentPot !== undefined) {
        document.getElementById("currentPot").textContent = "Pot: " + data.currentPot;
    }
    if (data.currentRound !== undefined) {
        document.getElementById("currentRound").textContent = data.currentRound;
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

      if(data.type === "getGameState"){
        let container_players = document.getElementById(`players`);
        let container_self = document.getElementById(`self`);

        container_players.innerHTML = '';
        container_self.innerHTML = '';
          data.players.forEach((player, index) => {
            if(!player.user){
              return;
            }
            if(data.self != index) {
              container_players.innerHTML += `
              <div class="player" style="top: ${600-200*Math.sqrt(10-20*(index/(data.players.length-1)-0.5)**2)}%;">
                <div class="playername">${player.user}</div>
                <div class="cards" id="cards${index}"></div>
              </div>
              `;
            } else {
              container_self.innerHTML += `
              <div class="player">
                <div class="playername">${player.user}</div>
                <div class="cards" id="cards${index}"></div> 
              </div>
              `;
            }
            player.cards.forEach((card, j) => {
              let cardsDiv = document.getElementById(`cards${index}`);
              const src = `/img/cards/${card}.svg`
              const img = document.createElement('img');
              img.src = src;
              img.alt = card;
              img.className = "card";
              img.id = `${index}_${j}`;
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
            const items = container_players.querySelectorAll(":scope > div");
            const b = 100;
            items.forEach((el, i) => {
              console.log(b);
              let angle = Math.PI * (i / (items.length - 1));
              let y = b - b * Math.sin(angle);
              el.style.top = y + "%";
              
            });
      }

      if(data.type === 'endGame') {
        endGame.showModal();

      }
    });


    

    // Community Cards in der Mitte
    const communityCards = ['herz 10', 'pik 7', 'karo 2', 'karo dame', 'pik ass'];
    const communityDiv = document.getElementById('community');

    communityCards.forEach(card => {
      const img = document.createElement('img');
      img.src = `/img/cards/${card}.svg`;
      img.alt = card;
      communityDiv.appendChild(img);
    });




    betSlider.addEventListener('input', () => {
      betValue.textContent = betSlider.value;
    });

foldButton.addEventListener("click", () => { 
  ws.send(JSON.stringify({
    type: 'bet',
    lobby: lobby,
    token: sessionStorage.getItem('jwt') || null,
    bet: null,
    fold: true,
  }));
});


drawButton.addEventListener("click", () => {
  ws.send(JSON.stringify({
    type: 'draw',
    lobby: lobby,
    token: sessionStorage.getItem('jwt') || null,
    cards: drawCards
  }));
});

betButton.addEventListener("click", () => {
  ws.send(JSON.stringify({
    type: 'bet',
    lobby: lobby,
    token: sessionStorage.getItem('jwt') || null,
    bet: document.getElementById("bet").value,
    fold: false,
  }));
});


ws.addEventListener('open', () => {
  ws.send(JSON.stringify({ type: 'getGameState', token: token, lobby: lobby}));
});

