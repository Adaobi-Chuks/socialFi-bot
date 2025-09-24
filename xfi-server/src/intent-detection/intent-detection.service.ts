import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class IntentDetectionService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async aiIntentDetector(message: string) {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'defi_intent_schema',
            schema: {
              type: 'object',
              properties: {
                intent: {
                  type: 'string',
                  enum: [
                    'SEND_TOKEN',
                    'TIP_TOKEN',
                    'BUY_TOKEN',
                    'SELL_TOKEN',
                    'CHECK_BALANCE',
                    'UNKNOWN',
                  ],
                },
                details: {
                  type: 'object',
                  properties: {
                    amount: { type: ['number', 'null'] },
                    amountType: {
                      type: ['string', 'null'],
                      enum: ['USD', 'TOKEN', null],
                    },
                    token: { type: ['string', 'null'] },
                    receiver: { type: ['string', 'null'] },
                    buy: {
                      type: 'object',
                      properties: {
                        tokenToBuy: { type: ['string', 'null'] },
                        amountToSpend: { type: ['number', 'null'] },
                        amountType: {
                          type: ['string', 'null'],
                          enum: ['USD', 'TOKEN', null],
                        },
                        spendToken: { type: ['string', 'null'] },
                      },
                      required: ['tokenToBuy'],
                    },
                    sell: {
                      type: 'object',
                      properties: {
                        tokenToSell: { type: ['string', 'null'] },
                        sellPercentage: { type: ['number', 'null'] },
                      },
                      required: ['tokenToSell'],
                    },
                  },
                  required: [],
                },
              },
              required: ['intent', 'details'],
            },
          },
        },
        messages: [
          {
            role: 'system',
            content: `
              You are a DeFi intent and entity extractor for the Sei network.

              Normalization rules:
              - "$50", "50$", "USD 50", "50 USD" → amount = 50, amountType = USD
              - "50 SEI", "50 $SEI" → amount = 50, amountType = TOKEN, token = SEI
              - Always treat "$" before or after the number as USD.

              Intent rules:
              - SEND / TIP → SEND_TOKEN or TIP_TOKEN
              - BUY → BUY_TOKEN
              - SELL → SELL_TOKEN
              - BALANCE → CHECK_BALANCE
              - Otherwise → UNKNOWN

              Entity rules:
              - receiver can be Twitter (@...), ENS (....eth), or wallet (0x...)
              - buy: extract tokenToBuy, amountToSpend, amountType (USD/TOKEN), spendToken
              - sell: extract tokenToSell and sellPercentage if given
            `,
          },
          { role: 'user', content: message },
        ],
        temperature: 0,
      });

      return JSON.parse(response.choices[0].message?.content ?? '{}');
    } catch (error) {
      console.error('Agent error:', error);
      return { intent: 'UNKNOWN', details: {} };
    }
  }
}
