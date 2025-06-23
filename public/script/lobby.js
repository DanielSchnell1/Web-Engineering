document.getElementById('code').value = sessionStorage.getItem('lobby');


ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "lobby" && Array.isArray(data.users)) {
      const userListElement = document.getElementById("userList");
      
      userListElement.innerHTML = "";

      data.users.forEach((username) => {
        const li = document.createElement("li");
        li.textContent = username;
        userListElement.appendChild(li);
      });

    }
});
ws.addEventListener('open', () => {
  ws.send(JSON.stringify({ type: 'getLobbyState', token: token }));
});
start = document.getElementById("start");

start.addEventListener('click', () => {
  ws.send(JSON.stringify({ type: 'startGame', token: token }));
});
