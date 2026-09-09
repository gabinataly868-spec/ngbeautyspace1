const services = [
  ["Design de sobrancelha simples",25,30],
  ["Design de sobrancelha com henna",35,45],
  ["Design de sobrancelha com tintura",40,45],
  ["Brow lamination + Design",100,75],
  ["Brow lamination + Design + Henna",110,90],
  ["Brow Lamination + Design + Tintura",130,90],
  ["Alongamento Cílios Volume Brasileiro",65,120],
  ["Alongamento Cílios Volume Egípcio",65,120],
  ["Manutenção (até 21 dias pós aplicação)",40,75],
  ["Lash Lifting",100,75],
  ["Lash Lifting + Tintura",120,90],
  ["Remoção",30,30]
];

const serviceEl=document.querySelector("#service"), dateEl=document.querySelector("#date"), timeEl=document.querySelector("#time");
const form=document.querySelector("#bookingForm"), result=document.querySelector("#result");
const today=new Date(); today.setHours(0,0,0,0);
dateEl.min = today.toISOString().slice(0,10);

services.forEach((s,i)=>{ const o=document.createElement("option"); o.value=i; o.textContent=`${s[0]} — R$ ${s[1].toFixed(2).replace(".",",")}`; serviceEl.appendChild(o); });

function money(v){return `R$ ${v.toFixed(2).replace(".",",")}`}
function dayAllowed(date){ const d=new Date(date+"T12:00:00").getDay(); return d>=1 && d<=6; }
function makeSlots(duration, blocked=[]){
  const slots=[]; const start=CONFIG.OPENING_HOUR*60, end=CONFIG.CLOSING_HOUR*60;
  for(let m=start;m+duration<=end;m+=CONFIG.SLOT_MINUTES){
    const hh=String(Math.floor(m/60)).padStart(2,"0"), mm=String(m%60).padStart(2,"0");
    const value=`${hh}:${mm}`;
    if(!blocked.includes(value)) slots.push(value);
  }
  return slots;
}
async function loadAvailability(){
  timeEl.innerHTML=""; timeEl.disabled=true;
  if(!dateEl.value || !serviceEl.value) { timeEl.innerHTML="<option>Escolha serviço e data</option>"; return; }
  if(!dayAllowed(dateEl.value)){timeEl.innerHTML="<option>Fechado aos domingos</option>"; return;}
  const duration=services[serviceEl.value][2];
  let blocked=[];
  if(CONFIG.APPS_SCRIPT_URL){
    try{
      const u=new URL(CONFIG.APPS_SCRIPT_URL);
      u.searchParams.set("action","availability"); u.searchParams.set("date",dateEl.value);
      const r=await fetch(u); const data=await r.json(); blocked=data.blocked||[];
    }catch(e){ console.warn(e); }
  } else {
    const key="demo-"+dateEl.value;
    blocked=JSON.parse(localStorage.getItem(key)||"[]");
  }
  const slots=makeSlots(duration,blocked);
  timeEl.innerHTML=slots.length?'<option value="">Selecione um horário</option>':"<option>Sem horários disponíveis</option>";
  slots.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;timeEl.appendChild(o)});
  timeEl.disabled=!slots.length;
}
serviceEl.addEventListener("change",loadAvailability); dateEl.addEventListener("change",loadAvailability);

document.querySelector("#whatsapp").href=`https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent("Olá! Gostaria de agendar um horário.")}`;

form.addEventListener("submit",async e=>{
  e.preventDefault();
  const s=services[serviceEl.value], data=dateEl.value, time=timeEl.value;
  const name=document.querySelector("#name").value.trim(), phone=document.querySelector("#phone").value.trim();
  if(!s||!data||!time||!name||!phone)return;
  const pretty=new Date(data+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"});
  const msg=`Olá! Quero agendar:%0A%0AProcedimento: ${s[0]}%0AData: ${pretty}%0AHorário: ${time}%0ANome: ${name}%0AWhatsApp: ${phone}`;
  try{
    if(CONFIG.APPS_SCRIPT_URL){
      const u=new URL(CONFIG.APPS_SCRIPT_URL);
      u.searchParams.set("action","book"); u.searchParams.set("date",data); u.searchParams.set("time",time);
      u.searchParams.set("service",s[0]); u.searchParams.set("name",name); u.searchParams.set("phone",phone);
      const r=await fetch(u); const out=await r.json();
      if(!out.ok) throw new Error(out.error||"Horário indisponível");
    } else {
      const key="demo-"+data, blocked=JSON.parse(localStorage.getItem(key)||"[]");
      blocked.push(time); localStorage.setItem(key,JSON.stringify(blocked));
    }
    result.classList.remove("hidden");
    result.innerHTML=`<h3>Horário solicitado ♡</h3><p><b>${s[0]}</b><br>${pretty} às <b>${time}</b><br>Em breve, confirme pelo WhatsApp.</p><a class="btn primary" target="_blank" href="https://wa.me/${CONFIG.WHATSAPP}?text=${msg}">Confirmar no WhatsApp</a>`;
    form.reset(); timeEl.innerHTML="<option>Escolha serviço e data</option>"; timeEl.disabled=true;
    result.scrollIntoView({behavior:"smooth",block:"center"});
  }catch(err){
    result.classList.remove("hidden"); result.innerHTML=`<b>Não foi possível reservar.</b><br>${err.message}<br><small>Escolha outro horário.</small>`;
  }
});
