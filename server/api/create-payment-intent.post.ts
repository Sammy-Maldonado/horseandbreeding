import Stripe from 'stripe';
import { defineEventHandler, readBody } from 'h3';

export default defineEventHandler(async (event) => { 
    //@ts-ignore
  const config = useRuntimeConfig();

  const key = config.NUXT_STRIPE_SECRET_KEY as string;
  const stripe = new Stripe( key );

  const { amount, currency } = await readBody(event);

  if (!amount || !currency) {
    return {
      status: 400,
      body: { message: 'Amount and currency are required.' }
    };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      payment_method: 'pm_card_visa',
    });
    
    return {
      status: 200,
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret })
    };
  } catch (error: any) {
    // Log error for debugging
    console.error('Stripe Error:', error);

    return {
      status: 500,
      body: { error: error.message || 'An error occurred while processing your request.' }
    };
  }
});
