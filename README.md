# Webscoket for notifications

## Design
```
                     Websocket server 1
                   /                    \
                  /                      \
Client - Nginx --                          Message Broker(Redis)
                  \                      /
                   \                    /
                     Websocker server 2
```

### Authentication
Authenticate a user during handshake i.e when a user sends the upgrade request