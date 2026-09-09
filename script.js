```javascript
const services = [
  ["Design de sobrancelha simples", 25, 30],
  ["Design de sobrancelha com henna", 35, 45],
  ["Design de sobrancelha com tintura", 40, 45],
  ["Brow lamination + Design", 100, 75],
  ["Brow lamination + Design + Henna", 110, 90],
  ["Brow Lamination + Design + Tintura", 130, 90],
  ["Alongamento Cílios Volume Brasileiro", 65, 120],
  ["Alongamento Cílios Volume Egípcio", 65, 120],
  ["Manutenção (até 21 dias pós aplicação)", 40, 75],
  ["Lash Lifting", 100, 75],
  ["Lash Lifting + Tintura", 120, 90],
  ["Remoção", 30, 30]
];

const serviceEl = document.querySelector("#service");
const dateEl = document.querySelector("#date");
const timeEl = document.querySelector("#time");
const form = document.querySelector("#bookingForm");
const result = document.querySelector("#result");

// ===============================
// DATA MÍNIMA
// ===============================

const today = new Date();
today.setHours(0, 0, 0, 0);

dateEl.min = today.toISOString().slice(0, 10);

// ===============================
// SERVIÇOS
// ===============================

services.forEach((service, index) => {
  const option = document.createElement("option");

  option.value = index;
  option.textContent =
    `${service[0]} — R$ ${service[1].toFixed(2).replace(".", ",")}`;

  serviceEl.appendChild(option);
});

// ===============================
// FUNÇÕES AUXILIARES
// ===============================

function money(value) {
  return `R$ ${Number(value).toFixed(2).replace(".", ",")}`;
}

function dayAllowed(date) {
  const day = new Date(date + "T12:00:00").getDay();

  // Segunda = 1
  // ...
  // Sábado = 6
  // Domingo = 0

  return day >= 1 && day <= 6;
}

function makeSlots(duration, blocked = []) {
  const slots = [];

  const start = Number(CONFIG.OPENING_HOUR) * 60;
  const end = Number(CONFIG.CLOSING_HOUR) * 60;
  const interval = Number(CONFIG.SLOT_MINUTES);

  for (
    let minutes = start;
    minutes + duration <= end;
    minutes += interval
  ) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mins = String(minutes % 60).padStart(2, "0");

    const value = `${hours}:${mins}`;

    if (!blocked.includes(value)) {
      slots.push(value);
    }
  }

  return slots;
}

// ===============================
// VERIFICA CONFIGURAÇÃO
// ===============================

function getAppsScriptUrl() {
  if (
    typeof CONFIG === "undefined" ||
    !CONFIG.APPS_SCRIPT_URL ||
    typeof CONFIG.APPS_SCRIPT_URL !== "string"
  ) {
    return null;
  }

  return CONFIG.APPS_SCRIPT_URL.trim();
}

// ===============================
// COMUNICAÇÃO COM GOOGLE APPS SCRIPT
// ===============================

async function callAppsScript(params) {
  const appsScriptUrl = getAppsScriptUrl();

  if (!appsScriptUrl) {
    throw new Error(
      "A conexão com a agenda não está configurada."
    );
  }

  let url;

  try {
    url = new URL(appsScriptUrl);
  } catch (error) {
    throw new Error(
      "A URL do Google Apps Script está inválida."
    );
  }

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  // Evita cache do navegador
  url.searchParams.set("_", Date.now().toString());

  let response;

  try {
    response = await fetch(url.toString(), {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      redirect: "follow"
    });
  } catch (error) {
    console.error("Erro de conexão:", error);

    throw new Error(
      "Não foi possível conectar à agenda. Verifique se o Google Apps Script está publicado como Web App."
    );
  }

  if (!response.ok) {
    throw new Error(
      `O Google Apps Script respondeu com erro HTTP ${response.status}.`
    );
  }

  let data;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Resposta recebida:", await response.text());

    throw new Error(
      "A resposta do Google Apps Script não está em formato JSON."
    );
  }

  return data;
}

// ===============================
// CARREGAR HORÁRIOS
// ===============================

async function loadAvailability() {
  timeEl.innerHTML = "";
  timeEl.disabled = true;

  if (!dateEl.value || serviceEl.value === "") {
    timeEl.innerHTML =
      "<option value=''>Escolha serviço e data</option>";

    return;
  }

  if (!dayAllowed(dateEl.value)) {
    timeEl.innerHTML =
      "<option value=''>Fechado aos domingos</option>";

    return;
  }

  const service = services[Number(serviceEl.value)];

  if (!service) {
    timeEl.innerHTML =
      "<option value=''>Escolha um serviço</option>";

    return;
  }

  const duration = service[2];

  let blocked = [];

  const appsScriptUrl = getAppsScriptUrl();

  // ===============================
  // GOOGLE AGENDA
  // ===============================

  if (appsScriptUrl) {
    try {
      timeEl.innerHTML =
        "<option value=''>Carregando horários...</option>";

      const data = await callAppsScript({
        action: "availability",
        date: dateEl.value
      });

      if (!data || typeof data !== "object") {
        throw new Error("Resposta inválida da agenda.");
      }

      if (Array.isArray(data.blocked)) {
        blocked = data.blocked;
      } else {
        blocked = [];
      }

    } catch (error) {
      console.error("Erro ao carregar disponibilidade:", error);

      timeEl.innerHTML =
        "<option value=''>Erro ao carregar horários</option>";

      timeEl.disabled = true;

      result.classList.remove("hidden");

      result.innerHTML = `
        <b>Não foi possível carregar a agenda.</b>
        <br>
        <small>${error.message}</small>
      `;

      return;
    }

  } else {
    // ===============================
    // MODO LOCAL / TESTE
    // ===============================

    const key = "demo-" + dateEl.value;

    try {
      blocked = JSON.parse(
        localStorage.getItem(key) || "[]"
      );
    } catch (error) {
      blocked = [];
    }
  }

  // ===============================
  // GERAR HORÁRIOS
  // ===============================

  const slots = makeSlots(duration, blocked);

  timeEl.innerHTML = "";

  if (!slots.length) {
    timeEl.innerHTML =
      "<option value=''>Sem horários disponíveis</option>";

    timeEl.disabled = true;

    return;
  }

  const defaultOption = document.createElement("option");

  defaultOption.value = "";
  defaultOption.textContent = "Selecione um horário";

  timeEl.appendChild(defaultOption);

  slots.forEach(time => {
    const option = document.createElement("option");

    option.value = time;
    option.textContent = time;

    timeEl.appendChild(option);
  });

  timeEl.disabled = false;
}

// ===============================
// EVENTOS
// ===============================

serviceEl.addEventListener("change", loadAvailability);
dateEl.addEventListener("change", loadAvailability);

// ===============================
// WHATSAPP
// ===============================

if (
  typeof CONFIG !== "undefined" &&
  CONFIG.WHATSAPP
) {
  const whatsappEl = document.querySelector("#whatsapp");

  if (whatsappEl) {
    whatsappEl.href =
      `https://wa.me/${CONFIG.WHATSAPP}` +
      `?text=${encodeURIComponent(
        "Olá! Gostaria de agendar um horário."
      )}`;
  }
}

// ===============================
// ENVIO DO AGENDAMENTO
// ===============================

form.addEventListener("submit", async event => {
  event.preventDefault();

  const serviceIndex = Number(serviceEl.value);
  const service = services[serviceIndex];

  const date = dateEl.value;
  const time = timeEl.value;

  const nameEl = document.querySelector("#name");
  const phoneEl = document.querySelector("#phone");

  const name = nameEl.value.trim();
  const phone = phoneEl.value.trim();

  // ===============================
  // VALIDAÇÃO
  // ===============================

  if (!service) {
    alert("Escolha um procedimento.");
    return;
  }

  if (!date) {
    alert("Escolha uma data.");
    return;
  }

  if (!time) {
    alert("Escolha um horário.");
    return;
  }

  if (!name) {
    alert("Digite seu nome.");
    nameEl.focus();
    return;
  }

  if (!phone) {
    alert("Digite seu WhatsApp.");
    phoneEl.focus();
    return;
  }

  if (!dayAllowed(date)) {
    alert("Os atendimentos são de segunda a sábado.");
    return;
  }

  // ===============================
  // DATA BONITA
  // ===============================

  const prettyDate = new Date(
    date + "T12:00:00"
  ).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  // ===============================
  // MENSAGEM WHATSAPP
  // ===============================

  const whatsappMessage =
    `Olá! Quero agendar:%0A%0A` +
    `Procedimento: ${service[0]}%0A` +
    `Valor: ${money(service[1])}%0A` +
    `Data: ${prettyDate}%0A` +
    `Horário: ${time}%0A` +
    `Nome: ${name}%0A` +
    `WhatsApp: ${phone}`;

  // ===============================
  // BOTÃO DURANTE O ENVIO
  // ===============================

  const submitButton =
    form.querySelector(
      'button[type="submit"], input[type="submit"]'
    );

  const originalButtonText =
    submitButton?.textContent;

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Agendando...";
  }

  result.classList.remove("hidden");

  result.innerHTML = `
    <p>Verificando disponibilidade...</p>
  `;

  // ===============================
  // RESERVA
  // ===============================

  try {
    const appsScriptUrl = getAppsScriptUrl();

    if (appsScriptUrl) {
      const data = await callAppsScript({
        action: "book",
        date: date,
        time: time,
        service: service[0],
        name: name,
        phone: phone
      });

      console.log("Resposta da reserva:", data);

      if (!data || data.ok !== true) {
        throw new Error(
          data?.error ||
          "Esse horário não está mais disponível."
        );
      }

    } else {
      // ===============================
      // MODO TESTE LOCAL
      // ===============================

      const key = "demo-" + date;

      let blocked = [];

      try {
        blocked = JSON.parse(
          localStorage.getItem(key) || "[]"
        );
      } catch (error) {
        blocked = [];
      }

      if (blocked.includes(time)) {
        throw new Error(
          "Esse horário já foi reservado."
        );
      }

      blocked.push(time);

      localStorage.setItem(
        key,
        JSON.stringify(blocked)
      );
    }

    // ===============================
    // SUCESSO
    // ===============================

    result.innerHTML = `
      <h3>Horário solicitado ♡</h3>

      <p>
        <b>${service[0]}</b>
        <br>
        ${prettyDate}
        <br>
        às <b>${time}</b>
        <br><br>
        Em breve, confirme pelo WhatsApp.
      </p>

      <a
        class="btn primary"
        target="_blank"
        rel="noopener noreferrer"
        href="https://wa.me/${CONFIG.WHATSAPP}?text=${whatsappMessage}"
      >
        Confirmar no WhatsApp
      </a>
    `;

    form.reset();

    timeEl.innerHTML =
      "<option value=''>Escolha serviço e data</option>";

    timeEl.disabled = true;

    result.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

  } catch (error) {

    console.error(
      "Erro ao realizar reserva:",
      error
    );

    result.innerHTML = `
      <h3>Não foi possível reservar.</h3>

      <p>
        ${error.message}
      </p>

      <small>
        Verifique a conexão com a agenda ou escolha outro horário.
      </small>
    `;

    result.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

  } finally {

    if (submitButton) {
      submitButton.disabled = false;

      if (originalButtonText) {
        submitButton.textContent =
          originalButtonText;
      }
    }
  }
});
```
