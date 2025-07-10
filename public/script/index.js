    document.getElementById("submit").addEventListener("click", function () {
        const name = document.getElementById('user').value;
        const lobby = document.getElementById('lobby').value;
        if(lobby){
            sessionStorage.setItem('lobby', lobby);
        }
        ws.send(JSON.stringify({
            type: 'init',
            id: sessionStorage.getItem('id') || null,
            name: name,
            lobby: lobby
        }));
    });

    ws.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'lobbyFull') {
            alert('Die Lobby ist voll. Sie können nicht beitreten.');
        }
    });