document.addEventListener("DOMContentLoaded", () => {
	const form = document.querySelector("#loginForm, form");
	const email = document.querySelector("#email, input[type='email'], input[name='email']");
	const password = document.querySelector("#password, input[type='password'], input[name='password']");
	const remember = document.querySelector("#remember, input[type='checkbox'][name='remember']");
	const toggle = document.querySelector("#togglePassword, [data-toggle-password], .toggle-password");
	const message = document.querySelector("#message, .message, [role='alert']");
	const submitButton = form?.querySelector("button[type='submit'], input[type='submit']");


	if (!form || !email || !password) return;

	const showMessage = (text, type = "error") => {
		if (!message) return;
		message.textContent = text;
		message.className = `message ${type}`;
		message.hidden = !text;
	};

	const setError = (field, text) => {
		field.setCustomValidity(text);
		field.setAttribute("aria-invalid", text ? "true" : "false");
	};

	const validate = () => {
		setError(email, email.validity.valid ? "" : "Enter a valid email address.");
		setError(password, password.value.length >= 6 ? "" : "Password must contain at least 6 characters.");
		return form.checkValidity();
	};

	const savedEmail = localStorage.getItem("loginEmail");
	if (savedEmail) {
		email.value = savedEmail;
		if (remember) remember.checked = true;
	}

	toggle?.addEventListener("click", () => {
		const visible = password.type === "text";
		password.type = visible ? "password" : "text";
		toggle.setAttribute("aria-label", visible ? "Show password" : "Hide password");
		toggle.textContent = visible ? "Show" : "Hide";
	});

	email.addEventListener("input", validate);
	password.addEventListener("input", validate);

	// form.addEventListener("submit", (event) => {
	// 	event.preventDefault();
	// 	if (!validate()) {
	// 		form.reportValidity();
	// 		return;
	// 	}

	// 	if (remember?.checked) localStorage.setItem("loginEmail", email.value.trim());
	// 	else localStorage.removeItem("loginEmail");

	// 	submitButton?.setAttribute("disabled", "true");
	// 	showMessage("Login successful.", "success");

	// 	// Replace this with your backend request, for example:
	// 	// fetch("/api/login", { method: "POST", body: new FormData(form) });
	// });
});

const socket = io();
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatStream = document.getElementById("chatStream");

// Read current authenticated user email provided via data-attribute
const currentUser = document.body.dataset.userEmail;

if (chatForm) {
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    // Send payload to the server
    socket.emit("chatMessage", {
      user: currentUser,
      text: text
    });

    chatInput.value = "";
  });
}

// Receive payload from the server and render bubble
socket.on("message", (payload) => {
  const isMe = payload.user === currentUser;
  const row = document.createElement("div");
  row.className = `msg-row ${isMe ? "sent" : "received"}`;

  row.innerHTML = `
    <span class="msg-sender">${isMe ? "You" : payload.user}</span>
    <div class="msg-text">${payload.text}</div>
  `;

  chatStream.appendChild(row);
  chatStream.scrollTop = chatStream.scrollHeight;
});