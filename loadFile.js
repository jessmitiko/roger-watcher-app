const express = require('express');
const path = require('path');
const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');

const files = ['delay-1s-2.txt']; // Name of the files to be read

app.use(express.static(path.join(__dirname, '/src')));

app.get('/', (_, res) => {
  res.sendFile(__dirname + '/src/panel.html');
});

io.on('connection', socket => {
  files.forEach(file => {
    printFirebaseLogs(`files/${file}`);
    printGALogs(`files/${file}`);
  });
});

http.listen(3000, () => {
  console.log('listening on port 3000.');
});

function printFirebaseLogs(file) {
  fs.readFile(file, 'utf-8', (err, data) => {
      if(err) throw err; 
      const raw = data.match(/^.*(FA ).*$/gim);  
      if(raw == null) return;
      const hits = raw
      .filter((txt) => txt.match('Logging event'))
      .map((txt) => {
        const [, bundle] = txt.match(/Bundle(.*)/);
        const data = bundle.replace(/(\[\{|\}\])|\(\_.*?\)/g, "");
        const res = { ...parse(data) };

        if(!res.ga_event_name) res['ga_event_name'] = getEventName(txt);
        return res;
      });
    hits.forEach((data) => {
      // only catch those hits generated by GTM
      if(data.ga_event_origin && data.ga_event_origin.includes('gtm')) io.emit('hit sent', { data: data, tool: 'firebase_analytics' });
    });
  });
}

function printGALogs(file) {
  fs.readFile(file, 'utf-8', (err, data) => {
      if(err) throw err; 
      const raw = data.match(/^.*(GAv4-SVC).*$/gim);
      if(raw == null) return;
      const hits = raw
          .filter((txt) => txt.indexOf('Hit delivery requested: ') >= 0)
          .map((txt) => {
            return txt
              .split('Hit delivery requested: ')
              .pop()
              .split(', ')
              .reduce((acc, cur) => {
                const [key, value] = cur.split('=');
                acc[key] = value;
                return acc;
              }, {});
          });
        hits.forEach((hit) => {
          io.emit('hit sent', { data: hit, tool: 'google_analytics' });
        });
  });
}

function getEventName(txt) {
    const [ raw ] = txt.match(/Logging event.*(Bundle|,params=Bundle)/);
    const data = raw.replace(/Logging event.*:/, '').replace(/,params=Bundle|Bundle/, '');
  
    return (data.includes('=')) ? parse(data).name : data.replace(/ |,/g, '');
  }
  
function parse(txt) {
  return txt.split(', ').reduce((acc, next) => {
    // val está dando indefinido por causa do parametro content_list dos eventos de appsflyer (arrumar depois)
    const [key, val] = next.split('=');
    acc[key] = (val != undefined) ? val.replace(/^'|'$/g, '') : null;
    return acc;
  }, {});
}
