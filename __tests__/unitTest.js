const Game = require('../class/game.js');

/**
 * @file Test suite for the Game class.
 * @author Gemini
 */

/**
 * Test suite for the updateCurrentPlayer method.
 */
describe('Game updateCurrentPlayer', () => {
    let game;

    /**
     * Sets up a new game instance before each test.
     */
    beforeEach(() => {
        game = new Game('id-test-1', 'Player 1');
        game.addPlayer('id-test-2', 'Player 2');
    });

    /**
     * Tests if the player turn advances correctly without changing the round.
     */
    test('should advance to the next player in the same round', () => {
        game.players[0].bet = 10;
        game.players[1].bet = 5;
        game.currentPlayer = 0;
        game.currentRound = 0;

        game.updateCurrentPlayer();

        expect(game.currentPlayer).toBe(1);
        expect(game.currentRound).toBe(0);
    });

    /**
     * Tests if the round advances when all players have matching bets.
     */
    test('should advance to the next round when all players have bet the same', () => {
        game.players[0].bet = 10;
        game.players[1].bet = 10;
        game.currentPlayer = 1;
        game.currentRound = 0;
        game.betNoRepeat = false;

        game.updateCurrentPlayer();

        expect(game.currentRound).toBe(1);
        expect(game.currentPlayer).toBe(0);
    });

    /**
     * Tests if the game correctly identifies the end condition.
     */
    test('should return "gameEnd" when the round advances to 3', () => {
        game.currentRound = 2;
        game.players[0].bet = 10;
        game.players[1].bet = 10;
        game.currentPlayer = 1;
        game.betNoRepeat = false;

        const result = game.updateCurrentPlayer();

        expect(result).toBe('gameEnd');
    });

    /**
     * Tests if the player turn loops back to the first player.
     */
    test('should loop back to the first player after the last player', () => {
        game.currentPlayer = 1;
        game.players[0].bet = 10;
        game.players[1].bet = 5;

        game.updateCurrentPlayer();

        expect(game.currentPlayer).toBe(0);
    });
});

/**
 * Test suite for the evaluateHand method.
 */
describe('Game evaluateHand', () => {
    let game;

    /**
     * Sets up a new game instance before each test.
     */
    beforeEach(() => {
        game = new Game('id-test-1', 'Player 1');
    });

    const testCases = [
        { name: "Royal Flush", hand: ["herz 10", "herz bube", "herz dame", "herz koenig", "herz ass"], expectedRank: 90000 },
        { name: "Straight Flush", hand: ["herz 10", "herz 9", "herz 8", "herz 7", "herz 6"], expectedRank: 80000 },
        { name: "Four of a Kind", hand: ["herz 2", "karo 2", "pik 2", "kreuz 2", "pik 6"], expectedRank: 70000 },
        { name: "Full House", hand: ["kreuz 2", "herz 2", "pik 2", "herz 3", "karo 3"], expectedRank: 60000 },
        { name: "Flush", hand: ["herz 2", "herz ass", "herz 4", "herz 5", "herz 9"], expectedRank: 50000 },
        { name: "Straight", hand: ["herz 2", "karo 3", "pik 4", "kreuz 5", "herz 6"], expectedRank: 40000 },
        { name: "Straight (Wheel)", hand: ["karo 2", "herz 3", "pik 4", "kreuz 5", "herz ass"], expectedRank: 40000 },
        { name: "Three of a Kind", hand: ["herz bube", "karo 4", "kreuz 6", "pik 6", "herz 6"], expectedRank: 30000 },
        { name: "Two Pair", hand: ["herz 2", "karo 4", "pik 4", "kreuz 6", "herz 6"], expectedRank: 20000 },
        { name: "Pair", hand: ["kreuz 2", "herz 3", "pik 4", "karo 4", "herz 6"], expectedRank: 10000 },
        { name: "High Card", hand: ["herz 2", "karo 5", "pik 4", "kreuz ass", "herz 10"], expectedRank: 0 }
    ];

    testCases.forEach(testCase => {
        /**
         * Tests if a ${tc.name} is evaluated correctly.
         */
        test(`should correctly evaluate a ${testCase.name}`, () => {
            const rank = game.evaluateHand(testCase.hand);
            expect(rank).toBe(testCase.expectedRank);
        });
    });
});

/**
 * Test suite for the getTieBreakerScore method.
 */
describe('Game getTieBreakerScore', () => {
    let game;

    /**
     * Sets up a new game instance before each test.
     */
    beforeEach(() => {
        game = new Game('id-test-1', 'Player 1');
    });

    /**
     * Tests if the tie-breaker score is calculated correctly for a hand.
     */
    test('should return the correct tie-breaker score', () => {
        const hand = ['herz 10', 'pik 10', 'kreuz 10', 'karo 3', 'pik 2'];
        const expectedScore = 1010100302;
        const score = game.getTieBreakerScore(hand);
        expect(score).toBe(expectedScore);
    });
});

/**
 * Test suite for getter methods.
 */
describe('Game Getter Methods', () => {
    let game;

    /**
     * Sets up a new game instance with predefined player states before each test.
     */
    beforeEach(() => {
        game = new Game('id-test-1', 'Player 1');
        game.addPlayer('id-test-2', 'Player 2');
        game.players[0].bet = 15;
        game.players[1].bet = 20;
        game.currentPlayer = 1;
    });

    /**
     * Tests for getCurrentPot.
     */
    describe('getCurrentPot', () => {
        /**
         * Tests if the total pot is calculated correctly.
         */
        test('should return the correct pot total', () => {
            expect(game.getCurrentPot()).toBe(35);
        });
    });

    /**
     * Tests for getCurrentBet.
     */
    describe('getCurrentBet', () => {
        /**
         * Tests if the highest bet among players is returned.
         */
        test('should return the highest bet', () => {
            expect(game.getCurrentBet()).toBe(20);
        });
    });

    /**
     * Tests for getCurrentPlayer.
     */
    describe('getCurrentPlayer', () => {
        /**
         * Tests if the name of the current player is returned correctly.
         */
        test('should return the name of the current player', () => {
            expect(game.getCurrentPlayer()).toBe('Player 2');
        });
    });
});
