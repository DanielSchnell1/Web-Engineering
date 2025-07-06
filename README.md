# Web Engineering Poker Spiel

Dies ist ein Echtzeit-Multiplayer-Pokerspiel, das im Rahmen eines Web-Engineering-Kurses entwickelt wurde. Es verwendet Node.js, Express und WebSockets, um ein Live-Spielerlebnis zu schaffen.

## Beschreibung

Das Projekt implementiert einen Server, der die Spiellogik, Spieler-Verbindungen und das Lobby-Management übernimmt. Clients können sich über einen Webbrowser verbinden, Lobbys beitreten und in Echtzeit gegeneinander Poker spielen.

## Funktionen

- **Echtzeit-Multiplayer:** Nutzt WebSockets für die sofortige Kommunikation zwischen Clients und dem Server.
- **Lobby-System:** Spieler können neue Lobbys erstellen oder bestehenden über einen einzigartigen 6-stelligen Code beitreten.
- **Dynamischer Spielzustand:** Der Spielzustand wird auf dem Server verwaltet und über alle Spieler in einer Lobby synchronisiert.
- **Express Server:** Stellt die statischen Frontend-Dateien (HTML, CSS, JavaScript) bereit.

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
