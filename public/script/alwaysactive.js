let ws = new WebSocket(`ws://${location.host}`);
let token = sessionStorage.getItem('jwt');
let lobby = sessionStorage.getItem('lobby');

ws.onopen = () => {
    if(!token)
    {
        ws.send(JSON.stringify({
            type: 'getToken'
        }));
    } else {
        ws.send(JSON.stringify({
            type: 'ws',
            token: token
        }));
    }
};
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'token') {
        sessionStorage.setItem('jwt', data.token);
    }
    else if (data.type === 'error') {
        alert(data.message);
    }
    else if(data.type === 'redirect')
    {
        window.location.href = data.path;
    } 
    else if(data.type === 'replace') {
        window.location.replace(data.path); 
    }
    else if(data.type === 'getLobby'){
        sessionStorage.setItem('lobby', data.lobby);
    }
};