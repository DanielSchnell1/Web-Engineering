    const drawCards = [];
  
    ws.addEventListener('message', (event) => {
      let data = JSON.parse(event.data);


      if(data.type === "drawCards"){
        console.log("test");
        const imgs = document.querySelectorAll('#self .cards img');
        data.cards.forEach((card, index)=>{
          imgs[index].src = `/img/cards/${data.cards[index]}.svg`
        });
      }


      if(data.type === "getGameState"){
        
          data.players.forEach((player, index) => {
            if(data.self != index) {
              let container = document.getElementById(`players`);
              container.innerHTML += `
              <div class="player" style="top: ${600-200*Math.sqrt(10-20*(index/(data.players.length-1)-0.5)**2)}%;">
                <div class="playername">${player.user}</div>
                <div class="cards" id="cards${index}"></div>
              </div>
              `;
            } else {
              let container = document.getElementById(`self`);
              container.innerHTML += `
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


    // Einsatzanzeige
    const betSlider = document.getElementById('bet');
    const betValue = document.getElementById('betValue');
    const betButton = document.getElementById('betButton');

    betSlider.addEventListener('input', () => {
      betValue.textContent = betSlider.value;
    });

    betButton.addEventListener('click', () => {
      alert(`Du setzt ${betSlider.value} Chips!`);
    });


document.getElementById("drawButton").addEventListener("click", () => {
  ws.send(JSON.stringify({
    type: 'draw',
    lobby: lobby,
    token: sessionStorage.getItem('jwt') || null,
    cards: drawCards
  }));
});

ws.addEventListener('open', () => {
  ws.send(JSON.stringify({ type: 'getGameState', token: token, lobby: lobby}));
});

