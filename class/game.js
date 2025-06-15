class Game {
    static cardNames = (() => {
        const suits = ['herz', 'karo', 'pik', 'kreuz'];
        const values = [
            '2', '3', '4', '5', '6', '7', '8', '9', '10',
            'bube', 'dame', 'koenig', 'ass'
            ];
        const cards = [];
        for (let suit of suits) {
            for (let value of values) {
                cards.push(`${suit} ${value}`);
            }
        }
        return cards;
    })();
    
    constructor(jwt) {
        this.players = [];
        this.addPlayer(jwt, null);
        this.deck = this.createShuffledDeck();
    }
  
    addPlayer(jwt, cards = []) {
        this.players.push({ jwt, cards });
    }

    createShuffledDeck() {
        const deck = [...Game.cardNames];
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }
    dealCards(cardsPerPlayer = 4) {
        for (const player of this.players) {
            player.cards = player.cards || [];
            for (let i = 0; i < cardsPerPlayer; i++) {
                const card = this.deck.pop();
                player.cards.push(card);
            }
        }
    }
    start()
    {
        
        this.dealCards();
    }
    getPlayerNames(users) {
    return this.players
        .map(player => users.get(player.jwt))
        .filter(user => user && user.name)
        .map(user => user.name);
    }
    drawCards(jwt, cards){

    }
    getGameState(jwt, users){
        const data = {type: 'getGameState', players: [] };
        this.players.forEach(player => {
            data.players.push({user: users.get(player.jwt).name, cards: player.cards});
        })
        return JSON.stringify(data);
    }

}



module.exports = Game;
