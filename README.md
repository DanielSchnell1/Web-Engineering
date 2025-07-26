# Web Engineering Poker Spiel

Dies ist ein Echtzeit-Multiplayer-Pokerspiel, das im Rahmen eines Web-Engineering-Kurses entwickelt wurde. Es verwendet Node.js, Express und WebSockets, um ein Live-Spielerlebnis zu schaffen.

## Beschreibung

Das Projekt implementiert einen Server, der die Spiellogik, Spieler-Verbindungen und das Lobby-Management übernimmt. Clients können sich über einen Webbrowser verbinden, Lobbys beitreten und in Echtzeit gegeneinander Poker spielen.

## Funktionen

- **Echtzeit-Multiplayer:** Nutzt WebSockets für die sofortige Kommunikation zwischen Clients und dem Server.
- **Lobby-System:** Spieler können neue Lobbys erstellen oder bestehenden über einen einzigartigen 6-stelligen Code beitreten. Der Host der Lobby hat die Berechtigung, andere Spieler zu entfernen.
- **Dynamischer Spielzustand:** Der Spielzustand wird auf dem Server verwaltet und über alle Spieler in einer Lobby synchronisiert.
- **Express Server:** Stellt die statischen Frontend-Dateien (HTML, CSS, JavaScript) bereit.

## Spielanleitung (5-Card Draw Poker)

Dieses Spiel verwendet die Regeln von **5-Card Draw Poker**. Das Ziel ist es, am Ende die beste Fünf-Karten-Hand zu haben.

### Spielablauf

Das Spiel verläuft in mehreren Runden:

1.  **Erste Setzrunde:**
    *   Jeder Spieler erhält fünf verdeckte Karten.
    *   Eine Setzrunde beginnt. Du hast die Möglichkeit zu **checken** (wenn noch niemand gesetzt hat), zu **betten** (einen neuen Einsatz zu bringen), zu **callen** (mit dem aktuellen Einsatz mitzugehen), zu **raisen** (den Einsatz zu erhöhen) oder zu **folden** (deine Hand aufzugeben).

2.  **Tauschrunde (Draw):**
    *   Nach der ersten Setzrunde können die verbleibenden Spieler eine beliebige Anzahl ihrer Karten ablegen und gegen neue vom Stapel tauschen.
    *   Ziel ist es, die eigene Hand zu verbessern.

3.  **Zweite Setzrunde:**
    *   Eine letzte Setzrunde findet statt.

4.  **Showdown:**
    *   Wenn nach der letzten Setzrunde noch mehr als ein Spieler im Spiel ist, kommt es zum Showdown.
    *   Alle verbleibenden Spieler decken ihre Karten auf. Der Spieler mit der besten Hand gewinnt den Pot.

### Hand-Rangfolge

Die Hände werden in der folgenden Reihenfolge bewertet (von der besten zur schlechtesten):

1.  **Royal Flush**: A, K, Q, J, 10 in derselben Farbe.
2.  **Straight Flush**: Fünf aufeinanderfolgende Karten derselben Farbe.
3.  **Vierling (Four of a Kind)**: Vier Karten des gleichen Wertes.
4.  **Full House**: Ein Drilling und ein Paar.
5.  **Flush**: Fünf Karten derselben Farbe, nicht in Reihenfolge.
6.  **Straße (Straight)**: Fünf aufeinanderfolgende Karten unterschiedlicher Farben.
7.  **Drilling (Three of a Kind)**: Drei Karten des gleichen Wertes.
8.  **Zwei Paare (Two Pair)**: Zwei verschiedene Paare.
9.  **Ein Paar (One Pair)**: Zwei Karten des gleichen Wertes.
10. **Höchste Karte (High Card)**: Wenn niemand eine der oben genannten Hände hat, gewinnt der Spieler mit der höchsten Einzelkarte.

## Technologie-Stack

- **Backend:** Node.js, Express.js, WebSocket (`ws`)
- **Testing:** Jest
- **Abhängigkeiten:** `dotenv`, `uuid`, `winston`

## Projektstruktur

```
.
├── class/
│   └── game.js           # Klasse für die Kernspiellogik
├── logger/
│   └── logger.js         # Winston-Logger-Konfiguration
├── public/
│   ├── css/              # CSS-Stylesheets
│   ├── html/             # HTML-Dateien für verschiedene Ansichten (Index, Lobby, Spiel)
│   └── script/           # Frontend-JavaScript-Dateien
├── __tests__/
│   └── unitTest.js       # Jest-Unit-Tests
├── .env                  # Umgebungsvariablen (z.B. PORT)
├── package.json          # Projekt-Metadaten und Abhängigkeiten
├── server.js             # Haupt-Einstiegspunkt des Servers (Express- und WebSocket-Setup)
└── ToDo.md               # Liste der zu implementierenden Funktionen und Aufgaben
```

## Installation

Befolgen Sie diese Schritte, um das Projekt lokal einzurichten.

### Voraussetzungen

- [Node.js](https://nodejs.org/) (v14 oder höher empfohlen)
- [npm](https://www.npmjs.com/) (wird normalerweise mit Node.js installiert)

### Schritte

1.  **Repository klonen:**
    ```sh
    git clone https://github.com/DanielSchnell1/Web-Engineering.git
    ```
2.  **In das Projektverzeichnis navigieren:**
    ```sh
    cd Web-Engineering
    ```
3.  **Abhängigkeiten installieren:**
    ```sh
    npm install
    ```

## Verwendung

Um die Anwendung zu starten, führen Sie den folgenden Befehl im Projektstammverzeichnis aus:

```sh
npm start
```

Der Server wird gestartet, und Sie können auf das Spiel zugreifen, indem Sie Ihren Webbrowser öffnen und zu folgender Adresse navigieren:

[http://localhost:3000](http://localhost:3000)

## Tests ausführen

Um die Test-Suite auszuführen und einen Coverage-Bericht zu erstellen, führen Sie folgenden Befehl aus:

```sh
npm test
```

Dieser Befehl führt alle im `__tests__`-Verzeichnis definierten Tests mit Jest aus.

## Lizenz

Dieses Projekt ist unter der **ISC-Lizenz** lizenziert.
