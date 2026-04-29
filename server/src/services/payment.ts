import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import type { PaymentEvent } from '../types/index.js';

export class PaymentService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16',
    });
  }

  async createCheckoutSession(
    userId: string,
    feature: 'gender_filter' | 'region_filter' | 'vip_upgrade',
    tier: 'monthly' | 'annual'
  ): Promise<string> {
    try {
      const prices: Record<string, Record<string, number>> = {
        gender_filter: { monthly: 299, annual: 2990 },
        region_filter: { monthly: 399, annual: 3990 },
        vip_upgrade: { monthly: 999, annual: 9990 },
      };

      const amount = prices[feature][tier];

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${feature.replace(/_/g, ' ')} - ${tier}`,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancelled`,
        metadata: {
          userId,
          feature,
          tier,
        },
      });

      return session.url || '';
    } catch (error) {
      console.error('❌ Error creating checkout session:', error);
      throw error;
    }
  }

  async handleWebhook(
    event: Stripe.Event
  ): Promise<PaymentEvent | null> {
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          return this.processPaymentSuccess(session);
        }

        case 'charge.failed': {
          const charge = event.data.object as Stripe.Charge;
          return this.processPaymentFailure(charge);
        }

        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge;
          return this.processRefund(charge);
        }

        default:
          return null;
      }
    } catch (error) {
      console.error('❌ Error handling webhook:', error);
      throw error;
    }
  }

  private async processPaymentSuccess(
    session: Stripe.Checkout.Session
  ): Promise<PaymentEvent> {
    const metadata = session.metadata as Record<string, string>;
    const paymentId = uuidv4();

    const paymentEvent: PaymentEvent = {
      id: paymentId,
      userId: metadata.userId,
      amount: session.amount_total || 0,
      currency: session.currency?.toUpperCase() || 'USD',
      feature: metadata.feature,
      status: 'completed',
      transactionId: session.payment_intent as string,
      timestamp: new Date(),
    };

    console.log(`✅ Payment processed for user ${metadata.userId}`);
    return paymentEvent;
  }

  private async processPaymentFailure(charge: Stripe.Charge): Promise<PaymentEvent> {
    const paymentId = uuidv4();
    const metadata = charge.metadata;

    const paymentEvent: PaymentEvent = {
      id: paymentId,
      userId: metadata.userId,
      amount: charge.amount,
      currency: charge.currency.toUpperCase(),
      feature: metadata.feature,
      status: 'failed',
      transactionId: charge.id,
      timestamp: new Date(),
    };

    console.error(`❌ Payment failed for user ${metadata.userId}`);
    return paymentEvent;
  }

  private async processRefund(charge: Stripe.Charge): Promise<PaymentEvent> {
    const paymentId = uuidv4();
    const metadata = charge.metadata;

    const paymentEvent: PaymentEvent = {
      id: paymentId,
      userId: metadata.userId,
      amount: charge.amount_refunded,
      currency: charge.currency.toUpperCase(),
      feature: metadata.feature,
      status: 'refunded',
      transactionId: charge.id,
      timestamp: new Date(),
    };

    console.log(`💰 Refund processed for user ${metadata.userId}`);
    return paymentEvent;
  }

  async verifyPaymentStatus(sessionId: string): Promise<boolean> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return session.payment_status === 'paid';
    } catch (error) {
      console.error('❌ Error verifying payment:', error);
      return false;
    }
  }
}
