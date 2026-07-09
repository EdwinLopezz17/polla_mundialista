(function () {
  const form = document.getElementById("loginForm");
  const userSelect = document.getElementById("userSelect");
  const pinInput = document.getElementById("pinInput");
  const msgEl = document.getElementById("msg");
  const btnLogin = document.getElementById("btnLogin");

  if (AUTH.getSession()) {
    window.location.href = "apuestas.html";
    return;
  }

  async function loadUsers() {
    try {
      const users = await API.getUsers();
      userSelect.innerHTML = "";
      if (!users.length) {
        userSelect.innerHTML = `<option value="">No hay usuarios registrados</option>`;
        return;
      }
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Selecciona tu usuario";
      userSelect.appendChild(placeholder);

      users.forEach((u) => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.fullName;
        userSelect.appendChild(opt);
      });
    } catch (err) {
      UI.showMessage(msgEl, "No se pudo conectar con el servidor.", "error");
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    UI.clearMessage(msgEl);

    const userId = userSelect.value;
    const pin = pinInput.value.trim();

    if (!userId || !pin) {
      UI.showMessage(msgEl, "Selecciona un usuario e ingresa tu PIN.", "error");
      return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = "Verificando…";

    try {
      await API.login(userId, pin);
      const fullName = userSelect.options[userSelect.selectedIndex].textContent;
      AUTH.setSession({ userId: Number(userId), fullName });
      window.location.href = "apuestas.html";
    } catch (err) {
      UI.showMessage(msgEl, "PIN incorrecto o usuario no encontrado.", "error");
      btnLogin.disabled = false;
      btnLogin.textContent = "Ingresar";
    }
  });

  loadUsers();
})();