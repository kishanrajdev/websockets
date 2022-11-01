import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import fs from 'fs';

const cert = fs.readFileSync('./kishanrajdev.cer');
const server = createServer();
const wss = new WebSocketServer({ noServer: true });

function authenticate(req, cb) {
    const queryParams = getParams(req);
    try {
      const payload = jwt.verify(queryParams.token, cert);
      if (payload.exp * 1000 < Date.now()) {
        throw new Error('token expired');
      }
      return cb(null, req.client);
    } catch(e) {
      cb(e);
    }
}

const getParams = function (req) {
  let q = req.url.split('?'), result={};
  if (q.length>=2) {
    q[1].split('&').forEach(item=> {
      try {
        result[item.split('=')[0]]=item.split('=')[1];
      } catch (e) {
        result[item.split('=')[0]]='';
      }
    })
  }
  return result;
}

wss.on('connection', function connection(ws, request, client) {
  ws.on('message', function message(data) {
    console.log(`Received message ${data} from user ${client}`);
  });
});

// wss.on('close', function close() {
//   console.log('disconnected');
// });

server.on('upgrade', function upgrade(request, socket, head) {
  // This function is not defined on purpose. Implement it with your own logic.
  authenticate(request, function next(err, client) {
    if (err || !client) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request, client);
    });
  });
});

server.listen(8080);
