function generateMockPrice(destination, departure) {
  const input = destination + departure;

  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // convert to 32bit
  }

  const normalized = Math.abs(hash % 60000);
  return 20000 + normalized;
}

async function searchMockFlights(destination, departure, returnDate) {
  // 20% eséllyel hibázik
  if (Math.random() < 0.2) {
    throw new Error("Mock API hiba");
  }
  const price = generateMockPrice(destination, departure);

  return {
    destination,
    departure,
    return: returnDate,
    price,
  };
}

module.exports = {
  searchMockFlights,
  generateMockPrice,
};
