import type { ClientSession } from '../../src/core/types.js';

/**
 * Creates a mock WASocket with jest spies for common operations.
 */
export function createMockSocket() {
  return {
    user: { id: '1234567890@s.whatsapp.net', name: 'Test User' },
    sendMessage: jest.fn().mockResolvedValue({ key: { id: 'mock-msg-id' } }),
    logout: jest.fn().mockResolvedValue(undefined),
    ev: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    groupCreate: jest.fn(),
    groupMetadata: jest.fn(),
    groupUpdateSubject: jest.fn(),
    groupUpdateDescription: jest.fn(),
    groupParticipantsUpdate: jest.fn(),
    groupInviteCode: jest.fn(),
    groupRevokeInvite: jest.fn(),
    profilePictureUrl: jest.fn(),
    onWhatsApp: jest.fn(),
    fetchStatus: jest.fn(),
    presenceSubscribe: jest.fn(),
    sendPresenceUpdate: jest.fn(),
    chatModify: jest.fn(),
    readMessages: jest.fn(),
  };
}

/**
 * Creates a mock ClientSession with an optional mock socket.
 */
export function createMockSession(id: string, options?: { ready?: boolean }): ClientSession {
  const isReady = options?.ready ?? true;
  return {
    id,
    sock: isReady ? createMockSocket() as any : null,
    isInitialized: isReady,
    isReady,
    qrData: null,
    disconnected: !isReady,
    phone: isReady ? '1234567890' : null,
    name: isReady ? 'Test User' : null,
  };
}
