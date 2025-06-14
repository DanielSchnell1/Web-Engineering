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

    //Construction of Player
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
    getPlayerNames(usersMap) {
    return this.players
        .map(player => usersMap.get(player.jwt))
        .filter(user => user && user.name)
        .map(user => user.name);
    }

    //evaluates hand and returns handRank arry whith length 13. handRank[0] is true if hand is royal flush and so on.
    evaluateHand = (hand) => {
        const cardRanking = {'pik': 4, 'herz': 3, 'karo': 2, 'kreuz': 1};
        const valueRanking = {
            '2': 2,
            '3': 3,
            '4': 4,
            '5': 5,
            '6': 6,
            '7': 7,
            '8': 8,
            '9': 9,
            '10': 10,
            'bube': 11,
            'dame': 12,
            'koenig': 13,
            'ass': 14
        };

        // Selecting the card values and sorting them
        const valuesHand = hand.map(hand => valueRanking[card.value].sort((a,b) => a -b));

        //Selection Type of card
        //"const cardType is maped and sorted with function given card (iteration variabel like python) selecting Card Type"
        const cardType = hand.map(card => card.type.sort((a,b) => a -b));

        //Finding identical Kard values
        const valueCounts = {};
        //iterating throug all cards. increment card value if found. Saved in const value count
        values.forEach(value => valueCounts[value] = (valueCounts[value] || 0) + 1);


        //Beginning to lookup Card Combinations

        //"Sorting number of found equal cards"
        const sortedCardCount = Object.values(valueCounts).sort((a,b) => a - b);

        //Mapping boolean card checkt to resoult.
        const handRank = [13];
        for (let i = 0; i < handRank.length; i++) {
            handRank[i] = false;
        }

        //checking object for equal card combinations
        //Four of a Kind
        handRank[2] = sortedCardCount[4] === 4;
        //Three of a Kind
        handRank[6] = sortedCardCount[0] === 3;
        //Pair
        handRank[8]= sortedCardCount[0] === 2;
        //Two Pair
        handRank[7] = sortedCardCount[0] === 2 && sortedCardCount[1] === 2;
        //Full House
        handRank[3]= sortedCardCount[0] === 2 && sortedCardCount[1] === 3;

        //Flush
        //"Checking if every card has the same cardType. cardType[0] is not the actual comparison value because of fucking js syntax"
        handRank[4]= cardType.every(card => card === cardType[0]);

        handRank[5] = values => {
            // Sort values in ascending order
            values.sort((a, b) => a - b);

            // Check for Ace-low straight (A,2,3,4,5)
            if (values[0] === 2 && values[3] === 5 && values[4] === 14) {
                values[4] = 1; // Treat Ace as 1
                values.sort((a, b) => a - b);
            }

            // Check if values form a sequence
            for (let i = 0; i < values.length - 1; i++) {
                if (values[i + 1] - values[i] !== 1) {
                    return false;
                }
            }
            return true;
        };

        //Highest card in hand
        handRank[13] = sortedCardCount[0] === 1;
        //Royal Flush
        handRank[0] = handRank[4] && handRank[5](valuesHand[0])&&valuesHand[0].includes(14)&&valuesHand[0].includes(10);

        //Remove if handRank is done
        let handrank = ' ';
        switch (true) {
            case isFlush && isStraight && values.includes(14) && values.includes(10):
                handrank = "Royal Flush";
                break;
            case isFlush && isStraight:
                handrank = "Straight Flush";
                break;
            case hasFourOfKind:
                handrank = "Four of a Kind";
                break;
            case hasFullHouse:
                handrank = "Full House";
                break;
            case isFlush:
                handrank = "Flush";
                break;
            case isStraight:
                handrank = "Straight";
                break;
            case hasThreeOfKind:
                handrank = "Three of a Kind";
                break;
            case hasTwoPair:
                handrank = "Two Pair";
                break;
            case hasPair:
                handrank = "Pair";
                break;
            default:
                handrank = "High Card";
        }
        // Gibt die Kombination zurück
        return handRank;
    }
}

module.exports = Game;