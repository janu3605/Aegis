// AI Service - Handles AI chatbot interactions using Google Gemini

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_CONFIG } from '../utils/constants';
import type { ChatMessage } from '../types';

export class AIService {
  private static instance: AIService;
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private chatSession: any = null;

  private constructor() {
    this.initialize();
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Initialize Gemini AI
   */
  private initialize() {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      
      if (!apiKey) {
        console.warn('Gemini API key not found. AI features will be disabled.');
        return;
      }

      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: AI_CONFIG.MODEL,
      });

      console.log('AI Service initialized successfully');
    } catch (error) {
      console.error('Error initializing AI Service:', error);
    }
  }

  /**
   * Start a new chat session
   */
  startChatSession(history: ChatMessage[] = []): void {
    if (!this.model) {
      console.error('AI model not initialized');
      return;
    }

    try {
      // Convert chat history to Gemini format
      const formattedHistory = history.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      this.chatSession = this.model.startChat({
        history: formattedHistory,
        generationConfig: {
          temperature: AI_CONFIG.TEMPERATURE,
          maxOutputTokens: AI_CONFIG.MAX_TOKENS,
        },
        systemInstruction: AI_CONFIG.SYSTEM_PROMPT,
      });
    } catch (error) {
      console.error('Error starting chat session:', error);
    }
  }

  /**
   * Send a message to the AI
   */
  async sendMessage(message: string): Promise<string | null> {
    if (!this.chatSession) {
      console.error('Chat session not started');
      return null;
    }

    try {
      const result = await this.chatSession.sendMessage(message);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error sending message to AI:', error);
      return null;
    }
  }

  /**
   * Detect urgency level in user message
   */
  detectUrgency(message: string): 'low' | 'medium' | 'high' | 'critical' {
    const lowerMessage = message.toLowerCase();

    // Critical urgency keywords
    const criticalKeywords = ['attack', 'attacking', 'rape', 'kidnap', 'gun', 'knife', 'weapon'];
    if (criticalKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      return 'critical';
    }

    // High urgency keywords
    const highUrgencyCount = AI_CONFIG.URGENCY_KEYWORDS.filter((keyword) =>
      lowerMessage.includes(keyword)
    ).length;

    if (highUrgencyCount >= 2) return 'critical';
    if (highUrgencyCount === 1) return 'high';

    // Medium urgency indicators
    const mediumKeywords = ['worried', 'concerned', 'uncomfortable', 'following', 'suspicious'];
    if (mediumKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Get safety advice based on situation
   */
  async getSafetyAdvice(situation: string): Promise<string | null> {
    try {
      if (!this.model) {
        return null;
      }

      const prompt = `A person is in this situation: "${situation}". Provide immediate, practical safety advice in 3-5 bullet points. Be concise and action-oriented.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error getting safety advice:', error);
      return null;
    }
  }

  /**
   * Get legal rights information
   */
  async getLegalRights(country: string = 'India'): Promise<string | null> {
    try {
      if (!this.model) {
        return null;
      }

      const prompt = `Summarize key women's safety rights and laws in ${country} in 5-6 bullet points. Include emergency numbers and relevant acts/laws.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error getting legal rights:', error);
      return null;
    }
  }

  /**
   * Get self-defense tips
   */
  async getSelfDefenseTips(): Promise<string | null> {
    try {
      if (!this.model) {
        return null;
      }

      const prompt = `Provide 5 essential self-defense tips for women in dangerous situations. Be specific and practical.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error getting self-defense tips:', error);
      return null;
    }
  }

  /**
   * Analyze safety of a location description
   */
  async analyzeLocationSafety(description: string): Promise<{
    safetyLevel: 'safe' | 'caution' | 'unsafe';
    advice: string;
  } | null> {
    try {
      if (!this.model) {
        return null;
      }

      const prompt = `Analyze this location description for safety: "${description}". 
      Respond in JSON format with:
      {
        "safetyLevel": "safe" | "caution" | "unsafe",
        "advice": "brief safety advice"
      }`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Try to parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return null;
    } catch (error) {
      console.error('Error analyzing location safety:', error);
      return null;
    }
  }

  /**
   * Generate de-escalation advice
   */
  async getDeEscalationAdvice(situation: string): Promise<string | null> {
    try {
      if (!this.model) {
        return null;
      }

      const prompt = `Someone is in this tense situation: "${situation}". Provide 3-4 de-escalation strategies they can use to safely diffuse the situation.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error getting de-escalation advice:', error);
      return null;
    }
  }

  /**
   * Check if AI is available
   */
  isAvailable(): boolean {
    return this.model !== null;
  }

  /**
   * Reset chat session
   */
  resetChatSession(): void {
    this.chatSession = null;
  }
}

export default AIService.getInstance();
