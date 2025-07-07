//EDIT: passen als Option hinzufügen!!! -> players.active: Boolean zum überprüfen, ob ein Spieler aktiv ist
//EDIT: optional: Validierung, ob eigene Karten getauscht werden (kein Sicherheitsrisiko, aber Anzeigefehler)
//EDIT: Zweiten Spielstapel anlegen um getauschte Karten zu speichern. die getauschten Karten wieder mischeln und als neues `deck` verwenden, falls `deck` leer ist
//EDIT: Frontend anpassen: Es müssen 'players.balance', angezeigt werden und betSlider braucht einen minimal Wert: getCurrentBet() und einen maximal Wert: player.balance.


const logger = require('../logger/logger');
const {log} = require("winston");


class Game {

    static users = new Map();

    //Die erste und die dritte Runde sind Setzrunden
    static betRounds = [0, 2];

    //Die zweite Runde ist eine Tauschrunde
    static drawRounds = [1];


    /**
     * The sequence of rounds in the game.
     * 0 = Betting round, 1 = Drawing round, 2 = End of game.
     * @type {number[]}
     * @static
     */
    static rounds = [0, 1, 0, 2]

    /**
     * Creates a sorted deck of cards.
     * @returns {string[]} An array of card names.
     * @static
     */
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
        logger.info("Game.js: created Card Deck");
        return cards;
    })();

    /**
     * Creates a new game instance.
     * @param {string} jwt - The JSON Web Token of the player creating the game.
     * @param {string} name - The name of the player creating the game.
     * @param {function} onGameEndCallback - A callback function to be executed when the game ends.
     */
    constructor(jwt, name) {
        this.isStarted = false;
        this.players = [];
        this.addPlayer(jwt, name);
        this.deck = null;
        this.currentPlayer = 0;
        this.currentRound = 0;
        this.betNoRepeat = true;    // Gibt an, ob eine Setzrunde noch nicht wiederholt wurde
        logger.info("Game.js: Constructed Game");
    }

    /**
     * Adds a player to the game.
     * @param {string} jwt - The JSON Web Token of the player.
     * @param {string} name - The name of the player.
     * @param {string[]} [cards=[]] - The player's cards.
     * @param {number} [balance=100] - The player's starting balance.
     * @param {boolean} [active=true] - Whether the player is active in the game.
     * @param {number} [bet=0] - The player's current bet.
     */
    addPlayer(jwt, name, cards = [], balance = 100, active = false, bet = 0) {
        this.players.push({"jwt": jwt, 
            "name": name, 
            "cards": cards, 
            "balance": balance, 
            "active": active, 
            "bet": bet, 
            "leaveGame": false});
        logger.info(("Game.js: Player added: " + name));
    }

    /**
     * Creates and returns a shuffled deck of cards.
     * @returns {string[]} A shuffled deck of cards.
     */
    createShuffledDeck() {
        const deck = [...Game.cardNames];
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        logger.info("game.js: Shuffled Deck created");
        return deck;
    }

    /**
     * Converts a round number to its string representation.
     * @param {number} index - The index of the round.
     * @returns {string} The name of the round.
     */
    getRoundName(index) {
        return ['1. Setzrunde', 'Tauschrunde', '2. Setzrunde', 'Showdown'][index];
    }


    /**
     * Sends a JSON message to all players in a specific lobby.
     * @param {string} JSON - The JSON string message to send to each player.
     */
    sendMessageToLobby(JSON) {
        this.players.forEach(user => {
            Game.users.get(user.jwt).ws.send(JSON);
        });
    }

    /**
     * Sends a JSON message to all players in a specific lobby by using the return value of a method.
     * @param {function} callback - The method which returns the JSON string.
     * @param {Array<any>} args
     */
    sendCallbackMessageToLobby(callback, args = []) {
        this.players.forEach((user) => {
            if(user.leaveGame === true){
                return;
            }
            let message = callback(user.jwt, this, ...args);
            Game.users.get(user.jwt).ws.send(message);
            logger.info("Game.js: " + callback.name + `(${user.jwt}, ${this}, ${args.join(", ")}) wurde aufgerufen`);
        });
    }




    /**
     * Deals cards to each player.
     * @param {number} [cardsPerPlayer=5] - The number of cards to deal to each player.
     */
    dealCards(cardsPerPlayer = 5) {
        for (const player of this.players) {
            player.cards = player.cards || [];
            for (let i = 0; i < cardsPerPlayer; i++) {
                const card = this.deck.pop();
                player.cards.push(card);
            }
        }
        logger.info("game.js: Cards dealt to all Players");
    }

    /**
     * Starts the game, initializes variables, and deals cards.
     */
    start() {
        this.isStarted = true;
        this.currentPlayer = 0;
        this.currentRound = 0;
        this.deck = this.createShuffledDeck();
        logger.info("game.js: Initialised Game variabels and setting player variabels");
        this.players = this.players.filter(p => !p.leaveGame);
        this.players.forEach((player) => {
            if(player.balance < 5) {
                return;
            }
            player.active = true;
            player.balance -= player.bet;
            player.bet = 5;
            player.cards = [];
        });
        this.dealCards();
        this.sendCallbackMessageToLobby(this.getGameState);
    }

    /**
     * Gets the names of all players in the game.
     * @param {Map<string, {name: string}>} users - A map of users.
     * @returns {string[]} An array of player names.
     */
    getPlayerNames(users) {
        return this.players
            .map(player => users.get(player.jwt))
            .filter(user => user && user.name)
            .map(user => user.name);
    }

    /**
     * Processes a player's card draw.
     * @param {string} playerId - The ID of the player.
     * @param {string[]} cardIds - The IDs of the cards to be drawn.
     * @returns {string|undefined} A JSON string with the player's new cards, or undefined if the move is invalid.
     */
    drawCards(playerId, cardIds) {
        //Auswahl des Spielers und Validierung des Zugs
        let index = this.players.findIndex(p => p.jwt === playerId);
        let player = this.players[index];

        //Auswahl was geschieht wenn der Spieler dran oder aktiv ist
        if (!player.active ||
            this.currentPlayer != index ||
            !Game.drawRounds.includes(this.currentRound)) {
            logger.info("unzulässiger Tauschzug")
            return;
        }

        cardIds.forEach((cardId) => {
            const cardIndex = parseInt(cardId.match(/^\d+_(\d+)$/)[1], 10);
            //implementieren von verschieben der Karten in "used Deck"
            player.cards[cardIndex] = this.deck.pop();
        });
        //Nächster Spieler
        this.updateCurrentPlayer();
        logger.info("game.js: switched card of player: " + player.name);
        return JSON.stringify({type: "drawCards", cards: player.cards});
    }



    betIsValid(playerId, bet, fold = false, playerIndex) {
        let player = this.players[playerIndex];
        if(!Game.betRounds.includes(this.currentRound) || this.currentPlayer != playerIndex || !player.active) {
            logger.info("Fehler: Spieler ist nicht am Zug");
            return false;
        }
        if(fold) {
            logger.info("Spieler hat gepasst")
            return true;
        }
        //Spieler hat nicht genug Geld -> Es muss alles gesetzt werden, was er noch hat
        if(this.getCurrentBet() > player.balance) {
            logger.info("Spieler hat nicht genug Chips: betIsValid() -> " + (bet == player.balance))
            return bet == player.balance; 
        }
        logger.info("Es liegt kein Spezialfall vor: betIsValid() -> " + (bet <= player.balance && bet >= this.getCurrentBet()))
        return bet <= player.balance && bet >= this.getCurrentBet();
    }


    /**
     * Processes a player's bet.
     * @param {string} playerId - The ID of the player.
     * @param {number} bet - The amount the player is betting.
     * @param {boolean} [fold=false] - Whether the player is folding.
     * @returns {string|undefined} A JSON string with the updated game state, or undefined if the move is invalid.
     */
    bet(playerId, bet, fold = false) {
        let index = this.players.findIndex(p => p.jwt === playerId);
        let player = this.players[index];

        //Validiere Input
        //EDIT: falls Spieler weniger balance hat, als nötig, ist ihm erlaubt alles zu setzen
        if (!this.betIsValid(playerId, bet, fold, index)) {
            logger.error(`game.js: Unzulässiger Einsatz: fold: ${fold}, active: ${player.active}, 
                betDiff: ${bet-player.bet}, currentPlayer: ${this.currentPlayer != index}, balance: ${player.balance}
                , currentRound: ${this.currentRound}, currentBet: ${this.getCurrentBet}`);
            return;
        }


        

        //Fall 1: Spieler hat gefoldet und ist daher nicht mehr aktiv
        if (fold) {
            player.active = false;
            this.updateCurrentPlayer();
            this.sendCallbackMessageToLobby(this.getGameState);
            logger.info("Game.js: Fold");
            return;
        }

        this.updateCurrentPlayer();
        player.bet = bet;
        

        logger.info("Game.js: Spiel ende nicht identifiziert. Aktualisieren der Lobby ");
        this.sendMessageToLobby(
            JSON.stringify({ // type ist ein empty String, da die untenstehenden Variablen jedesmal aktualisiert werden.
                "type": "",
                "currentPlayer": this.getCurrentPlayer(),
                "currentBet": this.getCurrentBet(),
                "currentPot": this.getCurrentPot(),
                "currentRound": this.getRoundName(this.currentRound),
        }));
  


    }

    /**
     * Updates the current player to the next active player and advances the round if necessary.
     * @returns {string|undefined} A JSON string with the game end state, or undefined if the game continues.
     */
    updateCurrentPlayer() {
        if(this.players.filter(p => p.active).length < 2) {
            this.currentRound = 3;
            this.sendCallbackMessageToLobby(this.getGameState, [true]);
            logger.info("Game.js: Spiel ende identifiziert. aufruf game.js gameEnd()");
            this.gameEnd();
            return;
            //EDIT: Falls nur noch einer (oder weniger) Spieler mitspielen, soll das Spiel beendet werden
        }
        do {
            this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        } while(!this.players[this.currentPlayer].active);

        if (this.currentPlayer == 0) {
            this.betNoRepeat = false;
        }


        //beendet die Tausch/Setzrunde erst, wenn Alle Einsätze gleich sind. Oder wenn der erste Spieler dran ist (bei Tauschrunden)
        if (
            this.players
                .filter(p => p.active)
                .every(p => p.bet === this.players.find(p2 => p2.active).bet) &&
            (!this.betNoRepeat || this.currentPlayer === 0)
        ) {
            this.currentRound = this.currentRound + 1;
            if (!this.betNoRepeat) {
                this.betNoRepeat = true;
                this.currentPlayer = 0;
            }
        }
        logger.info("game.js: Set next player as current player. Now in Gameround: " + this.currentRound);

        //Return message from gameEnd
        if (this.currentRound === 3) {
            this.sendCallbackMessageToLobby(this.getGameState);
            logger.info("Game.js: Spiel ende identifiziert. aufruf game.js gameEnd()");
            this.gameEnd();
            return;
        }
    }


    /**
     * Calculates the winner of the game, distributes the pot, and starts a new game.
     * @returns {string} A JSON string with the winner's name and the final pot.
     */
    gameEnd() {
        let highScore = 0;
        let highScoringPlayers = [];
        let winner = null;

        this.players.filter(p => p.active).forEach(player => {
            const score = this.evaluateHand(player.cards);

            if (score > highScore) {
                highScore = score;
                highScoringPlayers = [player];  // Neuer Highscore → Liste neu starten
            } else if (score === highScore) {
                highScoringPlayers.push(player);  // Gleichstand → Spieler zur Liste hinzufügen
            }
        });

        // Wenn nur ein Spieler den höchsten Score hat
        if (highScoringPlayers.length === 1) {
            winner = highScoringPlayers[0];
        } else {
            // Tie-Breaker notwendig
            winner = highScoringPlayers[0];
            let bestTieBreakerScore = this.getTieBreakerScore(winner.cards);

            for (let i = 1; i < highScoringPlayers.length; i++) {
                const player = highScoringPlayers[i];
                const tieBreakerScore = this.getTieBreakerScore(player.cards);

                if (tieBreakerScore > bestTieBreakerScore) {
                    bestTieBreakerScore = tieBreakerScore;
                    winner = player;
                }
            }
        }
        logger.info("game.js: Winner: " + winner.name + "Pot:" + this.getCurrentPot());
        winner.balance += this.getCurrentPot();
        setTimeout(() => {
            logger.info("game.js: Starting new Game");
            this.start();
        }, 3000);
    }




        /**
         * Gets the current Id of the host.
         * @returns {String} The host Id.
         */
        getHostId()
        {
            return this.players.find(player => player.leaveGame === false).jwt;
        }
        /**
         * Gets the current total pot.
         * @returns {number} The current pot.
         */
        getCurrentPot()
        {
            return this.players.reduce((sum, player) => sum + parseInt(player.bet, 10), 0);
        }
        /**
         * Gets the current highest bet.
         * @returns {number} The current highest bet.
         */
        getCurrentBet()
        {
            return Math.max(...this.players.map(player => player.bet));
        }
        /**
         * Gets the name of the current player.
         * @returns {string} The name of the current player.
         */
        getCurrentPlayer()
        {
            return this.players[this.currentPlayer].name;
        }


        /**
         * Gets the current game state for a specific player.
         * @param {string} jwt - The JSON Web Token of the player requesting the game state.
         * @param {Map<string, {name: string}>} users - A map of users.
         * @param {Game} self - If getGameState is called from sendCallableMessageToLobby()
         * @param {boolean} reveal - If True: Returns All Player Cards
         * @returns {string} A JSON string with the current game state.
         */
        getGameState(jwt, self = this, reveal = false)
        {
            const data = {
                "type": 'getGameState', 
                "players": [],
                "currentPlayer": self.getCurrentPlayer(),
                "currentBet": self.getCurrentBet(),
                "currentPot": self.getCurrentPot(),
                "currentRound": self.getRoundName(self.currentRound),
                "self": null,
                "host": jwt === self.getHostId()
            };
            self.players.forEach((player, index) => {
                if (!player.active) {
                    data.players.push({
                        "user": null,
                        "cards": null,
                        "balance": null,
                    });
                    return;
                }

                const isSelf = jwt === player.jwt;
                const showCards = self.currentRound == 3 || isSelf || reveal;
                if (isSelf) {
                    data.self = index;
                }

                data.players.push({
                    "user": player.name,
                    "cards": showCards ? player.cards : Array(player.cards.length).fill("rueckseite"),
                    "balance": player.balance
                });

                logger.info("game.js: Started game state generation. Assigned cards for player");
            });
            console.log("getGameState:" + JSON.stringify(data));
            return JSON.stringify(data);
        }

        

        /**
         * A map of card suit rankings.
         * @type {Object.<string, number>}
         */
        cardRanking = {'pik': 4, 'herz': 3, 'karo': 2, 'kreuz': 1};
        /**
         * A map of card value rankings.
         * @type {Object.<string, number>}
         */
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
         * Extracts the types and values of cards in a hand.
         * @param {string[]} hand - An array of card names.
         * @returns {{cardTypes: number[], cardValues: number[]}} An object containing arrays of card types and values.
         */
        extractCardInfo(hand)
        {
            const cardTypes = [];
            const cardValues = [];
            for (const card of hand) {
                const [type, value] = card.split(' ');
                cardValues.push(this.valueRanking[value]);
                cardTypes.push(this.cardRanking[type]);
            }
            logger.info("game.js: card Types split: " + cardTypes);
            logger.info("game.js: Card Values split: " + cardValues);
            return {cardTypes, cardValues};
        }

        /**
         * Counts the occurrences of each card value and sorts them in descending order.
         * @param {number[]} cardValues - An array of card values.
         * @returns {number[]} An array of card value counts, sorted in descending order.
         */
        countValuesSorted(cardValues)
        {
            const countMap = {};

            for (const value of cardValues) {
                countMap[value] = (countMap[value] || 0) + 1;
            }

            //sorting found values as key value pairs
            return Object.values(countMap).sort((a, b) => b - a);
        }

        /**
         * Counts the occurrences of each card type and sorts them in descending order.
         * @param {number[]} cardTypes - An array of card types.
         * @returns {number[]} An array of card type counts, sorted in descending order.
         */
        countTypeSorted(cardTypes)
        {
            const countMap = {};

            for (const type of cardTypes) {
                countMap[type] = (countMap[type] || 0) + 1;
            }

            return Object.values(countMap).sort((a, b) => b - a);
        }

        /**
         * Evaluates a player's hand and returns its rank.
         * @param {string[]} hand - An array of card names.
         * @returns {number} The rank of the hand.
         */
        evaluateHand(hand)
        {
            logger.info("game.js: Method evaluateHand called with hand: " + hand);

            const {cardTypes, cardValues} = this.extractCardInfo(hand);

            const pairFunktion = () => this.countValuesSorted(cardValues).includes(2);
            logger.info("game.js: PairFunkton result: " + pairFunktion());

            const twoPair = () => this.countValuesSorted(cardValues)[0] === 2 && this.countValuesSorted(cardValues)[1] === 2;
            logger.info("game.js: TwoPair result: " + twoPair());

            const threeOfAKind = () => this.countValuesSorted(cardValues)[0] === 3;
            logger.info("game.js: ThreeOfAKind result: " + threeOfAKind());

            const fourOfAKind = () => this.countValuesSorted(cardValues)[0] === 4;
            logger.info("game.js: FourOfAKind result: " + fourOfAKind());

            const flush = () => this.countTypeSorted(cardTypes)[0] === 5;
            logger.info("game.js: Flush result: " + flush());

            const fullHouse = () => pairFunktion() && threeOfAKind();
            logger.info("game.js: FullHouse result: " + fullHouse());

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
            logger.info("game.js: Straight result: " + straight());

            const highCard = () => this.countValuesSorted(cardValues)[0] === 1 && (!flush() && !straight());
            logger.info("game.js: HighCard result: " + highCard());

            const straightFlush = () => straight() && flush();
            logger.info("game.js: StraightFlush result: " + straightFlush());

            const royalFlush = () => {
                const sortedCardValues = [...cardValues].sort((a, b) => b - a);
                const royalRanks = [14, 13, 12, 11, 10];

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
            logger.info("game.js: RoyalFlush result: " + royalFlush());

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
         * Calculates a tie-breaker score for a hand.
         * @param {string[]} hand - An array of card names.
         * @returns {number} The tie-breaker score.
         */
        getTieBreakerScore(hand)
        {
            const cardValue = this.extractCardInfo(hand).cardValues;

            cardValue.sort((a, b) => b - a);

            //Creating unique number of card hand to compare with
            let stringKonkatCardValue = "";
            for (let i = 0; i < cardValue.length; i++) {
                if (cardValue[i] < 10) {
                    stringKonkatCardValue += "0" + cardValue[i].toString();
                } else {
                    stringKonkatCardValue += cardValue[i].toString();
                }

            }
            logger.info("game.js: Card Value as String after conkat: " + stringKonkatCardValue);
            const score = Number(stringKonkatCardValue)
            return score;
        }

    }

    module.exports = Game;
