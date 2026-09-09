/*
 GOOGLE AGENDA — BACKEND (Google Apps Script)

 COMO USAR:
 1. Crie uma agenda separada no Google Agenda, se quiser.
 2. Acesse script.google.com e crie um projeto.
 3. Cole este código.
 4. Em "Implantar" > "Nova implantação" > "Aplicativo da Web":
    - Executar como: você
    - Quem tem acesso: Qualquer pessoa
 5. Copie a URL /exec e coloque em config.js no campo APPS_SCRIPT_URL.

 O script usa a agenda principal da conta que fizer a implantação.
 */

const CALENDAR_ID = ""; // deixe vazio para usar sua agenda principal
const TZ = Session.getScriptTimeZone() || "America/Sao_Paulo";

function getCalendar_(){
  return CALENDAR_ID ? CalendarApp.getCalendarById(CALENDAR_ID) : CalendarApp.getDefaultCalendar();
}
function json_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function doGet(e){
  const p=e.parameter||{}, action=p.action||"availability";
  try{
    if(action==="availability"){
      const date=p.date;
      if(!date) return json_({blocked:[]});
      const cal=getCalendar_();
      const start=new Date(date+"T00:00:00");
      const end=new Date(date+"T23:59:59");
      const events=cal.getEvents(start,end);
      const blocked=[];
      events.forEach(ev=>{
        const s=ev.getStartTime(), en=ev.getEndTime();
        let m=s.getHours()*60+s.getMinutes();
        const finish=en.getHours()*60+en.getMinutes();
        while(m<finish){
          blocked.push(("0"+Math.floor(m/60)).slice(-2)+":"+("0"+(m%60)).slice(-2));
          m+=30;
        }
      });
      return json_({blocked:[...new Set(blocked)]});
    }
    if(action==="book"){
      const date=p.date, time=p.time, service=p.service, name=p.name, phone=p.phone;
      if(!date||!time||!service||!name||!phone) return json_({ok:false,error:"Dados incompletos."});
      const durationMap={
        "Design de sobrancelha simples":30,
        "Design de sobrancelha com henna":45,
        "Design de sobrancelha com tintura":45,
        "Brow lamination + Design":75,
        "Brow lamination + Design + Henna":90,
        "Brow Lamination + Design + Tintura":90,
        "Alongamento Cílios Volume Brasileiro":120,
        "Alongamento Cílios Volume Egípcio":120,
        "Manutenção (até 21 dias pós aplicação)":75,
        "Lash Lifting":75,
        "Lash Lifting + Tintura":90,
        "Remoção":30
      };
      const duration=durationMap[service]||60;
      const start=new Date(date+"T"+time+":00");
      const end=new Date(start.getTime()+duration*60000);
      const cal=getCalendar_();
      if(cal.getEvents(start,end).length) return json_({ok:false,error:"Esse horário acabou de ser ocupado."});
      const title="Agendamento — "+service+" — "+name;
      cal.createEvent(title,start,end,{description:"Cliente: "+name+"\nWhatsApp: "+phone+"\nServiço: "+service});
      return json_({ok:true});
    }
    return json_({error:"Ação inválida."});
  }catch(err){ return json_({ok:false,error:String(err)}); }
}
