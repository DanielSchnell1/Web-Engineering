    const players = [

      { user: 'user1',    cards: ['rueckseite', 'rueckseite', 'rueckseite', 'rueckseite', 'rueckseite'] },
      { user: 'user2',    cards: ['rueckseite', 'rueckseite', 'rueckseite', 'rueckseite', 'rueckseite'] },
      { user: 'user3',    cards: ['rueckseite', 'rueckseite', 'rueckseite', 'rueckseite', 'rueckseite'] },
      { user: 'user4',    cards: ['rueckseite', 'rueckseite', 'rueckseite', 'rueckseite', 'rueckseite'] },
      { user: 'DU',    cards: ['herz 2', 'karo 3'] }
    ];
    const self = 3

    players.forEach((player, index) => {
      const container = document.getElementById(`players`);
      container.innerHTML += `
        <div class="player" style="top: ${600-200*Math.sqrt(10-20*(index/(players.length-1)-0.5)**2)}%;">
          <div class="playername">${player.user}</div>
          <div class="cards" id="cards${index}"></div>
        </div>
      `;

      player.cards.forEach((card, j) => {
        let cardsDiv = document.getElementById(`cards${index}`);
        const src = `/img/cards/${card}.svg`
        const img = document.createElement('img');
        img.src = src;
        img.alt = card;
        img.className = "card";
        img.setAttribute('draggable', 'true');
        img.id = `${index}_${j}`;
        cardsDiv.appendChild(img);
      });
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

    // Drag & Drop
    const images = document.querySelectorAll('img[draggable="true"]');
    let move = [];

    images.forEach(img => {
      img.addEventListener('dragstart', e => {
        move[0] = e.target.id;
      });
      img.addEventListener('dragover', e => {
        e.preventDefault();
        img.classList.add("drag-over");
      });
      img.addEventListener('dragleave', () => {
        img.classList.remove("drag-over");
      });
      img.addEventListener('drop', e => {
        e.preventDefault();
        img.classList.remove("drag-over");
        move[1] = e.target.id;
        console.log("Karten-Move: ", move);
        move = [];
      });
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