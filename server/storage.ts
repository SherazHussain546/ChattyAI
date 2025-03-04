import { ChatMessage, InsertChatMessage, UserPreferences, InsertUserPreferences } from "@shared/schema";

export interface IStorage {
  getMessages(): Promise<ChatMessage[]>;
  addMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getPreferences(): Promise<UserPreferences>;
  updatePreferences(prefs: InsertUserPreferences): Promise<UserPreferences>;
}

export class MemStorage implements IStorage {
  private messages: ChatMessage[];
  private preferences: UserPreferences;
  private currentMessageId: number;
  private currentPrefsId: number;

  constructor() {
    this.messages = [];
    this.currentMessageId = 1;
    this.currentPrefsId = 1;
    this.preferences = {
      id: this.currentPrefsId,
      voiceEnabled: 1,
      avatarEnabled: 1
    };
  }

  async getMessages(): Promise<ChatMessage[]> {
    return this.messages;
  }

  async addMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const newMessage: ChatMessage = {
      id: this.currentMessageId++,
      content: message.content,
      role: message.role,
      timestamp: new Date()
    };
    this.messages.push(newMessage);
    return newMessage;
  }

  async getPreferences(): Promise<UserPreferences> {
    return this.preferences;
  }

  async updatePreferences(prefs: InsertUserPreferences): Promise<UserPreferences> {
    this.preferences = {
      ...this.preferences,
      ...prefs
    };
    return this.preferences;
  }
}

export const storage = new MemStorage();
