import axios from 'axios';
import { getApiKey, getBaseUrl } from './config.js';

function createClient() {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();

  return axios.create({
    baseURL: baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
}

function handleError(error) {
  if (error.response) {
    const { status, data } = error.response;
    const message = data?.detail || data?.error || JSON.stringify(data);
    throw new Error(`TaxJar API Error (${status}): ${message}`);
  } else if (error.request) {
    throw new Error('Network error: No response received from TaxJar API. Check your internet connection.');
  } else {
    throw new Error(`Request error: ${error.message}`);
  }
}

// Tax Calculation
export async function calculateTax(params) {
  const client = createClient();
  try {
    const response = await client.post('/taxes', params);
    return response.data.tax;
  } catch (error) {
    handleError(error);
  }
}

// Rates
export async function getRates(zip, params = {}) {
  const client = createClient();
  try {
    const response = await client.get(`/rates/${encodeURIComponent(zip)}`, { params });
    return response.data.rate;
  } catch (error) {
    handleError(error);
  }
}

// Nexus Regions
export async function getNexusRegions() {
  const client = createClient();
  try {
    const response = await client.get('/nexus/regions');
    return response.data.regions;
  } catch (error) {
    handleError(error);
  }
}

// Categories
export async function getCategories() {
  const client = createClient();
  try {
    const response = await client.get('/categories');
    return response.data.categories;
  } catch (error) {
    handleError(error);
  }
}

// Orders
export async function listOrders(params = {}) {
  const client = createClient();
  try {
    const response = await client.get('/transactions/orders', { params });
    return response.data.orders;
  } catch (error) {
    handleError(error);
  }
}

export async function getOrder(transactionId) {
  const client = createClient();
  try {
    const response = await client.get(`/transactions/orders/${encodeURIComponent(transactionId)}`);
    return response.data.order;
  } catch (error) {
    handleError(error);
  }
}

export async function createOrder(params) {
  const client = createClient();
  try {
    const response = await client.post('/transactions/orders', params);
    return response.data.order;
  } catch (error) {
    handleError(error);
  }
}

export async function updateOrder(transactionId, params) {
  const client = createClient();
  try {
    const response = await client.put(`/transactions/orders/${encodeURIComponent(transactionId)}`, params);
    return response.data.order;
  } catch (error) {
    handleError(error);
  }
}

export async function deleteOrder(transactionId) {
  const client = createClient();
  try {
    const response = await client.delete(`/transactions/orders/${encodeURIComponent(transactionId)}`);
    return response.data.order;
  } catch (error) {
    handleError(error);
  }
}

// Refunds
export async function listRefunds(params = {}) {
  const client = createClient();
  try {
    const response = await client.get('/transactions/refunds', { params });
    return response.data.refunds;
  } catch (error) {
    handleError(error);
  }
}

export async function getRefund(transactionId) {
  const client = createClient();
  try {
    const response = await client.get(`/transactions/refunds/${encodeURIComponent(transactionId)}`);
    return response.data.refund;
  } catch (error) {
    handleError(error);
  }
}

export async function createRefund(params) {
  const client = createClient();
  try {
    const response = await client.post('/transactions/refunds', params);
    return response.data.refund;
  } catch (error) {
    handleError(error);
  }
}

// Validate Address
export async function validateAddress(params) {
  const client = createClient();
  try {
    const response = await client.post('/addresses/validate', params);
    return response.data.addresses;
  } catch (error) {
    handleError(error);
  }
}

// Validate VAT Number
export async function validateVat(vat) {
  const client = createClient();
  try {
    const response = await client.get('/validation', { params: { vat } });
    return response.data.validation;
  } catch (error) {
    handleError(error);
  }
}

// Summary Rates
export async function getSummaryRates() {
  const client = createClient();
  try {
    const response = await client.get('/summary_rates');
    return response.data.summary_rates;
  } catch (error) {
    handleError(error);
  }
}
