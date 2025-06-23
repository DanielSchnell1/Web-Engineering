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

const copyBtn = document.getElementById("copyBtn");
copyBtn?.addEventListener("click", () => {
  const input = document.getElementById("code");
  navigator.clipboard.writeText(input.value).then(() => {
    copyBtn.innerHTML = <span class="iconify" data-icon="mdi:check" style="font-size: 20px;"></span>;
    setTimeout(() => {
      copyBtn.innerHTML = <span class="iconify" data-icon="mdi:content-copy" style="font-size: 20px;"></span>;
    }, 1000);
  });
});