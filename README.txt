# Agenda de Cílios & Sobrancelhas

Site pronto com:
- tabela de serviços e preços fornecidos;
- atendimento de segunda a sábado;
- calendário e horários;
- botão de WhatsApp: 31 99214-8272;
- integração opcional com Google Agenda via Google Apps Script;
- modo demonstração enquanto a integração não estiver configurada.

## Ativar Google Agenda

1. Entre em `script.google.com`.
2. Crie um projeto novo.
3. Cole o conteúdo de `google-apps-script.gs`.
4. Se quiser uma agenda específica, coloque o ID dela em `CALENDAR_ID`; se deixar vazio, usa a agenda principal.
5. Implantar > Nova implantação > Aplicativo da Web.
6. Executar como: você.
7. Acesso: qualquer pessoa.
8. Copie a URL que termina em `/exec`.
9. Abra `config.js` e troque:
   `APPS_SCRIPT_URL: ""`
   pela URL do seu Web App.
10. Publique os arquivos do site em uma hospedagem estática (Vercel, Netlify, GitHub Pages etc.).

### Observação
Os tempos dos procedimentos foram colocados como estimativas para permitir o funcionamento da agenda. Eles podem ser alterados no início de `script.js` e no `durationMap` do Apps Script.

## Personalização
O número do WhatsApp já está configurado. O nome do estúdio pode ser colocado no título/cabeçalho do `index.html`.
