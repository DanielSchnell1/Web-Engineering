const Game = require('../class/game.js');

function testEvaluateHand() {
    // Creating a new Game instance
    const game = new Game('test-jwt');

    //Testcases saved in const array
    const testCasesEvaluateHand = [
        {
            name: "Pair Test",
            hand: ["kreuz 2", "herz 3", "pik 4", "herz 4", "herz 6"],
            expectedRank: 10000
        },
        {
            name: "Two Pair Test",
            hand: ["herz 2", "herz 4", "karo 4", "herz 6", "karo 6"],
            expectedRank: 20000
        },
        {
            name: "Three of a Kind Test",
            hand: ["herz bube", "herz 4", "herz 6", "pik 6", "herz 6"],
            expectedRank: 30000
        },
        {
            name: "Flush Test",
            hand: ["herz 2", "herz ass", "herz 4", "herz 5", "herz 9"],
            expectedRank: 50000
        },
        {
            name: "Four of a Kind Test",
            hand: ["herz 2", "herz 2", "karo 2", "herz 2", "pik 6"],
            expectedRank: 70000
        },
        {
            name: "Full House Test",
            hand: ["kreuz 2", "herz 2", "pik 2", "herz 3", "karo 3"],
            expectedRank: 60000
        },
        {
            name: "High Card Test",
            hand: ["herz 2", "herz 5", "pik 4", "karo ass", "herz 10"],
            expectedRank: 0
        },
        {
            name: "Straight Test",
            hand: ["herz 2", "herz 3", "pik 4", "herz 5", "herz 6"],
            expectedRank: 40000
        },
        {
            name: "Spetial Straight Test: Wheel",
            hand: ["karo 2", "herz 3", "pik 4", "pik 5", "herz ass"],
            expectedRank: 40000
        },
        {
            name: "Straight Flush Test",
            hand: ["herz 10", "herz 9", "herz 8", "herz 7", "herz 6"],
            expectedRank: 80000
        },
        {
            name: "Royal Flush Test",
            hand: ["herz 10", "herz bube", "herz dame", "herz koenig", "herz ass"],
            expectedRank: 90000
        }
    ];

    const testCasesBreakTie = [
        {
            name: "Test higher Pair",
            hand: ['herz 10', 'pik 10', 'kreuz 10', 'karo 3', 'pik 2'],
            expectedRank: 1010100302
        },
    ];

    // Tests scores
    let passedTests = 0;
    let failedTests = 0;

    //Looping through all testcases
    testCasesEvaluateHand.forEach(test => {
        try {
            const rank = game.evaluateHand(test.hand);
            // Suche nach dem ersten true-Wert im handRank-Array
            // const rank = result;

            if (rank == test.expectedRank) {
                console.log(`✅ ${test.name} bestanden`);
                passedTests++;
            } else {
                console.log(`❌ ${test.name} fehlgeschlagen`);
                console.log(`   Erwartet: ${test.expectedRank}, Erhalten: ${rank}`);
                failedTests++;
            }
        } catch (error) {
            console.log(`❌❌ ${test.name} fehlgeschlagen mit Fehler:`);
            console.log(` ${error.name}  ${error.message} ${error.stack}`);
            failedTests++;
        }
    });

    testCasesBreakTie.forEach(test => {
        try {
            const rank = game.getTieBreakerScore(test.hand);
            // Suche nach dem ersten true-Wert im handRank-Array
            // const rank = result;

            if (rank == test.expectedRank) {
                console.log(`✅ ${test.name} bestanden`);
                passedTests++;
            } else {
                console.log(`❌ ${test.name} fehlgeschlagen`);
                console.log(`   Erwartet: ${test.expectedRank}, Erhalten: ${rank}`);
                failedTests++;
            }
        } catch (error) {
            console.log(`❌❌ ${test.name} fehlgeschlagen mit Fehler:`);
            console.log(` ${error.name}  ${error.message} ${error.stack}`);
            failedTests++;
        }
    });


    //End summary
    console.log(`\nTest-Zusammenfassung:`);
    console.log(`Bestanden: ${passedTests}`);
    console.log(`Fehlgeschlagen: ${failedTests}`);
    console.log(`Gesamt: ${testCasesEvaluateHand.length}`);
}

//Starting Test Class through construction
testEvaluateHand();