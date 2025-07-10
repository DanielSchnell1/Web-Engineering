document.getElementById('code').value = sessionStorage.getItem('lobby');


ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "lobby" && Array.isArray(data.users)) {
      const userListElement = document.getElementById("userList");
      if(data.host) {
        document.getElementById("start").style.display = 'flex';
      }
      userListElement.innerHTML = "";

      data.users.forEach((username) => {
        const li = document.createElement("li");
        li.textContent = username;
        userListElement.appendChild(li);
      });

    }
});
ws.addEventListener('open', () => {
  ws.send(JSON.stringify({ type: 'getLobbyState', id: id }));
});
start = document.getElementById("start");

start.addEventListener('click', () => {
  ws.send(JSON.stringify({ type: 'startGame', id: id }));
});
