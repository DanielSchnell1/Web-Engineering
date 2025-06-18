const {toArrayBuffer} = require('ws');
const logger = require('../logger/logger');
const {log} = require("winston");


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
        this.players.push({jwt, cards});
    }

    createShuffledDeck() {
        const deck = [...Game.cardNames];
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    dealCards(cardsPerPlayer = 5) {
        for (const player of this.players) {
            player.cards = player.cards || [];
            for (let i = 0; i < cardsPerPlayer; i++) {
                const card = this.deck.pop();
                player.cards.push(card);
            }
        }
    }

    start() {

        this.dealCards();
    }

    getPlayerNames(users) {
        return this.players
            .map(player => users.get(player.jwt))
            .filter(user => user && user.name)
            .map(user => user.name);
    }

    drawCards(jwt, cards) {

    }

    getGameState(jwt, users) {
        const data = {type: 'getGameState', players: []};
        this.players.forEach((player, index) => {
            if(jwt === player.jwt)
            {
                data.self = index;
                data.players.push({
                    user: users.get(player.jwt).name, 
                    cards: player.cards});
            } else {
                data.players.push({
                    user: users.get(player.jwt).name, 
                    cards: Array(player.cards.length).fill("rueckseite")});
            }
        })
        return JSON.stringify(data);
    }

    //input hand: ["herz 10", "herz bube", "herz dame", "herz koenig", "herz ass"] and gives out Hand Score
    evaluateHand(hand) {
        logger.info("Method evaluateHand called with hand: " + hand);

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

        const {cardTypes, cardValues} = extractCardInfo(hand);

        /**
         * Splits the cards in hand into cardTypes and cardValues Arrays.
         * @param hand
         * @returns {{cardTypes: *[], cardValues: *[]}}
         */
        function extractCardInfo(hand) {
            const cardTypes = [];
            const cardValues = [];
            for (const card of hand) {
                const [type, value] = card.split(' ');
                cardValues.push(valueRanking[value]);
                cardTypes.push(cardRanking[type]);
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
        function countValuesSorted(cardValues) {
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
        function countTypeSorted(cardTypes) {
            const countMap = {};

            for (const type of cardTypes) {
                countMap[type] = (countMap[type] || 0) + 1;
            }

            return Object.values(countMap).sort((a, b) => b - a);
        }

        /**
         * Section checks the hand combinations
         * @returns {boolean}
         */

        const pairFunktion = () => countValuesSorted(cardValues).includes(2);
        logger.info("PairFunkton result: " + pairFunktion());

        const twoPair = () => countValuesSorted(cardValues)[0] === 2 && countValuesSorted(cardValues)[1] === 2;
        logger.info("TwoPair result: " + twoPair());

        const threeOfAKind = () => countValuesSorted(cardValues)[0] === 3;
        logger.info("ThreeOfAKind result: " + threeOfAKind());

        const fourOfAKind = () => countValuesSorted(cardValues)[0] === 4;
        logger.info("FourOfAKind result: " + fourOfAKind());

        const flush = () => countTypeSorted(cardTypes)[0] === 5;
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

        const highCard = () => countValuesSorted(cardValues)[0] === 1 && (!flush() && !straight());
        logger.info("HighCard result: " + highCard());

        // }
        //
        // const straightFlush = () => {}
        //
        // const royalFlush = () => {}

        /**
         * Section calculates the hand rank through switch case.
         * @returns {number}
         */
        function getHandRank() {
            let handRank;
            switch (true) {
                //order of cases is important, switching Pair before Full House leads to wrong result
                case fullHouse():
                    handRank = 60000;
                    break;
                // case straightFlush():
                //     handRank = 80000;
                //     break;
                // case royalFlush():
                //     handRank = 90000;
                //     break;
                //
                case highCard():
                    handRank = 0;
                    break;
                case twoPair():
                    handRank = 20000;
                    break;
                case pairFunktion():
                    handRank = 10000;
                    break;
                case threeOfAKind():
                    handRank = 30000;
                    break;
                case straight():
                    handRank = 40000;
                    break;
                case flush():
                    handRank = 50000;
                    break;
                case fourOfAKind():
                    handRank = 70000;
                    break;
                default:
                    handRank = null;
                    break;
            }
            return handRank;

        }

        /**
         * Evaluates hand besids spesific hand rank.
         * @returns {null}
         */
        //To be implemented
        function getHandMicroScore() {
            return null
        }

        return getHandRank();

    }
}

module.exports = Game;