const Game = require('../class/game.js');

function testEvaluateHand() {
    // Creating a new Game instance
    const game = new Game('test-jwt');
    
    //Testcases saved in const array
    const testCases = [
        {
            name: "Pair Test",
            hand: ["herz 2", "herz 3", "herz 4", "herz 4", "herz 6"],
            expectedRank: 10000
        },
    ];

    // Tests scores
    let passedTests = 0;
    let failedTests = 0;

    // Looping through all testcases
    testCases.forEach(test => {
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

    //End summary
    console.log(`\nTest-Zusammenfassung:`);
    console.log(`Bestanden: ${passedTests}`);
    console.log(`Fehlgeschlagen: ${failedTests}`);
    console.log(`Gesamt: ${testCases.length}`);
}

//Starting Test Class through construction
testEvaluateHand();