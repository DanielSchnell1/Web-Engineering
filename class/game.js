//EDIT: passen als Option hinzufügen!!! -> players.active: Boolean zum überprüfen, ob ein Spieler aktiv ist
//EDIT: optional: Validierung, ob eigene Karten getauscht werden (kein Sicherheitsrisiko, aber Anzeigefehler)
//EDIT: Zweiten Spielstapel anlegen um getauschte Karten zu speichern. die getauschten Karten wieder mischeln und als neues `deck` verwenden, falls `deck` leer ist
//EDIT: Frontend anpassen: Es müssen 'players.balance', angezeigt werden und betSlider braucht einen minimal Wert: getCurrentBet() und einen maximal Wert: player.balance.


const logger = require('../logger/logger');


class Game {

    //Die erste und die dritte Runde sind Setzrunden
    static betRounds = [0, 2];
    
    //Die zweite Runde ist eine Tauschrunde
    static drawRounds = [1];

    //DELETE, wenn nicht fertig: Statt betRounds & drawRounds
    //Gibt den Spielablauf an:
    //0 -> Setzrunde
    //1 -> Tauschrunde
    //2 -> Spielende
    static rounds = [0, 1, 0, 2]

    //anlegen eines sortierten Kartendecks
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

    //Construction of Game
    constructor(jwt, name) {
        this.players = [];
        this.addPlayer(jwt, name);
        this.deck = null;
        this.currentPlayer = 0;
        this.currentRound = 0;
        this.betNoRepeat = true;    // Gibt an, ob eine Setzrunde noch nicht wiederholt wurde
    }

    //Spieler zum Game hinzufügen
    addPlayer(jwt, name, cards = [], balance= 100, active = true, bet = 0) {
        this.players.push({"jwt": jwt, "name": name, "cards": cards, "balance": balance, "active": active, "bet": bet});
        console.log(this.players);
    }

    //Gibt ein Gemischeltes Deck zurück
    createShuffledDeck() {
        const deck = [...Game.cardNames];
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }
    
    //Wandelt die Rundennummer in einen String um
    getRoundName(index){
        return ['1. Setzrunde', 'Tauschrunde', '2. Setzrunde'][index];
    }

    //Teilt jedem Spieler (standardmäßig) 5 Karten aus
    dealCards(cardsPerPlayer = 5) {
        for (const player of this.players) {
            player.cards = player.cards || [];
            for (let i = 0; i < cardsPerPlayer; i++) {
                const card = this.deck.pop();
                player.cards.push(card);
            }
        }
    }

    //Wird beim Rundenstart ausgeführt, um Variablen zurückzusetzen
    start() {
        this.currentPlayer = 0;
        this.currentRound = 0;
        this.deck = this.createShuffledDeck();
        this.players.forEach((player)=>{
            player.active = true;
            player.balance -= this.bet;
            player.bet = 5;
        });
        this.dealCards();
    }

    //Gibt ein Array aller Spielernamen zurück
    getPlayerNames(users) {
        return this.players
            .map(player => users.get(player.jwt))
            .filter(user => user && user.name)
            .map(user => user.name);
    }

    //Verarbeitet Tausch Zug, speichert Daten in players.cards ab und gibt message für Spieler zurück
    drawCards(playerId, cardIds) {

        let index = this.players.findIndex(p => p.jwt === playerId);
        let player = this.players[index];


        if(!player.active ||    
            this.currentPlayer != index || 
            !Game.drawRounds.includes(this.currentRound))
        {
            console.log("unzulässiger Tausch")
            return;
        }
        
        cardIds.forEach((cardId) => {
            const cardIndex = parseInt(cardId.match(/^\d+_(\d+)$/)[1], 10);
            player.cards[cardIndex] = this.deck.pop();
        });
        this.updateCurrentPlayer();
        return JSON.stringify({type: "drawCards", cards: player.cards});
    }

    // Validiert Setz Zug, speichert Daten in players.bet / players.active ab und gibt message für Spieler zurück.
    bet(playerId, bet, fold = false){
        let index = this.players.findIndex(p => p.jwt === playerId);
        let player = this.players[index];

        if(fold) {
            player.active = false;
            return;
        }

        //Validiere Input
        //EDIT: falls Spieler weniger balance hat, als nötig, ist ihm erlaubt alles zu setzen
        if(!player.active ||    
            bet-player.bet < 10 || 
            this.currentPlayer != index || 
            bet > player.balance ||
            !Game.betRounds.includes(this.currentRound) ||
            this.getCurrentBet()>bet)
        {
            console.log("unzulässiger Einsatz")
            return;
        }

        player.bet = bet;
        console.log(player.bet);
        this.updateCurrentPlayer();
        return JSON.stringify({ // type ist ein empty String, da die untenstehenden Variablen jedesmal aktualisiert werden.
            "type": "",
            "currentPlayer": this.getCurrentPlayer(),
            "currentBet": this.getCurrentBet(),
            "currentPot": this.getCurrentPot(),
            "currentRound": this.getRoundName(this.currentRound)
        });
    }

    //EDIT: Spielende muss noch hinzugefügt werden.
    //Berechnet den Index des nächsten Spieler
    updateCurrentPlayer(){ 
        this.currentPlayer = (this.currentPlayer+1) % this.players.length;

        if(this.currentPlayer == 0){
            this.betNoRepeat = false;
        }


        //beendet die Tausch/Setzrunde erst, wenn Alle Einsätze gleich sind.
        if(this.players.every(p => p.bet === this.players[0].bet && (!this.betNoRepeat || this.currentPlayer == 0))) {
            this.currentRound = this.currentRound+1;
            if(!this.betNoRepeat)
            {
                this.betNoRepeat = true;
                this.currentPlayer = 0;
            } 
        }
    }

    //Gibt die Summe aller Einsätze zurück (den Pot)
    getCurrentPot(){
        return this.players.reduce((sum, player) => sum + parseInt(player.bet, 10), 0);
    }
    //Gibt den höchsten aller Einsätze zurück
    getCurrentBet(){
        return Math.max(...this.players.map(player => player.bet));
    }
    //Gibt den Namen des aktuellen Spielers zurück
    getCurrentPlayer(){
        return this.players[this.currentPlayer].name;
    }

    //Gibt dem Spieler die variablen Daten zurück die zum rendern der game.html nötig sind 
    getGameState(jwt, users) {
        const data = {"type": 'getGameState', players: [], 
            "currentPlayer": this.getCurrentPlayer(),
            "currentBet": this.getCurrentBet(),
            "currentPot": this.getCurrentPot(),
            "currentRound": this.getRoundName(this.currentRound)};
        this.players.forEach((player, index) => {
            if (jwt === player.jwt) {
                data.self = index;
                data.players.push({
                    user: users.get(player.jwt).name,
                    cards: player.cards
                });
            } else {
                data.players.push({
                    user: users.get(player.jwt).name,
                    cards: Array(player.cards.length).fill("rueckseite")
                });
            }
        })
        return JSON.stringify(data);
    }

    cardRanking = {'pik': 4, 'herz': 3, 'karo': 2, 'kreuz': 1};
    valueRanking = {
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

    /**
     * Splits the cards in hand into cardTypes and cardValues Arrays.
     * @param hand
     * @returns {{cardTypes: *[], cardValues: *[]}}
     */
    extractCardInfo(hand) {
        const cardTypes = [];
        const cardValues = [];
        for (const card of hand) {
            const [type, value] = card.split(' ');
            cardValues.push(this.valueRanking[value]);
            cardTypes.push(this.cardRanking[type]);
        }
        logger.info("card Types split: " + cardTypes);
        logger.info("Card Values split: " + cardValues);
        return {cardTypes, cardValues};
    }

    /**
     * Counts how many times each card value appears in cardValues,
     * @param cardValues
     * @returns Array of card values sorted by highest value first.
     */
    countValuesSorted(cardValues) {
        const countMap = {};

        for (const value of cardValues) {
            countMap[value] = (countMap[value] || 0) + 1;
        }

        //sorting found values as key value pairs
        return Object.values(countMap).sort((a, b) => b - a);
    }

    /**
     * Counts how many times each card type appears in cardTypes,
     * @param cardTypes
     * @returns Array of card types sorted by highest type first.
     */
    countTypeSorted(cardTypes) {
        const countMap = {};

        for (const type of cardTypes) {
            countMap[type] = (countMap[type] || 0) + 1;
        }

        return Object.values(countMap).sort((a, b) => b - a);
    }

    //input hand: ["herz 10", "herz bube", "herz dame", "herz koenig", "herz ass"] and gives out Hand Score
    evaluateHand(hand) {
        logger.info("Method evaluateHand called with hand: " + hand);

        const {cardTypes, cardValues} = this.extractCardInfo(hand);

        /**
         * Section checks the hand combinations
         * @returns {boolean}
         */
        const pairFunktion = () => this.countValuesSorted(cardValues).includes(2);
        logger.info("PairFunkton result: " + pairFunktion());

        const twoPair = () => this.countValuesSorted(cardValues)[0] === 2 && this.countValuesSorted(cardValues)[1] === 2;
        logger.info("TwoPair result: " + twoPair());

        const threeOfAKind = () => this.countValuesSorted(cardValues)[0] === 3;
        logger.info("ThreeOfAKind result: " + threeOfAKind());

        const fourOfAKind = () => this.countValuesSorted(cardValues)[0] === 4;
        logger.info("FourOfAKind result: " + fourOfAKind());

        const flush = () => this.countTypeSorted(cardTypes)[0] === 5;
        logger.info("Flush result: " + flush());

        const fullHouse = () => pairFunktion() && threeOfAKind();
        logger.info("FullHouse result: " + fullHouse());

        const straight = () => {
            const sortedCardValues = [...cardValues].sort((a, b) => b - a);
            let testedForStraight = testStraight(sortedCardValues, sortedCardValues.length);

            //check for special case wheel: A,2,3,4,5, if Ass is in hand
            if (sortedCardValues.includes(14) && testedForStraight === false) {
                //new car set: Ass is mapped in new Array as one
                const sortedCardValuesSpecial = sortedCardValues.map(card => card === 14 ? 1 : card);
                //sorting new Array as normal
                sortedCardValuesSpecial.sort((a, b) => b - a);
                testedForStraight = testStraight(sortedCardValuesSpecial, sortedCardValuesSpecial.length);
            }

            if (testedForStraight) {
                return true
            } else {
                return false
            }

            function testStraight(cardArray, arrayLength) {
                let testSum = 1
                for (let i = 0; i < arrayLength - 1; i++) {
                    if (cardArray[i] - 1 === cardArray[i + 1]) {
                        testSum++;
                    }
                }
                if (testSum === 5) {
                    return true
                } else {
                    return false
                }
            }
        }
        logger.info("Straight result: " + straight());

        const highCard = () => this.countValuesSorted(cardValues)[0] === 1 && (!flush() && !straight());
        logger.info("HighCard result: " + highCard());

        const straightFlush = () => straight() && flush();
        logger.info("StraightFlush result: " + straightFlush());

        const royalFlush = () => {
            const sortedCardValues = [...cardValues].sort((a, b) => b - a);
            const royalRanks = [14, 13, 12, 11, 10];
            logger.info("sortedCardValues" + sortedCardValues);

            for (let i = 0; i < sortedCardValues.length - 1; i++) {
                if (sortedCardValues[i] !== royalRanks[i]) {
                    return false;
                }
            }
            //Connecting the dotes. Final Test for Royal Flush
            if (flush()) {
                return true;
            } else {
                return false;
            }
        }
        logger.info("RoyalFlush result: " + royalFlush());

        /**
         * Section calculates the hand rank through switch case.
         * @returns {number}
         */
        function getHandRank() {
            let handRank;
            switch (true) {
                //order of cases is important, switching Pair before Full House leads to wrong result
                case royalFlush():
                    handRank = 90000;
                    break;
                case straightFlush():
                    handRank = 80000;
                    break;
                case fourOfAKind():
                    handRank = 70000;
                    break;
                case fullHouse():
                    handRank = 60000;
                    break;
                case flush():
                    handRank = 50000;
                    break;
                case straight():
                    handRank = 40000;
                    break;
                case threeOfAKind():
                    handRank = 30000;
                    break;
                case twoPair():
                    handRank = 20000;
                    break;
                case pairFunktion():
                    handRank = 10000;
                    break;
                case highCard():
                    handRank = 0;
                    break;
                default:
                    handRank = null;
                    break;
            }
            return handRank;

        }
        return getHandRank();
    }


    /**
     * Method to calculate the tie breaker score.
     * The score is the sorted hand "hast" as compairabel number
     * @param hand
     * @returns {number}
     */
    getTieBreakerScore(hand) {
        const cardValue = this.extractCardInfo(hand).cardValues;

        cardValue.sort((a, b) => b - a);

        //Creating unique number of card hand to compare with
        let stringKonkatCardValue = "";
        for (let i = 0; i < cardValue.length; i++) {
            if (cardValue[i] < 10){
                stringKonkatCardValue += "0"+cardValue[i].toString();
            }else{
                stringKonkatCardValue += cardValue[i].toString();
            }

        }
        logger.info("Card Value as String after conkat: " + stringKonkatCardValue );
        const score = Number(stringKonkatCardValue)
        return score;
    }

}

module.exports = Game;