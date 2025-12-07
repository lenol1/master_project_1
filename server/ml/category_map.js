const idToName = {
  0: 'Інше',                    // miscellaneous / mixed
  1: 'Продукти',                 // grocery / food (АТБ, Рукавичка)
  2: 'Кафе',                     // coffee shops / bakeries
  3: 'Онлайн покупки',            // Rozetka, Prom.ua, Aliexpress
  4: 'Електроніка',              // SAMSUNG, MOYO, Comfy
  5: 'Канцтовари/Послуги',       // printing, stationery, local stores
  6: 'Супермаркет',              // Аврора / similar stores
  7: 'Одяг',                     // clothing stores
  8: 'Платежі/Термінали',        // EasyPay / terminal / gateway payments
  9: 'Переказ',                  // transfers (P24, peer transfers)
  10: 'Транспорт',               // taxi, metro, parking
  11: 'Мобільний',               // Kyivstar, Lifecell etc
  12: 'Тварини',                 // pet stores
  13: 'Аптека/Косметика',        // EVA, Watsons, pharmacies
  14: 'Податки/Платежі державі', // tax and government payments
  15: 'Кондитерські',            // sweets, chocolate stores, bakeries
  16: 'Різне'                    // small shops, everything-for-2 etc.
};

const nameToId = {};
Object.keys(idToName).forEach(k => {
  nameToId[idToName[k]] = Number(k);
});

function getNameById(id) {
  if (id === undefined || id === null) return null;
  return idToName[String(id)] || null;
}

function getIdByName(name) {
  if (!name) return null;
  return nameToId[String(name)] || null;
}

// small aliases map to canonical names used in the app
const aliases = {
  'Їжа': 'Продукти',
  'Супермаркет': 'Продукти',
  'Food': 'Продукти',
  'Groceries': 'Продукти'
};

function normalizeName(name) {
  if (!name) return name;
  const s = String(name).trim();
  return aliases[s] || s;
}

module.exports = { idToName, nameToId, getNameById, getIdByName, aliases, normalizeName };
