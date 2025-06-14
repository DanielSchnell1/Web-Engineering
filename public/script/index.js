    document.getElementById("submit").addEventListener("click", function () {
        const name = document.getElementById('user').value;
        const lobby = document.getElementById('lobby').value;
        ws.send(JSON.stringify({
            type: 'init',
            token: sessionStorage.getItem('jwt') || null,
            name: name,
            lobby: lobby
        }));
    });