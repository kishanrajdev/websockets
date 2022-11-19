import { createServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { createClient } from 'redis';

const connectionMap = new Map();

const redisClient = createClient({url: `redis://redis:6379`});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

await redisClient.connect();

redisClient.subscribe('channel', (message) => {
  // send the notification message to connected client
  // message format '{"email":"name@email.com", "message":"new notification"}'
  try {
    const msg = JSON.parse(message);
    if (connectionMap.has(msg.email)) {
      const clientConnection = connectionMap.get(msg.email);
      if (clientConnection.readyState === WebSocket.OPEN) { // send message if the client connection is open
        clientConnection.send('You have a notification - ' + msg.message);
      }
    }
  } catch (e) {
    console.log(e);
  }
});

const server = createServer((req, res)=> {
  res.setHeader('Set-Cookie', ['foo=bar']);
  res.end(JSON.stringify({ host: process.env.HOSTNAME}));
});

const wss = new WebSocketServer({ noServer: true });

function authenticate(req, cb) {
    return cb(null, req.client);
    // try {
    //   const payload = jwt.verify(queryParams.token, cert);
    //   if (payload.exp * 1000 < Date.now()) {
    //     throw new Error('token expired');
    //   }
    //   return cb(null, req.client);
    // } catch(e) {
    //   cb(e);
    // }
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
  const queryParams = getParams(request);
  if (queryParams.email) {
    connectionMap.set(queryParams.email, ws);
  }

  ws.send(queryParams.email + ' has connected to - ' + process.env.HOSTNAME);  // first message
  ws.send(JSON.stringify(request.headers)); // for testing - sending request headers

  ws.on('message', function message(data) {
    console.log(`Received message ${data} from user ${client}`);
  });
});

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
