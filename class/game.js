const logger = require('../logger/logger');


class Game {

    static users = new Map();

    static betRounds = [0, 2];

    static drawRounds = [1];
    
    /**
     * The sequence of rounds in the game.
     * 0 = Betting round, 1 = Drawing round, 2 = End of game.
     * @type {number[]}
     * @static
     */
    static rounds = [1, 2, 1, 3]

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
     * @param {string} id - The Id of the player creating the game.
     * @param {string} name - The name of the player creating the game.
     * @param {function} onGameEndCallback - A callback function to be executed when the game ends.
     */
    constructor(id, name) {
        this.isStarted = false;
        this.players = [];
        this.addPlayer(id, name);
        this.deck = null;
        this.currentPlayer = this.getHostIndex();
        this.currentRound = 0;
        this.betNoRepeat = true;    // Gibt an, ob eine Setzrunde noch nicht wiederholt wurde
        this.cardScore = 0;
        logger.info("Game.js: Constructed Game");
    }

    /**
     * Adds a player to the game.
     * @param {string} id - The Id of the player.
     * @param {string} name - The name of the player.
     * @param {string[]} [cards=[]] - The player's cards.
     * @param {number} [balance=100] - The player's starting balance.
     * @param {boolean} [active=true] - Whether the player is active in the game.
     * @param {number} [bet=0] - The player's current bet.
     */
    addPlayer(id, name, cards = [], balance = 100, active = false, bet = 0) {
        if (this.players.length >= 5) {
            logger.info("Game.js: Player could not be added. Game is full.");
            return false;
        }
        this.players.push({
            "id": id,
            "name": name,
            "cards": cards,
            "balance": balance,
            "active": active,
            "bet": bet,
            "leaveGame": false
        });
        logger.info(("Game.js: Player added: " + name));
        return true;
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
            Game.users.get(user.id).ws.send(JSON);
        });
    }

    /**
     * Sends a JSON message to all players in a specific lobby by using the return value of a method.
     * @param {function} callback - The method which returns the JSON string.
     * @param {Array<any>} args
     */
    sendCallbackMessageToLobby(callback, args = []) {
        this.players.forEach((user) => {
            if (user.leaveGame === true) {
                return;
            }
            let message = callback(user.id, this, ...args);
            Game.users.get(user.id).ws.send(message);
            logger.info("Game.js: " + callback.name + `(${user.id}, ${this}, ${args.join(", ")}) wurde aufgerufen`);
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
        this.currentPlayer = this.getHostIndex();
        this.currentRound = 0;
        this.deck = this.createShuffledDeck();
        logger.info("game.js: Initialised Game variabels and setting player variabels");
        this.players = this.players.filter(p => !p.leaveGame);
        this.players.forEach((player) => {
            if (player.balance < 5) {
                player.active = false;
                return;
            }
            player.active = true;
            player.bet = 5;
            player.cards = [];
            player.cardScore = 0;
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
            .map(player => users.get(player.id))
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
        let index = this.players.findIndex(p => p.id === playerId);
        let player = this.players[index];

        if (!player.active ||
            this.currentPlayer != index ||
            !Game.drawRounds.includes(this.currentRound)) {
            logger.info("unzulässiger Tauschzug")
            return;
        }

        cardIds.forEach((cardId) => {
            const cardIndex = parseInt(cardId.match(/^\d+_(\d+)$/)[1], 10);
            player.cards[cardIndex] = this.deck.pop();
        });

        this.updateCurrentPlayer();
        logger.info("game.js: switched card of player: " + player.name);
        this.sendCallbackMessageToLobby(this.getMoveStateJSON, [this]);
        return JSON.stringify({type: "drawCards", cards: player.cards});
    }

    /**
     * Validates if a player's bet is valid.
     * @param {string} playerId - The ID of the player.
     * @param {number} bet - The amont of the bet.
     * @param {boolean} [fold=false] - Wether the player is folding.
     * @param {number} playerIndex - The index of the player in the players arrey.
     * @returns {boolean} - True if the bet is valid, otherwise false.
     */
    betIsValid(playerId, bet, fold = false, playerIndex) {
        let player = this.players[playerIndex];
        if (!Game.betRounds.includes(this.currentRound) || this.currentPlayer != playerIndex || !player.active) {
            logger.info("Fehler: Spieler ist nicht am Zug");
            return false;
        }
        if (fold) {
            logger.info("game.js: Spieler hat gepasst")
            return true;
        }
        //Spieler hat nicht genug Geld -> Es muss alles gesetzt werden, was er noch hat
        if (this.getCurrentBet() > player.balance) {
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
        let index = this.players.findIndex(p => p.id === playerId);
        let player = this.players[index];

        if (!this.betIsValid(playerId, bet, fold, index)) {
            // logger.error(`game.js: Unzulässiger Einsatz: fold: ${fold}, active: ${player.active},
            //     betDiff: ${bet - player.bet}, currentPlayer: ${this.currentPlayer != index}, balance: ${player.balance}
            //     , currentRound: ${this.currentRound}, currentBet: ${this.getCurrentBet}`);
            return;
        }

        if (fold) {
            player.active = false;
            this.updateCurrentPlayer();
            this.sendCallbackMessageToLobby(this.getGameState);
            logger.info("Game.js: Fold");
            return;
        }
        player.bet = bet;
        this.updateCurrentPlayer();

        logger.info("Game.js: Spiel ende nicht identifiziert. Aktualisieren der Lobby ");
        this.sendCallbackMessageToLobby((userId) => {
            return JSON.stringify({
                "type": "",
                "currentPlayer": this.getCurrentPlayer(),
                "currentBet": this.getCurrentBet(),
                "currentPot": this.getCurrentPot(),
                "currentRound": this.getRoundName(this.currentRound),
                "balance": this.players.find(player => player.id === userId).balance,
            })
        });
        this.sendCallbackMessageToLobby(this.getMoveStateJSON, [this]);
    }

    /**
     * Updates the current player to the next active player and advances the round if necessary.
     * @returns {string|undefined} A JSON string with the game end state, or undefined if the game continues.
     */
    updateCurrentPlayer() {
        if (this.players.filter(p => p.active).length == 1) {
            this.currentRound = 3;
            this.gameEnd();
            this.sendCallbackMessageToLobby(this.getGameState, [true]);
            logger.info("Game.js: Spiel ende identifiziert. aufruf game.js gameEnd()");
            return;
        }
        if (this.currentPlayer == this.getLastActivePlayerIndex()) {
            this.betNoRepeat = false;
        }
        do {
            this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        } while (!this.players[this.currentPlayer].active || this.players[this.currentPlayer].leaveGame);

        //beendet die Tausch/Setzrunde erst, wenn Alle Einsätze gleich sind. Oder wenn der erste Spieler dran ist (bei Tauschrunden)
        if (
            this.players
                .filter(p => p.active)
                .every(p => p.bet == this.getCurrentBet() ||
                    (p.bet < this.getCurrentBet() &&
                        p.bet == p.balance)) &&
            (!this.betNoRepeat && this.currentPlayer == this.getFirstActivePlayerIndex())
        ) {
            this.currentRound = this.currentRound + 1;
            if (!this.betNoRepeat) {
                this.betNoRepeat = true;
                this.currentPlayer = this.getFirstActivePlayerIndex();
            }
        }
        logger.info("game.js: Set next player as current player. Now in Gameround: " + this.currentRound);

        //Return message from gameEnd
        if (this.currentRound === 3) {
            logger.info("Game.js: Spiel ende identifiziert. aufruf game.js gameEnd()");
            this.gameEnd();
            this.sendCallbackMessageToLobby(this.getGameState, [true]);
        }
    }


    /**
     * Calculates the winner of the game, distributes the pot, and starts a new game.
     * @returns {string} A JSON string with the winner's name and the final pot.
     */
    gameEnd() {
        this.calculateFinalScore();

        const sortedPlayers = this.players;
        sortedPlayers.sort((a, b) => b.cardScore - a.cardScore);

        const winner = sortedPlayers.length > 0 ? sortedPlayers[0] : null;

        logger.info(`game.js: Winner: ${winner.name} with score ${winner.cardScore}, Pot: ${this.getCurrentPot()}`);
        this.payOut(sortedPlayers)
    }

    /**
     * Pays out the pot to the winer and adjusts other players' balances.
     * @param {Array<Object>} activePlayerSortedByScore - An arrey of active players, sorted by their score.
     */
    payOut(activePlayerSortedByScore) {
        const winner = activePlayerSortedByScore[0];
        activePlayerSortedByScore.forEach(player => {
            if (player.id != winner.id) {
                player.balance = player.balance - player.bet;
            } else {
                winner.balance += this.getCurrentPot() - winner.bet;
            }
        })
    }

    /**
     * Calculates the final score of each player. Concatinates the hand combination score and the tie breaker score.
     * @returns {string} A JSON string with the final score of each player.
     */
    calculateFinalScore() {
        this.players.forEach(player => {
            if (player.active) {
                let handCombinationScore = this.evaluateHand(player.cards).toString()
                let tieBreakScore = this.getTieBreakerScore(player.cards).toString()
                handCombinationScore += tieBreakScore
                player.cardScore = Number(handCombinationScore)
            }
        })
    }

    /**
     * Gets the move state for a player and returns it as a JSON string. This is a wraper function.
     * @param {string} userId - The ID of the player.
     * @param {Game} [self=this] - The game instance.
     * @returns {string} - A JSON string representing the player's move state.
     */
    getMoveStateJSON(userId, self = this) {
        return JSON.stringify({
            type: "moveState",
            moveState: self.getMoveState(userId, self)
        });
    }

    /**
     * Gets the move state for a spesific player. The move state determins what actions the player can take.
     * @param {string} userId - The ID of the player.
     * @param {Game} [self=this] - The game instence.
     * @returns {number} - The move state code.
     */
    getMoveState(userId, self = this) {
        if (self.players.findIndex(p => p.id === userId) == self.currentPlayer) {
            return Game.rounds[self.currentRound];
        }
        return 0;
    }


    /**
     * Gets the Index of the last active player (last means: biggest index in players)
     * @returns {number} The index of the last active player.
     */
    getLastActivePlayerIndex() {
        return this.players.findLastIndex(player => player.active);
    }

    /**
     * Gets the Index of the first active player (first means: smallest index in players)
     * @returns {number} The index of the first active player.
     */
    getFirstActivePlayerIndex() {
        return this.players.findIndex(player => player.id == this.getFirstActivePlayerId())
    }

    /**
     * Gets the Id of the first active player (first means: smallest index in players)
     * @returns {String} The Id of the first active player.
     */
    getFirstActivePlayerId() {
        return this.players.find(player => player.active == true).id;
    }

    /**
     * Gets the current Id of the host.
     * @returns {String} The host Id.
     */
    getHostId() {
        return this.players.find(player => player.leaveGame === false).id;
    }

    /**
     * Gets the current Index of the host.
     * @returns {number} The index of the Host in players
     */
    getHostIndex() {
        return this.players.findIndex(player => player.id == this.getHostId())
    }

    /**
     * Gets the length of the players who are still
     * @returns {number} The length of the players, who aren't leaving
     */
    playersLength() {
        return this.players.filter(player => !player.leaveGame).length;
    }

    /**
     * Gets the current total pot.
     * @returns {number} The current pot.
     */
    getCurrentPot() {
        return this.players.reduce((sum, player) => sum + parseInt(player.bet, 10), 0);
    }

    /**
     * Gets the current highest bet.
     * @returns {number} The current highest bet.
     */
    getCurrentBet() {
        return Math.max(...this.players.map(player => player.bet));
    }

    /**
     * Gets the name of the current player.
     * @returns {string} The name of the current player.
     */
    getCurrentPlayer() {
        return this.players[this.currentPlayer].name;
    }


    /**
     * Gets the current game state for a specific player.
     * @param {string} id - The Id of the player requesting the game state.
     * @param {Map<string, {name: string}>} users - A map of users.
     * @param {Game} self - If getGameState is called from sendCallableMessageToLobby()
     * @param {boolean} reveal - If True: Returns All Player Cards
     * @returns {string} A JSON string with the current game state.
     */
    getGameState(id, self = this, reveal = false) {
        const data = {
            "type": 'getGameState',
            "players": [],
            "currentPlayer": self.getCurrentPlayer(),
            "currentBet": self.getCurrentBet(),
            "currentPot": self.getCurrentPot(),
            "currentRound": self.getRoundName(self.currentRound),
            "self": null,
            "host": id === self.getHostId(),
            "moveState": self.getMoveState(id, self),
            "balance": self.players.find(p => p.id === id).balance,
        };
        self.players.forEach((player, index) => {
            if (!player.active) {
                data.players.push({
                    "user": null,
                    "cards": null,
                    "balance": null,
                    "cardScore": null
                });
                return;
            }

            const isSelf = id === player.id;
            const showCards = self.currentRound == 3 || isSelf || reveal;
            if (isSelf) {
                data.self = index;
            }

            data.players.push({
                "user": player.name,
                "cards": showCards ? player.cards : Array(player.cards.length).fill("rueckseite"),
                "balance": player.balance,
                "cardScore": player.cardScore
            });

            logger.info("game.js: Assigned cards for player" + player.name);
        });
        console.log("getGameState:" + JSON.stringify(data));
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
     * Extracts the types and values of cards in a hand.
     * @param {string[]} hand - An array of card names.
     * @returns {{cardTypes: number[], cardValues: number[]}} An object containing arrays of card types and values.
     */
    extractCardInfo(hand) {
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
    countValuesSorted(cardValues) {
        const countMap = {};

        for (const value of cardValues) {
            countMap[value] = (countMap[value] || 0) + 1;
        }
        return Object.values(countMap).sort((a, b) => b - a);
    }

    /**
     * Counts the occurrences of each card type and sorts them in descending order.
     * @param {number[]} cardTypes - An array of card types.
     * @returns {number[]} An array of card type counts, sorted in descending order.
     */
    countTypeSorted(cardTypes) {
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
    evaluateHand(hand) {
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
                const sortedCardValuesSpecial = sortedCardValues.map(card => card === 14 ? 1 : card);
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
                    handRank = 9;
                    break;
                case straightFlush():
                    handRank = 8;
                    break;
                case fourOfAKind():
                    handRank = 7;
                    break;
                case fullHouse():
                    handRank = 6;
                    break;
                case flush():
                    handRank = 5;
                    break;
                case straight():
                    handRank = 4;
                    break;
                case threeOfAKind():
                    handRank = 3;
                    break;
                case twoPair():
                    handRank = 2;
                    break;
                case pairFunktion():
                    handRank = 1;
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
    getTieBreakerScore(hand) {
        const cardValue = this.extractCardInfo(hand).cardValues;

        cardValue.sort((a, b) => b - a);

        //Creating unique concatinated number to compare card hands
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