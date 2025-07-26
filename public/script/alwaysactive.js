let ws = new WebSocket(`ws://${location.host}`);
let id = sessionStorage.getItem('id');
let lobby = sessionStorage.getItem('lobby');

ws.onopen = () => {
    if (!id) {
        ws.send(JSON.stringify({
            type: 'getId'
        }));
    } else {
        ws.send(JSON.stringify({
            type: 'ws',
            id: id
        }));
    }
};
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'id') {
        sessionStorage.setItem('id', data.id);
    } else if (data.type === 'error') {
        alert(data.message);
    } else if (data.type === 'redirect') {
        window.location.href = data.path;
    } else if (data.type === 'replace') {
        window.location.replace(data.path);
    } else if (data.type === 'getLobby') {
        sessionStorage.setItem('lobby', data.lobby);
    }
};