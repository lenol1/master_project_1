// Small shared currency utility
export function getCurrencySymbol(code) {
  switch ((code || '').toUpperCase()) {
    case 'USD': return '$';
    case 'UAH': return '₴';
    case 'EUR': return '€';
    case 'GBP': return '£';
    default: return code || '';
  }
}

export function formatMoney(amount = 0, currency = 'USD', preferredCurrency = null, fxRates = null, useConversion = false) {
  const val = Number(amount) || 0;

  // If conversion requested and rates provided, try to convert
  if (useConversion && preferredCurrency && fxRates && fxRates.rates) {
    try {
      const base = fxRates.base || null;
      let converted = val;

      if (currency === preferredCurrency) {
        converted = val;
      } else if (base === preferredCurrency) {
        // fxRates.rates[currency] === units of 'currency' per 1 preferredCurrency
        if (fxRates.rates[currency]) converted = val / fxRates.rates[currency];
      } else if (base === currency) {
        // fxRates.rates[preferredCurrency] === units of preferredCurrency per 1 currency
        if (fxRates.rates[preferredCurrency]) converted = val * fxRates.rates[preferredCurrency];
      } else if (fxRates.rates[preferredCurrency] && fxRates.rates[currency]) {
        // derive cross-rate (rates are relative to fxRates.base). Compute 1 currency to preferredCurrency
        const r = fxRates.rates[preferredCurrency] / fxRates.rates[currency];
        converted = val * r;
      }

      return `${getCurrencySymbol(preferredCurrency)}${Number(converted).toFixed(2)}`;
    } catch (e) {
      // fallback to basic formatting
    }
  }

  // default formatting, show currency symbol + 2 decimals
  return `${getCurrencySymbol(currency)}${Number(val).toFixed(2)}`;
}

// Fetch FX rates from exchangerate.host, return an object { base, rates }
export async function fetchRates(base = 'USD') {
  try {
    const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    // data has { base, rates }
    return { base: data.base, rates: data.rates };
  } catch (e) {
    console.warn('fetchRates failed', e);
    return null;
  }
}

// Convert amount from 'fromCurrency' to 'toCurrency' using provided fxRates
export function convertAmount(amount = 0, fromCurrency = 'USD', toCurrency = 'USD', fxRates = null) {
  if (!fxRates || !fxRates.rates) return amount;
  if (fromCurrency === toCurrency) return Number(amount) || 0;
  const base = fxRates.base;
  const val = Number(amount) || 0;

  if (base === toCurrency && fxRates.rates[fromCurrency]) {
    return val / fxRates.rates[fromCurrency];
  }
  if (base === fromCurrency && fxRates.rates[toCurrency]) {
    return val * fxRates.rates[toCurrency];
  }
  if (fxRates.rates[toCurrency] && fxRates.rates[fromCurrency]) {
    const r = fxRates.rates[toCurrency] / fxRates.rates[fromCurrency];
    return val * r;
  }
  return val;
}
