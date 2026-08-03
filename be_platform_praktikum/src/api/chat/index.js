const ChatHandler = require('./handler');
const routes = require('./routes');

module.exports = (app, { chatService }) => {
  const handler = new ChatHandler(chatService);
  app.use('/chat', routes(handler));
};
