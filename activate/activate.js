const SUPABASE_URL = "https://bvlmhcvvzmyabrggeaef.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ocvpe0ezadoNqTh1L-zdAA_ni1OQUpm";

export function parseAuthResponse(url) {
  const parsed = new URL(url);
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const query = parsed.searchParams;
  return {
    accessToken: hash.get("access_token") || "",
    type: hash.get("type") || query.get("type") || "",
    error: hash.get("error_description") || query.get("error_description") || "",
  };
}

export function passwordRules(password) {
  return {
    length: password.length >= 12 && password.length <= 128,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function validatePassword(password, confirmation) {
  const rules = passwordRules(password);
  if (!Object.values(rules).every(Boolean)) {
    return "A senha ainda não atende a todos os requisitos.";
  }
  if (password !== confirmation) {
    return "As senhas informadas não coincidem.";
  }
  return "";
}

async function authRequest(path, accessToken, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (!response.ok) {
    throw new Error(payload.msg || payload.message || payload.error_description || "Não foi possível validar o convite.");
  }
  return payload;
}

function setStatus(message) {
  const status = document.querySelector("#status");
  status.textContent = message;
  status.classList.toggle("visible", Boolean(message));
}

function updateRequirements(password) {
  const rules = passwordRules(password);
  for (const [rule, valid] of Object.entries(rules)) {
    document.querySelector(`[data-rule="${rule}"]`).classList.toggle("valid", valid);
  }
}

async function initialize() {
  const auth = parseAuthResponse(window.location.href);
  window.history.replaceState({}, "", window.location.pathname);
  if (auth.error) {
    setStatus(auth.error.replace(/\+/g, " "));
    document.querySelector("#account-copy").textContent = "Não foi possível validar este link.";
    return;
  }
  if (!auth.accessToken || !["invite", "recovery"].includes(auth.type)) {
    setStatus("Este link é inválido ou já expirou. Solicite um novo convite ao administrador.");
    document.querySelector("#account-copy").textContent = "Convite não encontrado.";
    return;
  }

  let user;
  try {
    user = await authRequest("/auth/v1/user", auth.accessToken, { method: "GET" });
  } catch {
    setStatus("Este link é inválido ou já expirou. Solicite um novo convite ao administrador.");
    document.querySelector("#account-copy").textContent = "Convite não encontrado.";
    return;
  }

  document.querySelector("#account-copy").textContent = `Defina a senha de acesso para ${user.email}.`;
  const form = document.querySelector("#password-form");
  const password = document.querySelector("#password");
  const confirmation = document.querySelector("#confirmation");
  const submit = document.querySelector("#submit-button");
  form.hidden = false;
  password.focus();

  password.addEventListener("input", () => updateRequirements(password.value));
  for (const button of document.querySelectorAll(".reveal")) {
    button.addEventListener("click", () => {
      const input = document.querySelector(`#${button.dataset.target}`);
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "Ocultar" : "Mostrar";
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const validationError = validatePassword(password.value, confirmation.value);
    if (validationError) {
      setStatus(validationError);
      return;
    }
    setStatus("");
    submit.disabled = true;
    submit.textContent = "Definindo senha...";
    try {
      await authRequest("/auth/v1/user", auth.accessToken, {
        method: "PUT",
        body: JSON.stringify({ password: password.value }),
      });
      await authRequest("/auth/v1/logout?scope=local", auth.accessToken, { method: "POST" }).catch(() => {});
      password.value = "";
      confirmation.value = "";
      form.hidden = true;
      document.querySelector("#account-copy").hidden = true;
      document.querySelector("#success").hidden = false;
    } catch (error) {
      setStatus(error.message || "Não foi possível definir a senha. Solicite um novo convite.");
      submit.disabled = false;
      submit.textContent = "Definir senha";
    }
  });
}

if (typeof document !== "undefined") {
  initialize();
}
