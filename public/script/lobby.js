document.getElementById('code').value = sessionStorage.getItem('lobby');


ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "lobby" && Array.isArray(data.users)) {
      const userListElement = document.getElementById("userList");
      const startButton = document.getElementById("start");
      if(data.host) {
        startButton.style.display = 'flex';
        startButton.disabled = data.users.length < 2;
      }
      userListElement.innerHTML = "";

      data.users.forEach((username, index) => {
        const li = document.createElement("li");
        li.textContent = username;
        if (data.host && index > 0) {
          const kickButton = document.createElement("button");
          kickButton.textContent = "Kick";
          kickButton.id = index;
          li.appendChild(kickButton);
        }
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


console.log("start");

document.getElementById('start').addEventListener('click', () => {
  console.log("start");
})

