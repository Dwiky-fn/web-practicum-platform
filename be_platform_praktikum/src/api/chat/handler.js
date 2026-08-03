const { broadcastChatMessage } = require('./ws');

class ChatHandler {
  constructor(chatService) {
    this._chatService = chatService;

    this.postConversationHandler = this.postConversationHandler.bind(this);
    this.getLecturerConversationsHandler = this.getLecturerConversationsHandler.bind(this);
    this.getMessagesHandler = this.getMessagesHandler.bind(this);
    this.postMessageHandler = this.postMessageHandler.bind(this);
    this.patchReadHandler = this.patchReadHandler.bind(this);
    this.getUnreadCountHandler = this.getUnreadCountHandler.bind(this);
  }

  async postConversationHandler(req, res, next) {
    try {
      const { studentId, lecturerId, kelasPraktikumId, jobsheetId } = req.body;
      const conversation = await this._chatService.getOrCreateConversation({
        studentId,
        lecturerId,
        kelasPraktikumId,
        jobsheetId,
        requestingUser: req.user,
      });

      res.status(201).json({
        status: 'success',
        data: { conversation },
      });
    } catch (error) {
      next(error);
    }
  }

  async getLecturerConversationsHandler(req, res, next) {
    try {
      const { kelasPraktikumId, jobsheetId } = req.query;
      const conversations = await this._chatService.getLecturerConversations({
        lecturerId: req.user.id,
        kelasPraktikumId,
        jobsheetId,
      });

      res.json({
        status: 'success',
        data: { conversations },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMessagesHandler(req, res, next) {
    try {
      const { id: conversationId } = req.params;
      const { limit, before } = req.query;
      const messages = await this._chatService.getMessages({
        conversationId,
        userId: req.user.id,
        limit: limit ? parseInt(limit, 10) : 50,
        before,
      });

      res.json({
        status: 'success',
        data: { messages },
      });
    } catch (error) {
      next(error);
    }
  }

  async postMessageHandler(req, res, next) {
    try {
      const { id: conversationId } = req.params;
      const { message, clientMessageId } = req.body;
      const chatMessage = await this._chatService.sendMessage({
        conversationId,
        senderId: req.user.id,
        message,
        clientMessageId,
      });

      broadcastChatMessage(conversationId, chatMessage);

      res.status(201).json({
        status: 'success',
        data: { message: chatMessage },
      });
    } catch (error) {
      next(error);
    }
  }

  async patchReadHandler(req, res, next) {
    try {
      const { id: conversationId } = req.params;
      const result = await this._chatService.markAsRead({
        conversationId,
        userId: req.user.id,
      });

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCountHandler(req, res, next) {
    try {
      const { kelasPraktikumId, jobsheetId } = req.query;
      const unreadData = await this._chatService.getUnreadCounts({
        userId: req.user.id,
        role: req.user.role,
        kelasPraktikumId,
        jobsheetId,
      });

      res.json({
        status: 'success',
        data: unreadData,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ChatHandler;
