const axios = require('axios');

async function getPaypalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const baseUrl = process.env.Paypal_Base_Url;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await axios.post(
      `${baseUrl}v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`
        }
      }
    );
    console.log('PayPal access token fetched successfully:', response.data.access_token);
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching PayPal access token:', error);
    throw error;
  }
}

exports.getPaypalAccessToken = getPaypalAccessToken;


exports.createPaypalOrder = async (orderData, accessToken) => {
  try {
const response=   await axios.post(
  process.env.Paypal_Base_Url + 'v2/checkout/orders',
  {
    intent: 'CAPTURE',
    purchase_units: [{
      items: [
        {
          name:orderData.name,
          description: orderData.description,
          quantity: '1',
          unit_amount: {
            currency_code: orderData.currency,
            value: orderData.value
          }
        }
      ],
      amount: {
        currency_code: orderData.currency,
        value: orderData.value,
        breakdown: {
          item_total: {
            currency_code: orderData.currency,
            value: orderData.value
          }
        }
      }
    }],
    application_context: {
      return_url: orderData.return_url,
      cancel_url: orderData.cancel_url,
      user_action: 'PAY_NOW',
    }
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    }
  }
);

    console.log(response.data.links.find(link => link.rel === 'approve').href)
    return response.data.links.find(link => link.rel === 'approve').href;
  } catch (error) {
    console.error('Error creating PayPal order:', error);
   
  }
};
