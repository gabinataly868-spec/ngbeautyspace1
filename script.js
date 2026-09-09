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

const today = new Date();
today.setHours(0, 0, 0, 0);

dateEl.min = today.toISOString().slice(0, 10);

services.forEach(function(service, index) {
  const option = document.createElement("option");

  option.value = index;
  option.textContent =
    service[0] + " — R$ " +
    service[1].toFixed(2).replace(".", ",");

  serviceEl.appendChild(option);
});

function money(value) {
  return "R$ " + Number(value).toFixed(2).replace(".", ",");
}
function dayAllowed(date) {
  const day = new Date(date + "T12:00:00").getDay();
  return day >= 1 && day <= 6;
}

function makeSlots(duration, blocked) {
  const slots = [];

  const start = Number(CONFIG.OPENING_HOUR) * 60;
  const end = Number(CONFIG.CLOSING_HOUR) * 60;
  const interval = Number(CONFIG.SLOT_MINUTES);

  for (
    let minutes = start;
    minutes + duration <= end;
    minutes += interval
  ) {
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mm = String(minutes % 60).padStart(2, "0");

    const value = hh + ":" + mm;

    if (!blocked.includes(value)) {
      slots.push(value);
    }
  }

  return slots;
}

async function callAppsScript(action, params) {
  if (
    typeof CONFIG === "undefined" ||
    !CONFIG.APPS_SCRIPT_URL
  ) {
    throw new Error("Google Agenda não configurada.");
  }

  let url;

  try {
    url = new URL(CONFIG.APPS_SCRIPT_URL);
  } catch (error) {
    throw new Error("A URL do Google Apps Script está incorreta.");
  }

  url.searchParams.set("action", action);

  Object.keys(params || {}).forEach(function(key) {
    url.searchParams.set(key, params[key]);
  });

  url.searchParams.set("_", Date.now().toString());

  let response;

  try {
    response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      redirect: "follow"
    });
  } catch (error) {
    console.error(error);
    throw new Error("Não foi possível conectar ao Google Agenda.");
  }

  if (!response.ok) {
    throw new Error("Erro HTTP " + response.status + ".");
  }

  let data;

  try {
    data = await response.json();
  } catch (error) {
    throw new Error(
      "O Google Apps Script não retornou uma resposta válida."
    );
  }

  return data;
}

async function loadAvailability() {
  timeEl.innerHTML = "";
  timeEl.disabled = true;

  if (!dateEl.value || serviceEl.value === "") {
    timeEl.innerHTML =
      '<option value="">Escolha serviço e data</option>';
    return;
  }

  if (!dayAllowed(dateEl.value)) {
    timeEl.innerHTML =
      '<option value="">Fechado aos domingos</option>';
    return;
  }

  const service = services[Number(serviceEl.value)];

  if (!service) {
    timeEl.innerHTML =
      '<option value="">Escolha um serviço</option>';
    return;
  }

  const duration = service[2];
  let blocked = [];

  if (
    typeof CONFIG !== "undefined" &&
    CONFIG.APPS_SCRIPT_URL
  ) {
    try {
      timeEl.innerHTML =
        '<option value="">Carregando horários...</option>';

      const data = await callAppsScript("availability", {
        date: dateEl.value
      });

      blocked = Array.isArray(data.blocked)
        ? data.blocked
        : [];

    } catch (error) {
      console.error("Erro ao buscar horários:", error);

      timeEl.innerHTML =
        '<option value="">Erro ao carregar horários</option>';

      timeEl.disabled = true;
      return;
    }

  } else {
    const key = "demo-" + dateEl.value;

    try {
      blocked = JSON.parse(
        localStorage.getItem(key) || "[]"
      );
    } catch (error) {
      blocked = [];
    }
  }

  const slots = makeSlots(duration, blocked);

  timeEl.innerHTML = "";

  if (!slots.length) {
    timeEl.innerHTML =
      '<option value="">Sem horários disponíveis</option>';

    timeEl.disabled = true;
    return;
  }

  const first = document.createElement("option");

  first.value = "";
  first.textContent = "Selecione um horário";

  timeEl.appendChild(first);

  slots.forEach(function(time) {
    const option = document.createElement("option");

    option.value = time;
    option.textContent = time;

    timeEl.appendChild(option);
  });

  timeEl.disabled = false;
}

serviceEl.addEventListener("change", loadAvailability);
dateEl.addEventListener("change", loadAvailability);

const whatsapp = document.querySelector("#whatsapp");

if (
  whatsapp &&
  typeof CONFIG !== "undefined" &&
  CONFIG.WHATSAPP
) {
  whatsapp.href =
    "https://wa.me/" +
    CONFIG.WHATSAPP +
    "?text=" +
    encodeURIComponent(
      "Olá! Gostaria de agendar um horário."
    );
}

form.addEventListener("submit", async function(event) {
  event.preventDefault();

  const service = services[Number(serviceEl.value)];
  const date = dateEl.value;
  const time = timeEl.value;

  const name = document
    .querySelector("#name")
    .value
    .trim();

  const phone = document
    .querySelector("#phone")
    .value
    .trim();

  if (!service) {
    alert("Selecione um procedimento.");
    return;
  }

  if (!date) {
    alert("Selecione uma data.");
    return;
  }

  if (!time) {
    alert("Selecione um horário.");
    return;
  }

  if (!name) {
    alert("Digite seu nome.");
    return;
  }

  if (!phone) {
    alert("Digite seu WhatsApp.");
    return;
  }

  const pretty = new Date(
    date + "T12:00:00"
  ).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  const msg =
    "Olá! Quero agendar:%0A%0A" +
    "Procedimento: " + service[0] + "%0A" +
    "Valor: " + money(service[1]) + "%0A" +
    "Data: " + pretty + "%0A" +
    "Horário: " + time + "%0A" +
    "Nome: " + name + "%0A" +
    "WhatsApp: " + phone;

  try {
    if (
      typeof CONFIG !== "undefined" &&
      CONFIG.APPS_SCRIPT_URL
    ) {
      const data = await callAppsScript("book", {
        date: date,
        time: time,
        service: service[0],
        name: name,
        phone: phone
      });

      console.log("Resposta:", data);

      if (!data || data.ok !== true) {
        throw new Error(
          data && data.error
            ? data.error
            : "Esse horário já foi reservado."
        );
      }

    } else {
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

    result.classList.remove("hidden");

    result.innerHTML =
      "<h3>Horário solicitado ♡</h3>" +
      "<p>" +
      "<b>" + service[0] + "</b><br>" +
      pretty + "<br>" +
      "às <b>" + time + "</b><br><br>" +
      "Em breve, confirme pelo WhatsApp." +
      "</p>" +
      '<a class="btn primary" target="_blank" rel="noopener" href="https://wa.me/' +
      CONFIG.WHATSAPP +
      "?text=" +
      msg +
      '">' +
      "Confirmar no WhatsApp" +
      "</a>";

    form.reset();

    timeEl.innerHTML =
      '<option value="">Escolha a data</option>';

    timeEl.disabled = true;

    result.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

  } catch (error) {
    console.error("Erro ao reservar:", error);

    result.classList.remove("hidden");

    result.innerHTML =
      "<b>Não foi possível reservar.</b><br>" +
      error.message +
      "<br>" +
      "<small>Escolha outro horário ou tente novamente.</small>";
  }
});
