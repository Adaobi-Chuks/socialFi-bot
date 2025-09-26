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

  // async aiIntentDetector(message: string) {
  //   try {
  //     const response = await this.client.chat.completions.create({
  //       model: 'gpt-4o-mini',
  //       response_format: {
  //         type: 'json_schema',
  //         json_schema: {
  //           name: 'defi_intent_schema',
  //           schema: {
  //             type: 'object',
  //             properties: {
  //               intent: {
  //                 type: 'string',
  //                 enum: [
  //                   'SEND_TOKEN',
  //                   'TIP_TOKEN',
  //                   'DROP_TOKEN',
  //                   'CHECK_BALANCE',
  //                   'UNKNOWN',
  //                 ],
  //               },
  //               details: {
  //                 type: 'object',
  //                 properties: {
  //                   amount: { type: ['number', 'string', 'null'] },
  //                   amountType: {
  //                     type: ['string', 'null'],
  //                     enum: ['USD', 'TOKEN'],
  //                   },
  //                   token: { type: ['string', 'null'] },
  //                   receiver: { type: ['string', 'null'] },
  //                 },
  //                 required: [],
  //               },
  //               followup: {
  //                 type: ['string', 'null'],
  //                 description:
  //                   'Helpful agent message to clarify intent if UNKNOWN',
  //               },
  //             },
  //             required: ['intent', 'details', 'followup'],
  //           },
  //         },
  //       },
  //       messages: [
  //         {
  //           role: 'system',
  //           content: `
  //           You are a DeFi intent and entity extractor for the Reef network.

  //           Normalization rules:
  //           - "$50", "50$", "USD 50", "50 USD" → amount = 50, amountType = USD
  //           - "50 REEF", "50 $REEF" → amount = 50, amountType = TOKEN, token = REEF
  //           - Always treat "$" before or after the number as USD.

  //           Intent rules:
  //           - "send" → SEND_TOKEN (including "send … as a tip")
  //           - "tip" as the main verb → TIP_TOKEN
  //           - "drop" → DROP_TOKEN
  //           - "balance" → CHECK_BALANCE
  //           - Otherwise → UNKNOWN

  //           Entity rules:
  //           - receiver can be Twitter (@...), ENS (....eth), or wallet (0x...)

  //           Followup rules:
  //           - If intent = UNKNOWN, provide a short helpful followup response
  //             to guide the user. Examples:
  //             - User: "give me something nice"
  //               → intent: UNKNOWN, followup: "Did you mean to send tokens to someone?"
  //             - User: "show me reef prices"
  //               → intent: UNKNOWN, followup: "I can help with token transfers and balances. Do you want to check your balance?"
  //             - User: "hello"
  //               → intent: UNKNOWN, followup: "Hi there 👋 What would you like to do? Send, tip, drop tokens, or check your balance?"
  //         `,
  //         },
  //         { role: 'user', content: message },
  //       ],
  //       temperature: 0,
  //     });

  //     return JSON.parse(response.choices[0].message?.content ?? '{}');
  //   } catch (error) {
  //     console.error('Agent error:', error);
  //     return {
  //       intent: 'UNKNOWN',
  //       details: {},
  //       followup:
  //         'Sorry, I could not understand that. Do you want to send, tip, drop tokens, or check your balance?',
  //     };
  //   }
  // }

  // async aiIntentDetector(message: string) {
  //   try {
  //     const response = await this.client.chat.completions.create({
  //       model: 'gpt-4o-mini',
  //       response_format: {
  //         type: 'json_schema',
  //         json_schema: {
  //           name: 'defi_intent_schema',
  //           schema: {
  //             type: 'object',
  //             properties: {
  //               intent: {
  //                 type: 'string',
  //                 enum: [
  //                   'SEND_TOKEN',
  //                   'TIP_TOKEN',
  //                   'DROP_TOKEN',
  //                   'CHECK_BALANCE',
  //                   'ACTIVATE',
  //                   'UNKNOWN',
  //                 ],
  //               },
  //               details: {
  //                 type: 'object',
  //                 properties: {
  //                   amount: { type: ['number', 'string', 'null'] },
  //                   amountType: {
  //                     type: ['string', 'null'],
  //                     enum: ['USD', 'TOKEN'],
  //                   },
  //                   token: { type: ['string', 'null'] },
  //                   receiver: { type: ['string', 'null'] },
  //                 },
  //                 required: [],
  //               },
  //               followup: {
  //                 type: ['string', 'null'],
  //                 description:
  //                   'Helpful agent message for the user. Always required for ACTIVATE or UNKNOWN.',
  //               },
  //             },
  //             required: ['intent', 'details', 'followup'],
  //           },
  //         },
  //       },
  //       messages: [
  //         {
  //           role: 'system',
  //           content: `
  //           You are a DeFi intent and entity extractor for the Reef network.

  //           Normalization rules:
  //           - "$50", "50$", "USD 50", "50 USD" → amount = 50, amountType = USD
  //           - "50 REEF", "50 $REEF" → amount = 50, amountType = TOKEN, token = REEF
  //           - Always treat "$" before or after the number as USD.

  //           Intent rules:
  //           - "send" → SEND_TOKEN (including "send … as a tip")
  //           - "tip" as the main verb → TIP_TOKEN
  //           - "drop" → DROP_TOKEN
  //           - "balance" → CHECK_BALANCE
  //           - "reef", "REEF", "reefly", "REEFLY", "reeFly", "activate", "new", "activate account", "new account" → ACTIVATE
  //           - Otherwise → UNKNOWN

  //           Entity rules:
  //           - receiver can be Twitter (@...), ENS (....eth), or wallet (0x...)

  //           Followup rules:
  //           - If intent = ACTIVATE, always set followup = "Let’s get your Reefly account activated 🚀"
  //           - If intent = UNKNOWN, provide a short helpful followup response
  //             to guide the user. Examples:
  //             - User: "give me something nice"
  //               → intent: UNKNOWN, followup: "Did you mean to send tokens to someone?"
  //             - User: "show me reef prices"
  //               → intent: UNKNOWN, followup: "I can help with token transfers and balances. Do you want to check your balance?"
  //             - User: "hello"
  //               → intent: UNKNOWN, followup: "Hi there 👋 What would you like to do? Send, tip, drop tokens, check your balance, or activate your account?"
  //         `,
  //         },
  //         { role: 'user', content: message },
  //       ],
  //       temperature: 0,
  //     });

  //     return JSON.parse(response.choices[0].message?.content ?? '{}');
  //   } catch (error) {
  //     console.error('Agent error:', error);
  //     return {
  //       intent: 'UNKNOWN',
  //       details: {},
  //       followup:
  //         'Sorry, I could not understand that. Do you want to send, tip, drop tokens, check your balance, or activate your account?',
  //     };
  //   }
  // }

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
                    'DROP_TOKEN',
                    'CHECK_BALANCE',
                    'ACTIVATE',
                    'EXPORT',
                    'UNKNOWN',
                  ],
                },
                details: {
                  type: 'object',
                  properties: {
                    amount: { type: ['number', 'string', 'null'] },
                    amountType: {
                      type: ['string', 'null'],
                      enum: ['USD', 'TOKEN'],
                    },
                    token: { type: ['string', 'null'] },
                    receiver: { type: ['string', 'null'] },
                  },
                  required: [],
                },
                followup: {
                  type: ['string', 'null'],
                  description:
                    'Helpful agent message for the user. Always required for ACTIVATE, EXPORT, or UNKNOWN.',
                },
              },
              required: ['intent', 'details', 'followup'],
            },
          },
        },
        messages: [
          {
            role: 'system',
            content: `
            You are a DeFi intent and entity extractor for the Reef network.

            Normalization rules:
            - "$50", "50$", "USD 50", "50 USD" → amount = 50, amountType = USD
            - "50 REEF", "50 $REEF" → amount = 50, amountType = TOKEN, token = REEF
            - Always treat "$" before or after the number as USD.

            Intent rules:
            - "send" → SEND_TOKEN (including "send … as a tip")
            - "tip" as the main verb → TIP_TOKEN
            - "drop" → DROP_TOKEN
            - "balance" → CHECK_BALANCE
            - "reef", "REEF", "reefly", "REEFLY", "reeFly", "activate", "new", "activate account", "new account" → ACTIVATE
            - "export", "export wallet", "backup", "backup wallet", "export keys", "export mnemonic" → EXPORT
            - Otherwise → UNKNOWN

            Entity rules:
            - receiver can be Twitter (@...), ENS (....eth), or wallet (0x...)

            Followup rules:
            - If intent = ACTIVATE, always set followup = "Let’s get your Reef account activated 🚀"
            - If intent = EXPORT, always provide a clear security-forward followup, for example:
              "I can help you export/backup your wallet. For your security, never share your private key or seed phrase with anyone. Would you like to create an encrypted backup now or get instructions for a secure export?"
            - If intent = UNKNOWN, provide a short helpful followup response
              to guide the user. Examples:
              - User: "give me something nice"
                → intent: UNKNOWN, followup: "Did you mean to send tokens to someone?"
              - User: "show me reef prices"
                → intent: UNKNOWN, followup: "I can help with token transfers and balances. Do you want to check your balance?"
              - User: "hello"
                → intent: UNKNOWN, followup: "Hi there 👋 What would you like to do? Send, tip, drop tokens, check your balance, export/backup your wallet, or activate your account?"
          `,
          },
          { role: 'user', content: message },
        ],
        temperature: 0,
      });

      return JSON.parse(response.choices[0].message?.content ?? '{}');
    } catch (error) {
      console.error('Agent error:', error);
      return {
        intent: 'UNKNOWN',
        details: {},
        followup:
          'Sorry, I could not understand that. Do you want to send, tip, drop tokens, check your balance, activate your account, or export/backup your wallet?',
      };
    }
  }
}
