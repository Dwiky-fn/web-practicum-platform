const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/services/postgres');
const ChatService = require('../src/services/postgres/chat/ChatService');

describe('ChatService Backend Tests', () => {
  const chatService = new ChatService(pool);

  test('sendMessage rejects empty or whitespace-only messages', async () => {
    await assert.rejects(
      async () => {
        await chatService.sendMessage({
          conversationId: 'conv-test-fake',
          senderId: 'user-test-fake',
          message: '   ',
        });
      },
      (err) => {
        return err.name === 'InvariantError' && err.message.includes('kosong');
      }
    );
  });

  test('sendMessage rejects message longer than 2000 characters', async () => {
    const longMsg = 'a'.repeat(2001);
    await assert.rejects(
      async () => {
        await chatService.sendMessage({
          conversationId: 'conv-test-fake',
          senderId: 'user-test-fake',
          message: longMsg,
        });
      },
      (err) => {
        return err.name === 'InvariantError' && err.message.includes('2000');
      }
    );
  });

  test('verifyStudentAccess throws AuthorizationError if student not in class', async () => {
    await assert.rejects(
      async () => {
        await chatService.verifyStudentAccess('non-existent-student', 'non-existent-class');
      },
      (err) => {
        return err.name === 'AuthorizationError';
      }
    );
  });

  test('verifyLecturerAccess throws AuthorizationError if lecturer does not teach class', async () => {
    await assert.rejects(
      async () => {
        await chatService.verifyLecturerAccess('non-existent-lecturer', 'non-existent-class');
      },
      (err) => {
        return err.name === 'AuthorizationError';
      }
    );
  });
});
