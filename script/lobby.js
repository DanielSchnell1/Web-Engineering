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
      document.getElementById('code').value = data.code;
    }
});
ws.addEventListener('open', () => {
  ws.send(JSON.stringify({ type: 'getLobbyState', token }));
});

